import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const { data, error } = await client.auth.signUp({
  email: 'testuser@example.com',
  password: 'TestPass@123'
});

if (error) {
  console.log('ERROR message:', error.message);
  console.log('ERROR code:', error.code);
  console.log('ERROR status:', error.status);
  console.log('ERROR name:', error.name);
} else {
  console.log('SUCCESS - user:', data.user?.id ?? 'null');
  console.log('Session present:', Boolean(data.session));
  console.log('Email confirmed:', Boolean(data.user?.email_confirmed_at));
}
