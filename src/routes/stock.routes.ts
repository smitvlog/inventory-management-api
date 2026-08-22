import { Router, Request, Response } from 'express';
import { stockController } from '../controllers/stock.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/authorize-roles.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { adjustStockSchema, stockHistoryParamSchema } from '../validators/stock.validator';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

async function handleAdjustStockRoute(req: Request, res: Response): Promise<Response> {
  return stockController.adjustStock(req, res);
}

async function handleGetStockHistoryRoute(req: Request, res: Response): Promise<Response> {
  return stockController.getStockHistory(req, res);
}

/**
 * @route   POST /products/:id/stock
 * @desc    Adjust product stock atomically (restock, sale, return, damage)
 * @access  Owner, Manager, Staff
 */
router.post(
  '/:id/stock',
  authenticate,
  authorizeRoles('owner', 'manager', 'staff'),
  validateRequest(adjustStockSchema),
  asyncHandler(handleAdjustStockRoute)
);

/**
 * @route   GET /products/:id/stock/history
 * @desc    Get complete audit log of stock movements for a product
 * @access  Owner, Manager (Staff receives 403 Forbidden)
 */
router.get(
  '/:id/stock/history',
  authenticate,
  authorizeRoles('owner', 'manager'),
  validateRequest(stockHistoryParamSchema),
  asyncHandler(handleGetStockHistoryRoute)
);

export const stockRoutes = router;
