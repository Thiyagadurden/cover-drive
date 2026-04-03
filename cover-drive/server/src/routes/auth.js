const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../utils/supabase');
const { protect } = require('../middleware/auth');

// ── Helper: Generate JWT ──
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ── POST /api/auth/register ──
router.post('/register', async (req, res) => {
  try {
    const {
      full_name, phone, email, password,
      platform, city, zone,
      avg_daily_earnings, active_hours_weekly, partner_rating
    } = req.body;

    // Validate required fields
    if (!full_name || !phone || !email || !password || !platform || !city || !zone) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check duplicate email/phone
    const { data: existing } = await supabase
      .from('delivery_partners')
      .select('id')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Email or phone already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert partner
    const { data: partner, error } = await supabase
      .from('delivery_partners')
      .insert({
        full_name: full_name.trim(),
        phone: phone.trim(),
        email: email.toLowerCase().trim(),
        password_hash,
        platform,
        city,
        zone,
        avg_daily_earnings: avg_daily_earnings || 800,
        active_hours_weekly: active_hours_weekly || 40,
        partner_rating: partner_rating || 4.0,
      })
      .select('id, full_name, email, phone, city, zone, platform, kyc_status')
      .single();

    if (error) throw error;

    const token = generateToken(partner.id);

    res.status(201).json({
      message: 'Registration successful! Welcome to Cover Drive.',
      token,
      partner
    });

  } catch (err) {
    console.error('[Register Error]', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// ── POST /api/auth/login ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data: partner, error } = await supabase
      .from('delivery_partners')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !partner) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, partner.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(partner.id);

    // Remove sensitive data before sending
    const { password_hash, ...safePartner } = partner;

    res.json({
      message: 'Login successful',
      token,
      partner: safePartner
    });

  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── GET /api/auth/me ──
router.get('/me', protect, async (req, res) => {
  try {
    const { data: partner } = await supabase
      .from('delivery_partners')
      .select(`
        id, full_name, email, phone, city, zone, platform,
        avg_daily_earnings, active_hours_weekly, partner_rating,
        is_verified, kyc_status, created_at
      `)
      .eq('id', req.partner.id)
      .single();

    res.json({ partner });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── PUT /api/auth/profile ──
router.put('/profile', protect, async (req, res) => {
  try {
    const allowed = ['full_name', 'avg_daily_earnings', 'active_hours_weekly', 'partner_rating', 'zone', 'city'];
    const updates = {};
    allowed.forEach(key => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('delivery_partners')
      .update(updates)
      .eq('id', req.partner.id)
      .select('id, full_name, email, city, zone, avg_daily_earnings, active_hours_weekly, partner_rating')
      .single();

    if (error) throw error;

    res.json({ message: 'Profile updated', partner: data });
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

module.exports = router;