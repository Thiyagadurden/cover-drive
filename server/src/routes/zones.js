const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

// GET /api/zones — all zones
router.get('/', async (req, res) => {
  try {
    const { city } = req.query;
    let query = supabase.from('zones').select('*').eq('is_active', true).order('city');
    if (city) query = query.eq('city', city);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ zones: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

// GET /api/zones/cities — distinct cities
router.get('/cities', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('city')
      .eq('is_active', true);

    if (error) throw error;
    const cities = [...new Set(data.map(z => z.city))].sort();
    res.json({ cities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

// GET /api/zones/:zone_code
router.get('/:zone_code', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('zone_code', req.params.zone_code)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Zone not found' });
    res.json({ zone: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch zone' });
  }
});

module.exports = router;