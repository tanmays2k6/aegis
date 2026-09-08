import { Router } from 'express';
import { getEvidence, getEvidenceItem, postEvidence, patchEvidenceStatus } from '../controllers/evidenceController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', getEvidence);
router.get('/:id', getEvidenceItem);
router.post('/', postEvidence);
router.patch('/:id/status', patchEvidenceStatus);

export default router;
