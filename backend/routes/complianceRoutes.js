import { Router } from 'express';
import { getCompliance } from '../controllers/complianceController.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = Router();
router.get('/', requireAuth, requirePermission(PERMISSIONS.COMPLIANCE_VIEW), getCompliance);

export default router;
