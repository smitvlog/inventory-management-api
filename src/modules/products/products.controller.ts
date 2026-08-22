import { Request, Response, NextFunction } from 'express';
import { ProductsService } from './products.service';
import { CreateProductInput, UpdateProductInput, ProductIdParam } from './products.schema';

export class ProductsController {
  public static async createProduct(
    req: Request<unknown, unknown, CreateProductInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const product = await ProductsService.createProduct(req.body);
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAllProducts(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { products, cached } = await ProductsService.getAllProducts();
      res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
      res.status(200).json({
        success: true,
        cached,
        count: products.length,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getProductById(
    req: Request<ProductIdParam>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const product = await ProductsService.getProductById(req.params.id);
      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateProduct(
    req: Request<ProductIdParam, unknown, UpdateProductInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const product = await ProductsService.updateProduct(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteProduct(
    req: Request<ProductIdParam>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await ProductsService.deleteProduct(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
