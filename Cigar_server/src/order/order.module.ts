import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { OrderService } from './order.service';
import { PaymentService } from './payment.service';
import { RefundService } from './refund.service';
import { OrderCronService } from './order-cron.service';
import { MeituanService } from './meituan.service';
import { OrderController } from './order.controller';
import { AdminOrderController } from './admin-order.controller';
import { MeituanCallbackController } from './meituan-callback.controller';
import { CartModule } from '../cart/cart.module';
import { OperationLogModule } from '../operation-log/operation-log.module';

@Module({
  imports: [CartModule, OperationLogModule],
  controllers: [OrderController, AdminOrderController, MeituanCallbackController],
  providers: [OrderService, PaymentService, RefundService, OrderCronService, MeituanService],
  exports: [OrderService],
})
export class OrderModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly cron: OrderCronService) {}

  onModuleInit() {
    this.cron.start();
  }

  onModuleDestroy() {
    this.cron.stop();
  }
}
