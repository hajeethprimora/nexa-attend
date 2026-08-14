const supabase = require('../utils/supabaseClient');

// Submit a new leave request
const createLeave = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date, type, reason } = req.body;

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

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data
    });
  } catch (error) {
    console.error('createLeave Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get leave history for current user
const getUserLeaves = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('leaves')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('getUserLeaves Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createLeave, getUserLeaves };
