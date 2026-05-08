import {
  Controller, Get, Post, Param, Body, Query, Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { PaymentService } from './payment.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建订单' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: '幂等键（UUID）' })
  async createOrder(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '缺少 Idempotency-Key 请求头');
    }
    return this.orderService.createOrder(BigInt(userId), dto, idempotencyKey);
  }

  @Get()
  @ApiOperation({ summary: '用户订单列表' })
  async getOrders(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryOrderDto,
  ) {
    return this.orderService.getUserOrders(BigInt(userId), query);
  }

  @Get(':id')
  @ApiOperation({ summary: '订单详情' })
  async getOrderDetail(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.orderService.getOrderDetail(BigInt(userId), Number(id));
  }

  @Post(':id/pay')
  @ApiOperation({ summary: '执行支付' })
  async payOrder(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: PayOrderDto,
  ) {
    const payMethod = dto.payMethod ?? 'balance';

    if (payMethod === 'balance') {
      return this.paymentService.payByBalance(BigInt(userId), Number(id));
    }

    // Meituan pay: stub
    return {
      paid: false,
      redirectUrl: `https://meituan-mock.com/pay/${id}`,
    };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消订单' })
  async cancelOrder(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.orderService.cancelOrder(BigInt(userId), Number(id));
  }
}
