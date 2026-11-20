import * as authService from '../services/auth.service.js';

const failure = (res, status, message) => res.status(status).json({
  success: false,
  message,
  data: null,
});

const hasCredentials = (body) => (
  body
  && typeof body.email === 'string'
  && body.email.trim()
  && typeof body.password === 'string'
  && body.password.length > 0
);

const authErrorResponse = (res, result, fallbackMessage) => {
  const code = result?.error?.code;
  const lowerMessage = result?.message?.toLowerCase() || '';

  if (code === 'VALIDATION_ERROR') {
    return failure(res, 400, result.message);
  }

  if (code === 'AUTH_NOT_CONFIGURED') {
    return failure(res, 500, 'Authentication is not configured');
  }

  if (
    code === 'over_request_rate_limit'
    || code === 'over_email_send_rate_limit'
    || result?.error?.status === 429
  ) {
    return failure(res, 429, 'Too many signup attempts. Please try again later.');
  }

  if (lowerMessage.includes('already registered') || lowerMessage.includes('already exists')) {
    return failure(res, 409, 'An account with this email already exists');
  }

  if (lowerMessage.includes('invalid login credentials') || lowerMessage.includes('invalid')) {
    return failure(res, 401, 'Invalid email or password');
  }

  return failure(res, 400, fallbackMessage);
};

export const createAuthController = (service = authService) => ({
  signup: async (req, res, next) => {
    if (!hasCredentials(req.body)) {
      return failure(res, 400, 'Email and password are required');
    }

    try {
      const result = await service.signUp(req.body.email, req.body.password);

      if (!result.success) {
        return authErrorResponse(res, result, 'Unable to create account');
      }

      const confirmationRequired = result.data?.emailConfirmationRequired;
      return res.status(confirmationRequired ? 202 : 201).json({
        success: true,
        message: confirmationRequired
          ? 'Account created; email confirmation is required'
          : 'Account created successfully',
        data: result.data,
      });
    } catch (error) {
      return next(error);
    }
  },

  login: async (req, res, next) => {
    if (!hasCredentials(req.body)) {
      return failure(res, 400, 'Email and password are required');
    }

    try {
      const result = await service.signIn(req.body.email, req.body.password);

      if (!result.success) {
        if (result.error?.code === 'VALIDATION_ERROR') {
          return failure(res, 400, result.message);
        }

        return failure(res, 401, 'Invalid email or password');
      }

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result.data,
      });
    } catch (error) {
      return next(error);
    }
  },

  getCurrentUser: (req, res) => res.status(200).json({
    success: true,
    message: 'Current user retrieved',
    data: {
      user: req.user,
    },
  }),
});

const defaultController = createAuthController();

export const signup = defaultController.signup;
export const login = defaultController.login;
export const getCurrentUser = defaultController.getCurrentUser;
