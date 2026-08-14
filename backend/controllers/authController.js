const supabase = require('../utils/supabaseClient');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.session) {
      return res.status(401).json({
        success: false,
        message: authError?.message || 'Invalid email or password'
      });
    }

    // Fetch user profile from public.users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    const userProfile = userData || {
      id: authData.user.id,
      email: authData.user.email,
      employee_id: authData.user.user_metadata?.employee_id || 'EMP001',
      full_name: authData.user.user_metadata?.full_name || authData.user.email,
      role: authData.user.user_metadata?.role || 'employee',
      department: authData.user.user_metadata?.department || 'Engineering'
    };

    return res.status(200).json({
      success: true,
      user: {
        ...userProfile,
        email: authData.user.email
      },
      session: authData.session
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

const me = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Me Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching user profile'
    });
  }
};

module.exports = { login, me };
