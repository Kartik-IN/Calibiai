import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

let validUrl = false;

if (supabaseUrl) {
  try {
    validUrl = new URL(supabaseUrl).protocol === 'https:';
  } catch {
    validUrl = false;
  }
}

export const supabaseUserConfig = Object.freeze({
  url: supabaseUrl,
  configured: Boolean(validUrl && supabasePublishableKey),
});

export const createSupabaseUserClient = (accessToken) => {
  if (!supabaseUserConfig.configured || typeof accessToken !== 'string' || !accessToken.trim()) {
    return null;
  }

  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
      },
    },
  });
};
