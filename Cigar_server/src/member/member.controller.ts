import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MemberService } from './member.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import type { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('member')
@ApiBearerAuth()
@Controller('member')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get('profile')
  @ApiOperation({ summary: '获取会员资产' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    const profile = await this.memberService.getProfile(BigInt(user.sub));
    if (!profile) {
      throw new BusinessException(ErrorCode.NOT_LOGIN, '会员信息不存在');
    }
    return profile;
  }

  @Get('transactions')
  @ApiOperation({ summary: '储值余额流水' })
  async getTransactions(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryTransactionsDto,
  ) {
    return this.memberService.getTransactions(BigInt(user.sub), query);
  }
}
