const supabase = require('../utils/supabaseClient');

// Get today's attendance status for logged-in user
const getToday = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const { data: record, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (error) throw error;

    let status = 'Offline';
    if (record) {
      if (record.clock_in && !record.clock_out) {
        if (record.break_start && !record.break_end) {
          status = 'On Break';
        } else {
          status = 'Clocked In';
        }
      } else if (record.clock_out) {
        status = 'Clocked Out';
      }
    }

    return res.status(200).json({
      success: true,
      data: record,
      status
    });
  } catch (error) {
    console.error('getToday Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Clock In
const clockIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Check if record exists for today
    const { data: existing, error: checkError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing && existing.clock_in) {
      return res.status(400).json({
        success: false,
        message: 'Already clocked in today'
      });
    }

    const clockInTime = new Date().toISOString();

    const { data, error } = await supabase
      .from('attendance')
      .insert([{
        user_id: userId,
        date: today,
        clock_in: clockInTime
      }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: 'Clocked in successfully',
      data
    });
  } catch (error) {
    console.error('clockIn Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Start Break
const breakStart = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const { data: record, error: findError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (findError || !record || !record.clock_in) {
      return res.status(400).json({
        success: false,
        message: 'You must clock in before starting a break'
      });
    }

    if (record.clock_out) {
      return res.status(400).json({
        success: false,
        message: 'Cannot start break after clocking out'
      });
    }

    if (record.break_start && !record.break_end) {
      return res.status(400).json({
        success: false,
        message: 'Already on break'
      });
    }

    const breakStartTime = new Date().toISOString();

    const { data, error } = await supabase
      .from('attendance')
      .update({ break_start: breakStartTime })
      .eq('id', record.id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Break started',
      data
    });
  } catch (error) {
    console.error('breakStart Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// End Break
const breakEnd = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const { data: record, error: findError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (findError || !record || !record.break_start) {
      return res.status(400).json({
        success: false,
        message: 'No active break found to end'
      });
    }

    if (record.break_end) {
      return res.status(400).json({
        success: false,
        message: 'Break has already been ended'
      });
    }

    const breakEndTime = new Date().toISOString();

    const { data, error } = await supabase
      .from('attendance')
      .update({ break_end: breakEndTime })
      .eq('id', record.id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Break ended',
      data
    });
  } catch (error) {
    console.error('breakEnd Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Clock Out (Calculates total worked hours strictly on backend)
const clockOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const { data: record, error: findError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (findError || !record || !record.clock_in) {
      return res.status(404).json({
        success: false,
        message: 'No clock-in record found for today'
      });
    }

    if (record.clock_out) {
      return res.status(400).json({
        success: false,
        message: 'Already clocked out today'
      });
    }

    const clockOutTime = new Date();
    const clockInTime = new Date(record.clock_in);

    // Calculate break duration in hours
    let breakHours = 0;
    const breakStartMs = record.break_start ? new Date(record.break_start).getTime() : null;
    let breakEndMs = record.break_end ? new Date(record.break_end).getTime() : null;

    // If user clocked out while break was active, auto-close break end at clock out time
    if (breakStartMs && !breakEndMs) {
      breakEndMs = clockOutTime.getTime();
    }

    if (breakStartMs && breakEndMs) {
      breakHours = (breakEndMs - breakStartMs) / (1000 * 60 * 60);
    }

    // Total gross worked time in hours
    const grossHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
    const netWorkedHours = Math.max(0, grossHours - breakHours);
    const finalHours = Math.round((netWorkedHours + Number.EPSILON) * 100) / 100;

    const { data, error } = await supabase
      .from('attendance')
      .update({
        clock_out: clockOutTime.toISOString(),
        break_end: record.break_start && !record.break_end ? clockOutTime.toISOString() : record.break_end,
        total_hours: finalHours
      })
      .eq('id', record.id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Clocked out successfully',
      data
    });
  } catch (error) {
    console.error('clockOut Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get monthly attendance history for user
const getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const month = req.query.month || new Date().toISOString().slice(0, 7); // Default YYYY-MM

    const startDate = `${month}-01`;
    // Calculate last day of month
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
    console.error('getHistory Error:', error);
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
