import { Request, Response } from 'express';
import { stockService } from '../services/stock.service';
import { sendSuccess } from '../common/response';
import { asyncHandler } from '../utils/async-handler';
import { AdjustStockInput } from '../validators/stock.validator';
import { UnauthorizedError } from '../common/errors';

export class StockController {
  adjustStock = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('User authentication required for stock adjustment');
    }

    const { id } = req.params;
    const { quantity, reason } = req.body as AdjustStockInput;

    const result = await stockService.adjustStock(
      id as string,
      req.user.id,
      quantity,
      reason
    );

    return sendSuccess(
      res,
      result,
      'Stock adjusted successfully',
      200
    );
  });

  getStockHistory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const history = await stockService.getProductStockHistory(id as string);

    return sendSuccess(
      res,
      history,
      'Stock history retrieved successfully',
      200
    );
  });
}

export const stockController = new StockController();
