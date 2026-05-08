import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminMemberService } from './admin-member.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Admin - Members')
@ApiBearerAuth()
@Controller('admin')
export class AdminMemberController {
  constructor(private readonly adminMemberService: AdminMemberService) {}

  @Get('members')
  @ApiOperation({ summary: '会员列表（分页，支持昵称搜索和等级筛选）' })
  @RequirePermissions('member:read')
  async list(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('keyword') keyword?: string,
    @Query('rechargeLevel') rechargeLevel?: number,
    @Query('consumptionLevel') consumptionLevel?: number,
  ) {
    return this.adminMemberService.listMembers({
      page: page ?? 1,
      pageSize: pageSize ?? 10,
      keyword,
      rechargeLevel: rechargeLevel ? Number(rechargeLevel) : undefined,
      consumptionLevel: consumptionLevel ? Number(consumptionLevel) : undefined,
    });
  }

  @Get('members/stats')
  @ApiOperation({ summary: '会员统计概览' })
  @RequirePermissions('member:read')
  async stats() {
    return this.adminMemberService.getMemberStats();
  }

  @Get('members/:id')
  @ApiOperation({ summary: '会员详情（含充值/消费/等级变更记录）' })
  @RequirePermissions('member:read')
  async detail(@Param('id') id: string) {
    return this.adminMemberService.getMemberDetail(BigInt(id));
  }
}
