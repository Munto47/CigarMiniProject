import { Injectable, Logger } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';

/**
 * Cron service for daily reconciliation.
 * In production, this would be triggered by @nestjs/schedule (ScheduleModule).
 * For now, it provides a method that can be called by external cron or admin trigger.
 */
@Injectable()
export class ReconciliationCronService {
  private readonly logger = new Logger(ReconciliationCronService.name);

  constructor(private readonly reconciliationService: ReconciliationService) {}

  /**
   * Called by external scheduler (cron at 02:00 daily).
   * Usage: setInterval or BullMQ repeatable job
   */
  async executeDailyReconciliation() {
    this.logger.log('Daily reconciliation cron triggered');
    try {
      const result = await this.reconciliationService.runDailyReconciliation();
      this.logger.log(`Reconciliation complete: ${result.status}, diffs: ${result.diffCount}`);
      return result;
    } catch (err: any) {
      this.logger.error(`Reconciliation failed: ${err?.message ?? String(err)}`);
      throw err;
    }
  }
}
