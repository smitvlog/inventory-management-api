import { z } from 'zod';
import { StockReason } from '@prisma/client';

export const adjustStockSchema = z.object({
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .refine((val) => val !== 0, { message: 'Quantity cannot be zero' }),
  reason: z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z.nativeEnum(StockReason, {
      errorMap: () => ({
        message: "Reason must be one of: 'sale', 'return', 'restock', 'damage'",
      }),
    })
  ),
});

export const stockProductParamSchema = z.object({
  id: z.string().uuid('Invalid Product ID format (UUID expected)'),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type StockProductParam = z.infer<typeof stockProductParamSchema>;
