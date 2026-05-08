import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Admin - Statistics')
@ApiBearerAuth()
@Controller('admin/statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('sales')
  @ApiOperation({ summary: '销售统计（按渠道、按日、充值、退款汇总）' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @RequirePermissions('statistics:read')
  async getSales(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statisticsService.getSalesStats(startDate, endDate);
  }

  @Get('categories')
  @ApiOperation({ summary: '分类销售统计' })
  @RequirePermissions('statistics:read')
  async getCategories() {
    return this.statisticsService.getCategoryStats();
  }

  @Get('users')
  @ApiOperation({ summary: '用户统计（增长趋势、等级分布、活跃度）' })
  @RequirePermissions('statistics:read')
  async getUsers() {
    return this.statisticsService.getUserStats();
  }

  @Get('storedvalue')
  @ApiOperation({ summary: '储值统计（充值/消费汇总、档位使用情况）' })
  @RequirePermissions('statistics:read')
  async getStoredValue() {
    return this.statisticsService.getStoredValueStats();
  }

  @Get('export')
  @ApiOperation({ summary: '导出销售数据（JSON格式，前端可转Excel）' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @RequirePermissions('statistics:read')
  async export(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statisticsService.exportSalesData(startDate, endDate);
  }
}
