import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

let validUrl = false;

if (supabaseUrl) {
  try {
    const parsedUrl = new URL(supabaseUrl);
    validUrl = parsedUrl.protocol === 'https:';
  } catch {
    validUrl = false;
  }
}

export const supabasePublicConfig = Object.freeze({
  url: supabaseUrl,
  configured: Boolean(validUrl && supabasePublishableKey),
});

export const supabasePublic = supabasePublicConfig.configured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;
