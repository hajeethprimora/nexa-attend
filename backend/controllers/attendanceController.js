const supabase = require('../utils/supabaseClient');
const logger = require('../utils/logger');
const { logAuditEvent } = require('../utils/auditLogger');

// Helper to calculate total break duration in hours from breaks array / legacy fields
const calculateBreakHours = (record, currentTimeISO = null) => {
  let totalBreakMs = 0;

  // 1. Calculate from JSONB multi-breaks array if present
  if (Array.isArray(record.breaks) && record.breaks.length > 0) {
    record.breaks.forEach(b => {
      if (b.start) {
        const startMs = new Date(b.start).getTime();
        const endMs = b.end ? new Date(b.end).getTime() : (currentTimeISO ? new Date(currentTimeISO).getTime() : Date.now());
        if (endMs > startMs) {
          totalBreakMs += (endMs - startMs);
        }
      }
    });
  } else if (record.break_start) {
    // 2. Legacy single break fallback
    const startMs = new Date(record.break_start).getTime();
    const endMs = record.break_end ? new Date(record.break_end).getTime() : (currentTimeISO ? new Date(currentTimeISO).getTime() : Date.now());
    if (endMs > startMs) {
      totalBreakMs += (endMs - startMs);
    }
  }

  return totalBreakMs / (1000 * 60 * 60);
};

// Check active status of a record
const getRecordStatus = (record) => {
  if (!record || !record.clock_in) return 'Offline';
  if (record.clock_out) return 'Clocked Out';

  // Check if actively on break
  const breaks = Array.isArray(record.breaks) ? record.breaks : [];
  const openBreak = breaks.find(b => b.start && !b.end);
  if (openBreak || (record.break_start && !record.break_end)) {
    return 'On Break';
  }

  return 'Clocked In';
};

