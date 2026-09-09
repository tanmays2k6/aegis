import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = Router();
router.get('/', requireAuth, requirePermission(PERMISSIONS.AUDIT_VIEW), getAuditLogs);

export default router;
