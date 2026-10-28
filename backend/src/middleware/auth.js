import { findUserById, toPublicUser, verifyAuthToken } from '../services/authService.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const payload = verifyAuthToken(token);
    req.auth = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      token,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.auth?.userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
      const user = await findUserById(req.auth.userId);
      if (!user || !user.is_active) {
        return res.status(403).json({ error: 'Account is inactive or not found.' });
      }
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions.' });
      }
      req.user = toPublicUser(user);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
