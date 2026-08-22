import { Request, Response } from 'express';
import { productService } from '../services/product.service';
import { alertService } from '../services/alert.service';
import { sendSuccess } from '../common/response';
import { CreateProductInput, UpdateProductInput } from '../validators/product.validator';
import { logger } from '../utils/logger';

export class ProductController {
  public async createProduct(req: Request, res: Response): Promise<Response> {
    try {
      const input = req.body as CreateProductInput;
      const product = await productService.create(input);

      return sendSuccess(
        res,
        product,
        'Product created successfully',
        201
      );
    } catch (error) {
      logger.error('Error in ProductController.createProduct', { error: (error as Error).message });
      throw error;
    }
  }

  public async getAllProducts(_req: Request, res: Response): Promise<Response> {
    try {
      const { products, cached } = await productService.getAll();

      res.setHeader('X-Cache-Status', cached ? 'HIT' : 'MISS');

      return sendSuccess(
        res,
        products,
        cached ? 'Products retrieved from cache' : 'Products retrieved from database',
        200
      );
    } catch (error) {
      logger.error('Error in ProductController.getAllProducts', { error: (error as Error).message });
      throw error;
    }
  }

  public async getProductById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const product = await productService.getById(id as string);

      return sendSuccess(
        res,
        product,
        'Product details retrieved successfully',
        200
      );
    } catch (error) {
      logger.error('Error in ProductController.getProductById', { error: (error as Error).message });
      throw error;
    }
  }

  public async updateProduct(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const input = req.body as UpdateProductInput;
      const updatedProduct = await productService.update(id as string, input);

      return sendSuccess(
        res,
        updatedProduct,
        'Product updated successfully',
        200
      );
    } catch (error) {
      logger.error('Error in ProductController.updateProduct', { error: (error as Error).message });
      throw error;
    }
  }

  public async deleteProduct(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const deletedProduct = await productService.delete(id as string);

      return sendSuccess(
        res,
        deletedProduct,
        'Product deleted successfully',
        200
      );
    } catch (error) {
      logger.error('Error in ProductController.deleteProduct', { error: (error as Error).message });
      throw error;
    }
  }

  public async getProductAlerts(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const alerts = await alertService.getAlertsForProduct(id as string);

      return sendSuccess(
        res,
        alerts,
        'Product low-stock alerts retrieved successfully',
        200
      );
    } catch (error) {
      logger.error('Error in ProductController.getProductAlerts', { error: (error as Error).message });
      throw error;
    }
  }
}

export const productController = new ProductController();
