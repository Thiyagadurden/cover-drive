const jwt = require('jsonwebtoken');
const supabase = require('../utils/supabase');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch partner from DB
    const { data: partner, error } = await supabase
      .from('delivery_partners')
      .select('id, full_name, email, phone, city, zone, platform, is_verified, kyc_status')
      .eq('id', decoded.id)
      .single();

    if (error || !partner) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.partner = partner;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
};

module.exports = { protect };