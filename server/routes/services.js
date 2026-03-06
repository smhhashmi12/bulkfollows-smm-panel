import express from 'express';
import { supabase, supabaseConfigured } from '../lib/supabaseServer.js';

const router = express.Router();

// GET /api/admin/services
router.get('/', async (req, res) => {
  try {
    // If Supabase isn't configured, return an empty list so admin UI can still load in dev.
    if (!supabaseConfigured || !supabase) {
      return res.json({ services: [] });
    }
    const { data, error } = await supabase.from('services').select('*').limit(1000);
    if (error) {
      console.error('Supabase fetch services error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ services: data || [] });
  } catch (err) {
    console.error('Server error fetching services', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
