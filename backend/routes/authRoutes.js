import { Router } from 'express';
import {
  postSignUp,
  postSignIn,
  postRequestAccess,
  postRefreshToken,
  postSignOut,
  getProfile,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/signup', postSignUp);
router.post('/signin', postSignIn);
router.post('/request-access', postRequestAccess);
router.post('/refresh', postRefreshToken);
router.post('/signout', postSignOut);
router.get('/profile', requireAuth, getProfile);

export default router;
