import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.get('/', requireAuth, requireRoles('admin', 'auditor'), getAuditLogs);

export default router;
