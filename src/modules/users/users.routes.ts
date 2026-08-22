import { Router } from 'express';
import { Role } from '@prisma/client';
import { UsersController } from './users.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorizeRoles } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

// GET /users - Owner only
router.get(
  '/',
  authorizeRoles(Role.OWNER),
  UsersController.getAllUsers
);

// GET /users/:id - Owner only
router.get(
  '/:id',
  authorizeRoles(Role.OWNER),
  UsersController.getUserById
);

export const usersRouter = router;
