import { Request, Response, NextFunction } from 'express';
import { AlertsService } from './alerts.service';

export class AlertsController {
  public static async getAlertLogs(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const logs = await AlertsService.getAlertLogs();
      res.status(200).json({
        success: true,
        count: logs.length,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
}
