import { supabaseConfig } from '../config/supabase.js';
import { checkSupabaseDatabase } from '../services/supabase.service.js';

export const getSystemStatus = async (_req, res, next) => {
  try {
    const databaseStatus = await checkSupabaseDatabase();
    const connected = databaseStatus.connected;

    res.status(connected ? 200 : 503).json({
      success: connected,
      message: 'System status retrieved',
      data: {
        backend: 'running',
        supabase: {
          configured: supabaseConfig.configured,
          connected,
          message: databaseStatus.message,
          problemCount: databaseStatus.count,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
