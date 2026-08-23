import { Router, Request, Response } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/authorize-roles.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { asyncHandler } from '../utils/async-handler';
import {
  createUserSchema,
  updateUserRoleSchema,
  userIdParamSchema
} from '../validators/user.validator';

const router = Router();

// Apply authentication and owner-only authorization across all user management routes
router.use(authenticate);
router.use(authorizeRoles('owner'));

async function handleGetAllUsersRoute(req: Request, res: Response): Promise<Response> {
  return userController.getAllUsers(req, res);
}

async function handleGetUserByIdRoute(req: Request, res: Response): Promise<Response> {
  return userController.getUserById(req, res);
}

async function handleCreateUserRoute(req: Request, res: Response): Promise<Response> {
  return userController.createUser(req, res);
}

async function handleUpdateUserRoleRoute(req: Request, res: Response): Promise<Response> {
  return userController.updateUserRole(req, res);
}

async function handleDeleteUserRoute(req: Request, res: Response): Promise<Response> {
  return userController.deleteUser(req, res);
}

/**
 * @route   GET /users
 * @desc    Get all users list
 * @access  Owner only
 */
router.get('/', asyncHandler(handleGetAllUsersRoute));

/**
 * @route   POST /users
 * @desc    Create a new user with assigned role
 * @access  Owner only
 */
router.post(
  '/',
  validateRequest(createUserSchema),
  asyncHandler(handleCreateUserRoute)
);

/**
 * @route   GET /users/:id
 * @desc    Get user details by ID
 * @access  Owner only
 */
router.get(
  '/:id',
  validateRequest(userIdParamSchema),
  asyncHandler(handleGetUserByIdRoute)
);

/**
 * @route   PATCH /users/:id/role
 * @desc    Update user role
 * @access  Owner only
 */
router.patch(
  '/:id/role',
  validateRequest(updateUserRoleSchema),
  asyncHandler(handleUpdateUserRoleRoute)
);

/**
 * @route   DELETE /users/:id
 * @desc    Delete user account (excluding self)
 * @access  Owner only
 */
router.delete(
  '/:id',
  validateRequest(userIdParamSchema),
  asyncHandler(handleDeleteUserRoute)
);

export const userRoutes = router;
