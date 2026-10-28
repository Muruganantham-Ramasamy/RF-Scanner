import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { findUserById, loginWithPassword, toPublicUser } from '../services/authService.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await loginWithPassword(email, password);
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.auth.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Session is no longer valid.' });
    }
    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    return next(error);
  }
});

/** Example administrator-only endpoint used by authorization tests and admin tools. */
router.get('/admin/ping', requireAuth, requireRole('admin'), (req, res) => {
  res.json({
    ok: true,
    message: 'Admin access granted.',
    user: req.user,
  });
});

export default router;
