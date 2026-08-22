import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Product name is required' })
      .trim()
      .min(1, 'Product name cannot be empty'),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(1, 'Description cannot be empty'),
    price: z
      .number({ required_error: 'Price is required' })
      .int('Price must be an integer in Rupees')
      .nonnegative('Price cannot be negative'),
    stock: z
      .number({ required_error: 'Stock is required' })
      .int('Stock must be an integer')
      .nonnegative('Stock cannot be negative'),
    lowStockThreshold: z
      .number({ required_error: 'Low stock threshold is required' })
      .int('Low stock threshold must be an integer')
      .nonnegative('Low stock threshold cannot be negative')
  })
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID format')
  }),
  body: z.object({
    name: z.string().trim().min(1, 'Product name cannot be empty').optional(),
    description: z.string().trim().min(1, 'Description cannot be empty').optional(),
    price: z.number().int('Price must be an integer').nonnegative('Price cannot be negative').optional(),
    stock: z.number().int('Stock must be an integer').nonnegative('Stock cannot be negative').optional(),
    lowStockThreshold: z
      .number()
      .int('Low stock threshold must be an integer')
      .nonnegative('Low stock threshold cannot be negative')
      .optional()
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
  })
});

export const productIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID format')
  })
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
