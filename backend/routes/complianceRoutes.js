import { Router } from 'express';
import { getCompliance, postVerifyIntegrity } from '../controllers/complianceController.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = Router();
router.get('/', requireAuth, requirePermission(PERMISSIONS.COMPLIANCE_VIEW), getCompliance);
router.post('/verify', requireAuth, requirePermission(PERMISSIONS.COMPLIANCE_VIEW), postVerifyIntegrity);

export default router;