// GET /api/attendance/today - Get current active attendance status for logged-in user
const getToday = async (req, res) => {
  try {
    const userId = req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];

    // Priority 1: Search for any open attendance session (clock_out IS NULL)
    let { data: record, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .maybeSingle();

    if (error) throw error;

    // Priority 2: If no open session, fetch today's completed session
    if (!record) {
      const { data: todayRecord, error: todayError } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .eq('date', todayStr)
        .order('clock_in', { ascending: false })
        .maybeSingle();

      if (todayError) throw todayError;
      record = todayRecord;
    }

    const status = getRecordStatus(record);

    return res.status(200).json({
      success: true,
      data: record,
      status
    });
  } catch (error) {
    logger.error('getToday Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/attendance/clock-in
const clockIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lat, lng, notes } = req.body || {};
    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
    const todayStr = new Date().toISOString().split('T')[0];

    // Check if user already has an active unclosed session
    const { data: activeSession, error: checkError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .is('clock_out', null)
      .maybeSingle();

    if (checkError) throw checkError;

    if (activeSession) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active clock-in session. Please clock out first.'
      });
    }

    const nowISO = new Date().toISOString();

    const { data, error } = await supabase
      .from('attendance')
      .insert([{
        user_id: userId,
        date: todayStr,
        clock_in: nowISO,
        breaks: [],
        ip_address: clientIp,
        location_lat: lat || null,
        location_lng: lng || null,
        notes: notes || ''
      }])
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      actor_id: userId,
      action: 'ATTENDANCE_CLOCK_IN',
      target_id: data.id,
      ip_address: clientIp,
      details: { clock_in: nowISO, lat, lng }
    });

    return res.status(201).json({
      success: true,
      message: 'Clocked in successfully',
      data
    });
  } catch (error) {
    logger.error('clockIn Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/attendance/break-start
const breakStart = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find current active unclosed session
    const { data: record, error: findError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .is('clock_out', null)
      .maybeSingle();

    if (findError || !record) {
      return res.status(400).json({
        success: false,
        message: 'No active clock-in session found to start a break'
      });
    }

    const breaks = Array.isArray(record.breaks) ? [...record.breaks] : [];
    const openBreak = breaks.find(b => b.start && !b.end);

    if (openBreak || (record.break_start && !record.break_end)) {
      return res.status(400).json({
        success: false,
        message: 'Already on an active break'
      });
    }

    const nowISO = new Date().toISOString();
    breaks.push({ start: nowISO, end: null });

    const { data, error } = await supabase
      .from('attendance')
      .update({
        breaks,
        break_start: record.break_start || nowISO // Keep legacy field populated for backward compat
      })
      .eq('id', record.id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Break started successfully',
      data
    });
  } catch (error) {
    logger.error('breakStart Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/attendance/break-end
const breakEnd = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: record, error: findError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .is('clock_out', null)
      .maybeSingle();

    if (findError || !record) {
      return res.status(400).json({
        success: false,
        message: 'No active clock-in session found to end break'
      });
    }

    const breaks = Array.isArray(record.breaks) ? [...record.breaks] : [];
    const openBreakIndex = breaks.findIndex(b => b.start && !b.end);

    if (openBreakIndex === -1 && (!record.break_start || record.break_end)) {
      return res.status(400).json({
        success: false,
        message: 'No active break found to end'
      });
    }

    const nowISO = new Date().toISOString();

    if (openBreakIndex !== -1) {
      breaks[openBreakIndex].end = nowISO;
    }

    const { data, error } = await supabase
      .from('attendance')
      .update({
        breaks,
        break_end: record.break_start && !record.break_end ? nowISO : record.break_end
      })
      .eq('id', record.id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Break ended successfully',
      data
    });
  } catch (error) {
    logger.error('breakEnd Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/attendance/clock-out
const clockOut = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: record, error: findError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .is('clock_out', null)
      .maybeSingle();

    if (findError || !record) {
      return res.status(404).json({
        success: false,
        message: 'No active clock-in session found to clock out'
      });
    }

    const nowISO = new Date().toISOString();
    const clockInMs = new Date(record.clock_in).getTime();
    const clockOutMs = new Date(nowISO).getTime();

    // Auto-close any active break upon clock out
    const breaks = Array.isArray(record.breaks) ? [...record.breaks] : [];
    const openBreakIndex = breaks.findIndex(b => b.start && !b.end);
    if (openBreakIndex !== -1) {
      breaks[openBreakIndex].end = nowISO;
    }

    const tempRecord = { ...record, breaks };
    const breakHours = calculateBreakHours(tempRecord, nowISO);

    // Calculate gross vs net hours
    const grossHours = (clockOutMs - clockInMs) / (1000 * 60 * 60);
    const netWorkedHours = Math.max(0, grossHours - breakHours);
    const finalTotalHours = Math.round((netWorkedHours + Number.EPSILON) * 100) / 100;

    const { data, error } = await supabase
      .from('attendance')
      .update({
        clock_out: nowISO,
        breaks,
        break_end: record.break_start && !record.break_end ? nowISO : record.break_end,
        total_hours: finalTotalHours
      })
      .eq('id', record.id)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      actor_id: userId,
      action: 'ATTENDANCE_CLOCK_OUT',
      target_id: record.id,
      ip_address: req.ip,
      details: { clock_out: nowISO, total_hours: finalTotalHours }
    });

    return res.status(200).json({
      success: true,
      message: 'Clocked out successfully',
      data
    });
  } catch (error) {
    logger.error('clockOut Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/attendance/history - Monthly attendance history
const getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const month = req.query.month || new Date().toISOString().slice(0, 7); // Default YYYY-MM

    const startDate = `${month}-01`;
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthNum = parseInt(monthStr);
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${lastDay.toString().padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;

    const records = data || [];
    const totalHoursMonth = records.reduce((acc, curr) => acc + (parseFloat(curr.total_hours) || 0), 0);
    const daysWorkedMonth = records.filter(r => r.clock_in).length;

    return res.status(200).json({
      success: true,
      month,
      summary: {
        total_hours: Math.round((totalHoursMonth + Number.EPSILON) * 100) / 100,
        days_worked: daysWorkedMonth
      },
      data: records
    });
  } catch (error) {
    logger.error('getHistory Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getToday,
  clockIn,
  breakStart,
  breakEnd,
  clockOut,
  getHistory
};
