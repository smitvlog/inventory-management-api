import { Request, Response } from 'express';
import { productService } from '../services/product.service';
import { alertService } from '../services/alert.service';
import { sendSuccess } from '../common/response';
import { asyncHandler } from '../utils/async-handler';
import { CreateProductInput, UpdateProductInput } from '../validators/product.validator';

export class ProductController {
  createProduct = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateProductInput;
    const product = await productService.create(input);

    return sendSuccess(
      res,
      product,
      'Product created successfully',
      201
    );
  });

  getAllProducts = asyncHandler(async (_req: Request, res: Response) => {
    const { products, cached } = await productService.getAll();

    res.setHeader('X-Cache-Status', cached ? 'HIT' : 'MISS');

    return sendSuccess(
      res,
      products,
      cached ? 'Products retrieved from cache' : 'Products retrieved from database',
      200
    );
  });

  getProductById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const product = await productService.getById(id as string);

    return sendSuccess(
      res,
      product,
      'Product details retrieved successfully',
      200
    );
  });

  updateProduct = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const input = req.body as UpdateProductInput;
    const updatedProduct = await productService.update(id as string, input);

    return sendSuccess(
      res,
      updatedProduct,
      'Product updated successfully',
      200
    );
  });

  deleteProduct = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deletedProduct = await productService.delete(id as string);

    return sendSuccess(
      res,
      deletedProduct,
      'Product deleted successfully',
      200
    );
  });

  getProductAlerts = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const alerts = await alertService.getAlertsForProduct(id as string);

    return sendSuccess(
      res,
      alerts,
      'Product low-stock alerts retrieved successfully',
      200
    );
  });
}

export const productController = new ProductController();
