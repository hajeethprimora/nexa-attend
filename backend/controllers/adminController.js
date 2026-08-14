const supabase = require('../utils/supabaseClient');

// GET /api/admin/users - Live team status view for Admin
const getUsersStatus = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Fetch all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('full_name', { ascending: true });

    if (usersError) throw usersError;

    // Fetch today's attendance records
    const { data: attendanceList, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', today);

    if (attError) throw attError;

    const attendanceMap = new Map();
    (attendanceList || []).forEach(att => {
      attendanceMap.set(att.user_id, att);
    });

    const userStatusList = (users || []).map(u => {
      const att = attendanceMap.get(u.id);
      let status = 'Offline';
      let todayHours = 0;

      if (att) {
        todayHours = parseFloat(att.total_hours) || 0;
        if (att.clock_in && !att.clock_out) {
          if (att.break_start && !att.break_end) {
            status = 'On Break';
          } else {
            status = 'Clocked In';
          }
        } else if (att.clock_out) {
          status = 'Clocked Out';
        }
      }

      return {
        id: u.id,
        employee_id: u.employee_id,
        full_name: u.full_name,
        role: u.role,
        department: u.department || 'Engineering',
        status,
        today_hours: todayHours,
        clock_in: att?.clock_in || null,
        clock_out: att?.clock_out || null
      };
    });

    return res.status(200).json({
      success: true,
      data: userStatusList
    });
  } catch (error) {
    console.error('getUsersStatus Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/leaves/pending - Pending leave requests inbox for Admin
const getPendingLeaves = async (req, res) => {
  try {
    const { data: leaves, error: leavesError } = await supabase
      .from('leaves')
      .select('*, users(full_name, employee_id, department)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (leavesError) throw leavesError;

    const formattedLeaves = (leaves || []).map(l => ({
      id: l.id,
      user_id: l.user_id,
      employee_id: l.users?.employee_id || 'N/A',
      employee_name: l.users?.full_name || 'Unknown',
      department: l.users?.department || 'Engineering',
      start_date: l.start_date,
      end_date: l.end_date,
      type: l.type,
      reason: l.reason,
      status: l.status,
      created_at: l.created_at
    }));

    return res.status(200).json({
      success: true,
      data: formattedLeaves
    });
  } catch (error) {
    console.error('getPendingLeaves Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/leaves/:id - Approve or Reject leave request
const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_comment } = req.body;

    const { data, error } = await supabase
      .from('leaves')
      .update({
        status,
        admin_comment: admin_comment || ''
      })
      .eq('id', id)
      .select('*, users(full_name, employee_id)')
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: `Leave request ${status} successfully`,
      data
    });
  } catch (error) {
    console.error('updateLeaveStatus Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/reports - Generate monthly summary report & CSV export
const getMonthlyReport = async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7); // Default YYYY-MM
    const format = req.query.format; // 'csv' or json

    const startDate = `${month}-01`;
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthNum = parseInt(monthStr);
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${lastDay.toString().padStart(2, '0')}`;

    // 1. Fetch all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('full_name', { ascending: true });

    if (usersError) throw usersError;

    // 2. Fetch monthly attendance
    const { data: attendanceList, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (attError) throw attError;

    // 3. Fetch monthly leaves
    const { data: leavesList, error: leavesError } = await supabase
      .from('leaves')
      .select('*')
      .eq('status', 'approved')
      .gte('start_date', startDate)
      .lte('end_date', endDate);

    if (leavesError) throw leavesError;

    // Aggregate data per employee
    const reportData = (users || []).map(u => {
      const userAtt = (attendanceList || []).filter(a => a.user_id === u.id);
      const userLeaves = (leavesList || []).filter(l => l.user_id === u.id);

      const totalDaysWorked = userAtt.filter(a => a.clock_in).length;
      const totalHoursWorked = userAtt.reduce((sum, a) => sum + (parseFloat(a.total_hours) || 0), 0);
      const totalLeavesTaken = userLeaves.length;

      return {
        employee_id: u.employee_id,
        full_name: u.full_name,
        department: u.department || 'Engineering',
        role: u.role,
        total_days_worked: totalDaysWorked,
        total_hours_worked: Math.round((totalHoursWorked + Number.EPSILON) * 100) / 100,
        leaves_taken: totalLeavesTaken
      };
    });

    if (format === 'csv') {
      let csvContent = 'Employee ID,Full Name,Department,Role,Total Working Days,Total Working Hours,Leaves Taken\n';
      reportData.forEach(row => {
        csvContent += `"${row.employee_id}","${row.full_name}","${row.department}","${row.role}",${row.total_days_worked},${row.total_hours_worked},${row.leaves_taken}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=nexaattend_report_${month}.csv`);
      return res.status(200).send(csvContent);
    }

    return res.status(200).json({
      success: true,
      month,
      data: reportData
    });
  } catch (error) {
    console.error('getMonthlyReport Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUsersStatus,
  getPendingLeaves,
  updateLeaveStatus,
  getMonthlyReport
};
