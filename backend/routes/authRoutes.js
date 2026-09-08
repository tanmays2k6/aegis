import { Router } from 'express';
import { postSignUp, postSignIn, getProfile } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.post('/signup', postSignUp);
router.post('/signin', postSignIn);
router.get('/profile', requireAuth, getProfile);

export default router;
