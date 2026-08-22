import { z } from 'zod';

export const adjustStockSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID format')
  }),
  body: z.object({
    quantity: z
      .number({ required_error: 'Quantity is required' })
      .int('Quantity must be an integer')
      .refine((val) => val !== 0, { message: 'Quantity change cannot be zero' }),
    reason: z.enum(['sale', 'return', 'restock', 'damage'], {
      required_error: 'Reason is required',
      invalid_type_error: 'Reason must be one of: sale, return, restock, damage'
    })
  })
});

export const stockHistoryParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID format')
  })
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>['body'];
