import { Router } from 'express';
import {
  getAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
  getUsers,
  patchUserRole,
  patchUserStatus,
} from '../controllers/adminController.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = Router();
router.use(requireAuth);

router.get('/access-requests', requirePermission(PERMISSIONS.ACCESS_REQUEST_VIEW), getAccessRequests);
router.post('/access-requests/:id/approve', requirePermission(PERMISSIONS.ACCESS_REQUEST_REVIEW), approveAccessRequest);
router.post('/access-requests/:id/reject', requirePermission(PERMISSIONS.ACCESS_REQUEST_REVIEW), rejectAccessRequest);

router.get('/users', requirePermission(PERMISSIONS.USER_VIEW), getUsers);
router.patch('/users/:id/role', requirePermission(PERMISSIONS.USER_ROLE_ASSIGN), patchUserRole);
router.patch('/users/:id/status', requirePermission(PERMISSIONS.USER_SUSPEND), patchUserStatus);

export default router;
