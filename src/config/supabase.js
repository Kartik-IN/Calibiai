import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();
const nativeFetch = globalThis.fetch;

const diagnosticFetch = async (input, init) => {
  try {
    const response = await nativeFetch(input, init);
    const diagnostic = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    };

    if (!response.ok) {
      try {
        const body = await response.clone().json();
        diagnostic.error = {
          code: body.code ?? null,
          message: body.message ?? null,
          details: body.details ?? null,
          hint: body.hint ?? null,
        };
      } catch {
        diagnostic.error = { message: 'Non-JSON HTTP error response' };
      }
    }

    console.error('Supabase HTTP diagnostic:', diagnostic);
    return response;
  } catch (error) {
    console.error('Supabase network diagnostic:', {
      name: error.name,
      message: error.message,
    });
    throw error;
  }
};

let validUrl = false;

if (supabaseUrl) {
  try {
    const parsedUrl = new URL(supabaseUrl);
    validUrl = parsedUrl.protocol === 'https:';
  } catch {
    validUrl = false;
  }
}

export const supabaseConfig = Object.freeze({
  url: supabaseUrl,
  secretKey: supabaseSecretKey,
  configured: Boolean(validUrl && supabaseSecretKey),
});

let supabase = null;
let supabaseInitializationError = null;

if (supabaseConfig.configured) {
  try {
    supabase = createClient(supabaseConfig.url, supabaseConfig.secretKey, {
      global: { fetch: diagnosticFetch },
    });
  } catch (error) {
    supabaseInitializationError = {
      name: error.name,
      message: error.message,
    };
    console.error('Supabase client initialization failed:', supabaseInitializationError);
  }
}

export { supabase, supabaseInitializationError };
