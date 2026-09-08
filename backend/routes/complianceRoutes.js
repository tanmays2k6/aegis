import { Router } from 'express';
import { getCompliance } from '../controllers/complianceController.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.get('/', requireAuth, requireRoles('admin', 'auditor'), getCompliance);

export default router;
