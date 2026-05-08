import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: '数据概览（核心指标卡片）' })
  @RequirePermissions('dashboard:read')
  async getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('sales-trend')
  @ApiOperation({ summary: '销售趋势（按日）' })
  @ApiQuery({ name: 'days', required: false, schema: { default: 7 } })
  @RequirePermissions('dashboard:read')
  async getSalesTrend(@Query('days') days?: string) {
    return this.dashboardService.getSalesTrend(Number(days) || 7);
  }

  @Get('recent-orders')
  @ApiOperation({ summary: '最近订单' })
  @ApiQuery({ name: 'limit', required: false, schema: { default: 10 } })
  @RequirePermissions('dashboard:read')
  async getRecentOrders(@Query('limit') limit?: string) {
    return this.dashboardService.getRecentOrders(Number(limit) || 10);
  }

  @Get('top-products')
  @ApiOperation({ summary: '畅销商品排行' })
  @ApiQuery({ name: 'limit', required: false, schema: { default: 10 } })
  @RequirePermissions('dashboard:read')
  async getTopProducts(@Query('limit') limit?: string) {
    return this.dashboardService.getTopProducts(Number(limit) || 10);
  }
}
