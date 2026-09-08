import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import { UpdateProfileSchema } from '../../types/index.js';
import { supabaseAdmin } from '../../config/supabase.js';

export const profileRouter = Router();

// GET /api/v1/profile - Get current user profile
profileRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          status: 'error',
          statusCode: 404,
          message: 'Profile not found. Please ensure initial user profile record exists.',
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      status: 'success',
      data: profile,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/profile - Update current user profile
profileRouter.patch(
  '/',
  requireAuth,
  validateRequest(UpdateProfileSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const updateData = req.body;

      const { data: updatedProfile, error } = await supabaseAdmin
        .from('profiles')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: updatedProfile,
      });
    } catch (err) {
      next(err);
    }
  }
);
