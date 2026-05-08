import { Module } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationCronService } from './reconciliation-cron.service';

@Module({
  controllers: [ReconciliationController],
  providers: [ReconciliationService, ReconciliationCronService],
})
export class ReconciliationModule {}
