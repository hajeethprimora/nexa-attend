const supabase = require('../utils/supabaseClient');
const logger = require('../utils/logger');
const { logAuditEvent } = require('../utils/auditLogger');

// Helper to calculate days between dates
const calculateDays = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// Get or initialize leave balance for a user
const getOrCreateLeaveBalance = async (userId, year = new Date().getFullYear()) => {
  const { data: balance, error } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching leave balance:', error);
    return null;
  }

  if (balance) return balance;

  // Initialize balance if not existing
  const { data: newBalance, error: createError } = await supabase
    .from('leave_balances')
    .insert([{
      user_id: userId,
      year,
      sick_quota: 10,
      casual_quota: 12,
      vacation_quota: 15,
      sick_used: 0,
      casual_used: 0,
      vacation_used: 0
    }])
    .select()
    .single();

  if (createError) {
    logger.error('Error initializing leave balance:', createError);
    return null;
  }

  return newBalance;
};

// POST /api/leaves - Submit a new leave request
const createLeave = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date, type, reason } = req.body;

    if (!start_date || !end_date || !type) {
      return res.status(400).json({
        success: false,
        message: 'Start date, end date, and leave type are required.'
      });
    }

    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date.'
      });
    }

    // 1. Check for overlapping leave requests
    const { data: existingLeaves, error: overlapError } = await supabase
      .from('leaves')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'rejected')
      .lte('start_date', end_date)
      .gte('end_date', start_date);

    if (overlapError) throw overlapError;

    if (existingLeaves && existingLeaves.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active or pending leave request for the selected date range.'
      });
    }

    // 2. Check remaining leave balance
    const requestedDays = calculateDays(start_date, end_date);
    const balance = await getOrCreateLeaveBalance(userId);

    if (balance) {
      const quotaKey = `${type}_quota`;
      const usedKey = `${type}_used`;

      const totalQuota = balance[quotaKey] || 0;
      const totalUsed = balance[usedKey] || 0;
      const remaining = Math.max(0, totalQuota - totalUsed);

      if (requestedDays > remaining) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ${type} leave balance. Requested ${requestedDays} days, but only ${remaining} days remaining.`
        });
      }
    }

    // 3. Create leave record
    const { data, error } = await supabase
      .from('leaves')
      .insert([{
        user_id: userId,
        start_date,
        end_date,
        type,
        reason: reason || '',
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      actor_id: userId,
      action: 'LEAVE_SUBMITTED',
      target_id: data.id,
      ip_address: req.ip,
      details: { type, start_date, end_date, days: requestedDays }
    });

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data
    });
  } catch (error) {
    logger.error('createLeave Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/leaves - Get leave history & quota summary for current user
const getUserLeaves = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user leaves
    const { data: leaves, error: leavesError } = await supabase
      .from('leaves')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (leavesError) throw leavesError;

    // Fetch user balances
    const balance = await getOrCreateLeaveBalance(userId);

    return res.status(200).json({
      success: true,
      data: leaves || [],
      balance: balance || {
        sick_quota: 10, casual_quota: 12, vacation_quota: 15,
        sick_used: 0, casual_used: 0, vacation_used: 0
      }
    });
  } catch (error) {
    logger.error('getUserLeaves Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createLeave, getUserLeaves };
