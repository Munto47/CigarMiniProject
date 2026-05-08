import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationCronService } from './reconciliation-cron.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('Admin - Reconciliation')
@ApiBearerAuth()
@Controller('admin/reconciliation')
export class ReconciliationController {
  constructor(
    private readonly reconciliationService: ReconciliationService,
    private readonly cronService: ReconciliationCronService,
  ) {}

  @Get('reports')
  @ApiOperation({ summary: '对账报告列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'channel', required: false })
  @RequirePermissions('statistics:read')
  async getReports(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('channel') channel?: string,
  ) {
    return this.reconciliationService.getReports(
      Number(page) || 1,
      Number(pageSize) || 20,
      channel,
    );
  }

  @Post('run')
  @ApiOperation({ summary: '手动触发每日对账' })
  @RequirePermissions('settings:write')
  async runReconciliation(
    @CurrentUser() admin: JwtPayload,
    @Body() body?: { date?: string },
  ) {
    return this.reconciliationService.runDailyReconciliation(
      body?.date,
      BigInt(admin.sub),
    );
  }

  @Post('reports/:id/resolve')
  @ApiOperation({ summary: '标记对账差异为已解决' })
  @RequirePermissions('settings:write')
  async resolveReport(
    @Param('id') id: string,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.reconciliationService.resolveReport(id, BigInt(admin.sub));
  }
}
