import { Router } from 'express';
import { Role } from '@prisma/client';
import { ProductsController } from './products.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorizeRoles } from '../../middleware/rbac.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
} from './products.schema';

const router = Router();

// All product routes require authentication
router.use(authenticate);

// POST /products - Owner, Manager
router.post(
  '/',
  authorizeRoles(Role.OWNER, Role.MANAGER),
  validateRequest({ body: createProductSchema }),
  ProductsController.createProduct
);

// GET /products - All roles (Owner, Manager, Staff)
router.get(
  '/',
  authorizeRoles(Role.OWNER, Role.MANAGER, Role.STAFF),
  ProductsController.getAllProducts
);

// GET /products/:id - All roles (Owner, Manager, Staff)
router.get(
  '/:id',
  authorizeRoles(Role.OWNER, Role.MANAGER, Role.STAFF),
  validateRequest({ params: productIdParamSchema }),
  ProductsController.getProductById
);

// PUT /products/:id - Owner, Manager
router.put(
  '/:id',
  authorizeRoles(Role.OWNER, Role.MANAGER),
  validateRequest({ params: productIdParamSchema, body: updateProductSchema }),
  ProductsController.updateProduct
);

// DELETE /products/:id - Owner only
router.delete(
  '/:id',
  authorizeRoles(Role.OWNER),
  validateRequest({ params: productIdParamSchema }),
  ProductsController.deleteProduct
);

export const productsRouter = router;
