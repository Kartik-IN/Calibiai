import {
  supabase,
  supabaseConfig,
  supabaseInitializationError,
} from '../config/supabase.js';

const REQUEST_TIMEOUT_MS = 5000;

export const checkSupabaseConnectivity = async () => {
  if (!supabaseConfig.configured) {
    return {
      reachable: false,
      connected: false,
      status: null,
      message: 'Supabase is not configured',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${supabaseConfig.url}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: supabaseConfig.secretKey,
        Authorization: `Bearer ${supabaseConfig.secretKey}`,
      },
      signal: controller.signal,
    });

    return {
      reachable: true,
      connected: response.ok,
      status: response.status,
      message: response.ok
        ? 'Supabase Data API is reachable'
        : response.status === 401 || response.status === 403
          ? 'Supabase Data API rejected the credentials'
          : response.status === 404
            ? 'Supabase host is reachable, but the REST resource path is invalid'
            : response.status >= 500
              ? 'Supabase Data API returned a server error'
              : 'Supabase Data API returned an HTTP error',
    };
  } catch (error) {
    return {
      reachable: false,
      connected: false,
      status: null,
      message: error.name === 'AbortError'
        ? 'Supabase Data API request timed out'
        : 'Supabase Data API is unavailable',
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const checkSupabaseDatabase = async () => {
  if (supabaseInitializationError) {
    return {
      connected: false,
      count: null,
      message: 'Supabase client initialization failed',
    };
  }

  if (!supabaseConfig.configured || !supabase) {
    return {
      connected: false,
      count: null,
      message: 'Supabase is not configured',
    };
  }

  const { data, count, error } = await supabase
    .from('dsa_problems')
    .select('id', { count: 'exact', head: true });

  const diagnostic = {
    dataIsNull: data === null,
    errorIsNull: error === null,
    error: error
      ? {
          name: error.name ?? null,
          message: error.message || 'Supabase returned no error message',
          code: error.code ?? null,
          details: error.details ?? null,
          hint: error.hint ?? null,
        }
      : null,
    count: count ?? null,
  };

  console.error('Supabase database query diagnostic:', diagnostic);

  if (error) {
    return {
      connected: false,
      count: null,
      message: diagnostic.error.code
        ? `Supabase database query failed (${diagnostic.error.code})`
        : 'Supabase database query failed',
    };
  }

  return {
    connected: true,
    count,
    message: 'Supabase database query succeeded',
  };
};
