const supabase = require('../utils/supabaseClient');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token using Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or expired token'
      });
    }

    // Fetch user profile from public.users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      // Fallback if public.users record doesn't exist yet, attach basic auth user info
      req.user = {
        id: authData.user.id,
        email: authData.user.email,
        employee_id: authData.user.user_metadata?.employee_id || 'EMP001',
        full_name: authData.user.user_metadata?.full_name || authData.user.email,
        role: authData.user.user_metadata?.role || 'employee',
        department: authData.user.user_metadata?.department || 'Engineering'
      };
    } else {
      req.user = {
        ...userData,
        email: authData.user.email
      };
    }

    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Admin access required'
    });
  }
  next();
};

module.exports = { authMiddleware, adminOnly };
