import { getUserFromToken } from '../services/auth.service.js';

const unauthorized = (res) => res.status(401).json({
  success: false,
  message: 'Authentication required',
  data: null,
});

export const createAuthenticateUser = (verifyToken = getUserFromToken) => async (req, res, next) => {
  const authorization = req.get('authorization');
  const match = typeof authorization === 'string'
    ? authorization.match(/^Bearer\s+(.+)$/i)
    : null;

  if (!match || !match[1].trim()) {
    return unauthorized(res);
  }

  try {
    const result = await verifyToken(match[1].trim());

    if (!result?.success || !result.data?.user) {
      return unauthorized(res);
    }

    req.user = result.data.user;
    req.accessToken = match[1].trim();
    return next();
  } catch {
    return unauthorized(res);
  }
};

export const authenticateUser = createAuthenticateUser();
