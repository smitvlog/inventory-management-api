import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().min(1, 'Description is required').max(1000),
  price: z.number().int('Price must be an integer').min(0, 'Price cannot be negative'),
  stock: z.number().int('Stock must be an integer').min(0, 'Stock cannot be negative'),
  lowStockThreshold: z.number().int('Low stock threshold must be an integer').min(0, 'Low stock threshold cannot be negative'),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(1000).optional(),
  price: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
});

export const productIdParamSchema = z.object({
  id: z.string().uuid('Invalid Product ID format (UUID expected)'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductIdParam = z.infer<typeof productIdParamSchema>;
