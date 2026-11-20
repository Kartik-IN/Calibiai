import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();

const urlConfigured = Boolean(supabaseUrl);
const secretConfigured = Boolean(supabaseSecretKey);

const keyCategory = !supabaseSecretKey
  ? 'not configured'
  : supabaseSecretKey.startsWith('sb_secret_')
    ? 'sb_secret'
    : supabaseSecretKey.startsWith('eyJ')
      ? 'legacy JWT'
      : 'other';

const sanitize = (value) => {
  let safeValue = String(value ?? '');

  if (supabaseSecretKey) {
    safeValue = safeValue.replaceAll(supabaseSecretKey, '[redacted-secret]');
  }

  if (supabaseUrl) {
    safeValue = safeValue.replaceAll(supabaseUrl, '[redacted-url]');
  }

  return safeValue
    .replace(/Bearer\s+[^\s,}]+/gi, 'Bearer [redacted-token]')
    .replace(/(apikey|authorization|token|secret|key)\s*[:=]\s*[^,}\s]+/gi, '$1=[redacted]');
};

console.log(`URL configured: ${urlConfigured}`);
console.log(`Secret key configured: ${secretConfigured}`);
console.log(`Secret key category: ${keyCategory}`);

if (!urlConfigured || !secretConfigured) {
  console.log('Request succeeded: false');
  console.error('Diagnostic stopped: required Supabase environment variables are missing.');
  process.exitCode = 1;
} else {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/dsa_problems?select=id&limit=1`, {
      method: 'GET',
      headers: {
        apikey: supabaseSecretKey,
        Authorization: `Bearer ${supabaseSecretKey}`,
        Accept: 'application/json',
      },
    });

    const body = await response.text();
    const contentType = response.headers.get('content-type') || 'unknown';

    console.log(`HTTP status: ${response.status}`);
    console.log(`Response content type: ${contentType}`);

    try {
      const parsedBody = JSON.parse(body);
      console.log(`Response body: ${sanitize(JSON.stringify(parsedBody))}`);
    } catch {
      console.log(`Response body: ${sanitize(body).slice(0, 1000)}`);
    }

    console.log(`Request succeeded: ${response.ok}`);
    if (!response.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.log('HTTP status: unavailable');
    console.log('Response content type: unavailable');
    console.log(`Network error: ${sanitize(error.message || error.name)}`);
    console.log('Request succeeded: false');
    process.exitCode = 1;
  }
}
