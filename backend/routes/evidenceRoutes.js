import { Router } from 'express';
import {
  getEvidence,
  getEvidenceItem,
  postEvidence,
  patchEvidenceStatus,
} from '../controllers/evidenceController.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(PERMISSIONS.EVIDENCE_VIEW), getEvidence);
router.get('/:id', requirePermission(PERMISSIONS.EVIDENCE_VIEW), getEvidenceItem);
router.post('/', requirePermission(PERMISSIONS.EVIDENCE_CREATE), postEvidence);
router.patch('/:id/status', requirePermission(PERMISSIONS.EVIDENCE_STATUS_CHANGE), patchEvidenceStatus);

export default router;
