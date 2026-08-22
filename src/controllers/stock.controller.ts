import { Request, Response } from 'express';
import { stockService } from '../services/stock.service';
import { sendSuccess } from '../common/response';
import { AdjustStockInput } from '../validators/stock.validator';
import { UnauthorizedError } from '../common/errors';
import { logger } from '../utils/logger';

export class StockController {
  public async adjustStock(req: Request, res: Response): Promise<Response> {
    try {
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
    } catch (error) {
      logger.error('Error in StockController.adjustStock', { error: (error as Error).message });
      throw error;
    }
  }

  public async getStockHistory(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const history = await stockService.getProductStockHistory(id as string);

      return sendSuccess(
        res,
        history,
        'Stock history retrieved successfully',
        200
      );
    } catch (error) {
      logger.error('Error in StockController.getStockHistory', { error: (error as Error).message });
      throw error;
    }
  }
}

export const stockController = new StockController();
