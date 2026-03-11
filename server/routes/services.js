import express from 'express';
import { supabase, supabaseConfigured } from '../lib/supabaseServer.js';
import { successResponse, errorResponse, asyncHandler } from '../lib/apiResponse.js';

const router = express.Router();

// GET /api/admin/services
router.get(
  '/',
  asyncHandler(async (req, res) => {
    // If Supabase isn't configured, return an empty list so admin UI can still load in dev.
    if (!supabaseConfigured || !supabase) {
      return res.json(successResponse({ services: [] }));
    }
    const { data, error } = await supabase.from('services').select('*').limit(1000);
    if (error) {
      console.error('Supabase fetch services error:', error);
      return res.status(500).json(errorResponse('FETCH_SERVICES_FAILED', error.message));
    }

    return res.json(successResponse({ services: data || [] }));
  })
);

export default router;
