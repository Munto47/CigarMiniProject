import { Controller, Post, Body, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import type { Request } from 'express';
import { RechargeService } from './recharge.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateRechargeDto } from './dto/recharge.dto';
import type { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('member')
@ApiBearerAuth()
@Controller('member')
export class RechargeController {
  constructor(private readonly rechargeService: RechargeService) {}

  @Post('recharge')
  @ApiOperation({ summary: '创建充值订单（微信支付）' })
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: '幂等键' })
  async recharge(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRechargeDto,
    @Req() req: Request,
    @Headers('Idempotency-Key') idempotencyKey?: string,
  ) {
    return this.rechargeService.createRecharge(
      BigInt(user.sub),
      BigInt(dto.tierId),
      (req as unknown as Record<string, string>).openid ?? '',
      idempotencyKey,
    );
  }
}
