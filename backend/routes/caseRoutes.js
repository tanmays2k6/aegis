import { Router } from 'express';
import { getCases, getCase, postCase, patchCase } from '../controllers/caseController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', getCases);
router.get('/:id', getCase);
router.post('/', postCase);
router.patch('/:id', patchCase);

export default router;
