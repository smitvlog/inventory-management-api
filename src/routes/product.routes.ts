import { Router, Request, Response } from 'express';
import { productController } from '../controllers/product.controller';
import { stockRoutes } from './stock.routes';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/authorize-roles.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { asyncHandler } from '../utils/async-handler';
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema
} from '../validators/product.validator';

const router = Router();

async function handleCreateProductRoute(req: Request, res: Response): Promise<Response> {
  return productController.createProduct(req, res);
}

async function handleGetAllProductsRoute(req: Request, res: Response): Promise<Response> {
  return productController.getAllProducts(req, res);
}

async function handleGetProductByIdRoute(req: Request, res: Response): Promise<Response> {
  return productController.getProductById(req, res);
}

async function handleUpdateProductRoute(req: Request, res: Response): Promise<Response> {
  return productController.updateProduct(req, res);
}

async function handleDeleteProductRoute(req: Request, res: Response): Promise<Response> {
  return productController.deleteProduct(req, res);
}

async function handleGetProductAlertsRoute(req: Request, res: Response): Promise<Response> {
  return productController.getProductAlerts(req, res);
}

/**
 * Mount Stock routes onto /products
 * Handled: POST /:id/stock, GET /:id/stock/history
 */
router.use('/', stockRoutes);

/**
 * @route   POST /products
 * @desc    Create a new product
 * @access  Owner, Manager (Staff forbidden)
 */
router.post(
  '/',
  authenticate,
  authorizeRoles('owner', 'manager'),
  validateRequest(createProductSchema),
  asyncHandler(handleCreateProductRoute)
);

/**
 * @route   GET /products
 * @desc    Get all products with current stock (Cached in Redis for 5 minutes)
 * @access  Owner, Manager, Staff
 */
router.get(
  '/',
  authenticate,
  authorizeRoles('owner', 'manager', 'staff'),
  asyncHandler(handleGetAllProductsRoute)
);

/**
 * @route   GET /products/:id
 * @desc    Get product details with recent stock history summary
 * @access  Owner, Manager, Staff
 */
router.get(
  '/:id',
  authenticate,
  authorizeRoles('owner', 'manager', 'staff'),
  validateRequest(productIdParamSchema),
  asyncHandler(handleGetProductByIdRoute)
);

/**
 * @route   PUT /products/:id
 * @desc    Update product details & invalidate cache
 * @access  Owner, Manager (Staff forbidden)
 */
router.put(
  '/:id',
  authenticate,
  authorizeRoles('owner', 'manager'),
  validateRequest(updateProductSchema),
  asyncHandler(handleUpdateProductRoute)
);

/**
 * @route   DELETE /products/:id
 * @desc    Delete a product & clear cache
 * @access  Owner only (Manager & Staff forbidden)
 */
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('owner'),
  validateRequest(productIdParamSchema),
  asyncHandler(handleDeleteProductRoute)
);

/**
 * @route   GET /products/:id/alerts
 * @desc    Get low-stock alert logs for a product
 * @access  Owner, Manager (Staff forbidden)
 */
router.get(
  '/:id/alerts',
  authenticate,
  authorizeRoles('owner', 'manager'),
  validateRequest(productIdParamSchema),
  asyncHandler(handleGetProductAlertsRoute)
);

export const productRoutes = router;
