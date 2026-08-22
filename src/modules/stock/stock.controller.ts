import { Request, Response, NextFunction } from 'express';
import { StockService } from './stock.service';
import { AdjustStockInput, StockProductParam } from './stock.schema';

export class StockController {
  public static async adjustStock(
    req: Request<StockProductParam, unknown, AdjustStockInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await StockService.adjustStock(req.params.id, userId, req.body);

      res.status(200).json({
        success: true,
        message: 'Stock adjusted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getStockHistory(
    req: Request<StockProductParam>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const history = await StockService.getStockHistory(req.params.id);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
}
