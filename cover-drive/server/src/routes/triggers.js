const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

// GET /api/triggers/active — get all active disruptions
router.get('/active', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('disruption_triggers')
      .select('*')
      .eq('is_active', true)
      .order('triggered_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ triggers: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch triggers' });
  }
});

// GET /api/triggers/history
router.get('/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('disruption_triggers')
      .select('*')
      .order('triggered_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ triggers: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trigger history' });
  }
});

module.exports = router;
