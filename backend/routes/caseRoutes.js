import { Router } from 'express';
import { getCases, getCase, postCase, patchCase } from '../controllers/caseController.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = Router();
router.use(requireAuth);

router.get('/', getCases);
router.get('/:id', getCase);
router.post('/', requirePermission(PERMISSIONS.CASE_CREATE), postCase);
router.patch('/:id', requirePermission(PERMISSIONS.CASE_UPDATE), patchCase);

export default router;
