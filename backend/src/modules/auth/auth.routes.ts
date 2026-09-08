import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth.js';

export const authRouter = Router();

// GET /api/v1/auth/me - Retrieve authenticated identity
authRouter.get('/me', requireAuth, (req: Request, res: Response, next: NextFunction): void => {
  try {
    res.status(200).json({
      status: 'success',
      data: {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        authenticated: true,
      },
    });
  } catch (err) {
    next(err);
  }
});
