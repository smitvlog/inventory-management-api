import { Router } from 'express';
import { Role } from '@prisma/client';
import { StockController } from './stock.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorizeRoles } from '../../middleware/rbac.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { adjustStockSchema, stockProductParamSchema } from './stock.schema';

const router = Router({ mergeParams: true });

// All stock routes require authentication
router.use(authenticate);

// POST /products/:id/stock - All roles (Owner, Manager, Staff)
router.post(
  '/',
  authorizeRoles(Role.OWNER, Role.MANAGER, Role.STAFF),
  validateRequest({ params: stockProductParamSchema, body: adjustStockSchema }),
  StockController.adjustStock
);

// GET /products/:id/stock/history - Owner, Manager
router.get(
  '/history',
  authorizeRoles(Role.OWNER, Role.MANAGER),
  validateRequest({ params: stockProductParamSchema }),
  StockController.getStockHistory
);

export const stockRouter = router;
