import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import { postUpload, getUploadStatus, postRescan } from '../controllers/uploadController.js';

const router = Router();
router.use(requireAuth);

router.post('/', requirePermission(PERMISSIONS.EVIDENCE_UPLOAD), postUpload);
router.get('/:uploadId/security-status', requirePermission(PERMISSIONS.EVIDENCE_VIEW), getUploadStatus);
router.post('/:uploadId/rescan', postRescan);

export default router;
