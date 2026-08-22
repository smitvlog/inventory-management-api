import { Router } from 'express';
import { Role } from '@prisma/client';
import { AlertsController } from './alerts.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorizeRoles } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

// GET /alerts - Owner, Manager
router.get(
  '/',
  authorizeRoles(Role.OWNER, Role.MANAGER),
  AlertsController.getAlertLogs
);

export const alertsRouter = router;
