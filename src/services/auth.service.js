import { createSupabaseAuthClient, supabaseAuthConfig } from '../config/supabase-auth.js';

const MIN_PASSWORD_LENGTH = 6;

const validateCredentials = (email, password) => {
  if (typeof email !== 'string' || !email.trim()) {
    return 'A valid email is required';
  }

  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    return 'A valid email is required';
  }

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }

  return null;
};

const sanitizeUser = (user) => (user
  ? {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      emailConfirmedAt: user.email_confirmed_at,
    }
  : null);

const sanitizeSession = (session) => (session
  ? {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
      expiresIn: session.expires_in,
      tokenType: session.token_type,
    }
  : null);

const errorResult = (error, fallbackMessage) => ({
  success: false,
  message: error?.message || fallbackMessage,
  error: {
    code: error?.code || null,
    status: error?.status || error?.statusCode || null,
  },
});

const getAuthClient = () => {
  if (!supabaseAuthConfig.configured) {
    return null;
  }

  return createSupabaseAuthClient();
};

const logSignupDiagnostic = (error) => {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const sanitizedMessage = String(error?.message || 'No error message returned')
    .replace(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
    .replace(/https?:\/\/\S+/gi, '[redacted-url]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted-token]')
    .slice(0, 240);

  console.error('Supabase signup diagnostic:', {
    name: error?.name || null,
    status: error?.status || error?.statusCode || null,
    code: error?.code || null,
    message: sanitizedMessage,
  });
};

export const signUp = async (email, password) => {
  const validationError = validateCredentials(email, password);
  if (validationError) {
    return { success: false, message: validationError, error: { code: 'VALIDATION_ERROR' } };
  }

  const client = getAuthClient();
  if (!client) {
    return { success: false, message: 'Authentication is not configured', error: { code: 'AUTH_NOT_CONFIGURED' } };
  }

  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) {
    logSignupDiagnostic(error);
    return errorResult(error, 'Unable to register account');
  }

  return {
    success: true,
    message: data.session ? 'Account created successfully' : 'Account created; email confirmation is required',
    data: {
      user: sanitizeUser(data.user),
      session: sanitizeSession(data.session),
      emailConfirmationRequired: !data.session,
    },
  };
};

export const signIn = async (email, password) => {
  const validationError = validateCredentials(email, password);
  if (validationError) {
    return { success: false, message: validationError, error: { code: 'VALIDATION_ERROR' } };
  }

  const client = getAuthClient();
  if (!client) {
    return { success: false, message: 'Authentication is not configured', error: { code: 'AUTH_NOT_CONFIGURED' } };
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return errorResult(error, 'Unable to sign in');
  }

  return {
    success: true,
    message: 'Signed in successfully',
    data: {
      user: sanitizeUser(data.user),
      session: sanitizeSession(data.session),
    },
  };
};

export const getUserFromToken = async (accessToken) => {
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    return { success: false, message: 'Access token is required', error: { code: 'TOKEN_REQUIRED' } };
  }

  const client = getAuthClient();
  if (!client) {
    return { success: false, message: 'Authentication is not configured', error: { code: 'AUTH_NOT_CONFIGURED' } };
  }

  const { data, error } = await client.auth.getUser(accessToken.trim());

  if (error) {
    return errorResult(error, 'Invalid access token');
  }

  return {
    success: true,
    message: 'Authenticated user retrieved',
    data: {
      user: sanitizeUser(data.user),
    },
  };
};
