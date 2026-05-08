import { Module } from '@nestjs/common';
import { AdminAccountsController } from './admin-accounts.controller';
import { AdminAccountsService } from './admin-accounts.service';
import { OperationLogModule } from '../operation-log/operation-log.module';

@Module({
  imports: [OperationLogModule],
  controllers: [AdminAccountsController],
  providers: [AdminAccountsService],
})
export class AdminAccountsModule {}
