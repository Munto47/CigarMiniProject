import { Controller, Get, Put, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SettingsService, SystemSettingsGrouped } from './settings.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('Admin - Settings')
@ApiBearerAuth()
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: '获取所有系统设置（分组）' })
  @RequirePermissions('settings:read')
  async getAllSettings(): Promise<SystemSettingsGrouped> {
    return this.settingsService.getAllSettings();
  }

  @Put(':key')
  @ApiOperation({ summary: '更新单个系统设置' })
  @RequirePermissions('settings:write')
  async updateSetting(
    @Param('key') key: string,
    @Body() body: { value: any },
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.settingsService.updateSetting(
      key,
      body.value,
      BigInt(admin.sub),
      'admin',
    );
  }

  @Get('logs')
  @ApiOperation({ summary: '操作日志分页查询' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'module', required: false })
  @RequirePermissions('settings:read')
  async getOperationLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('module') module?: string,
  ) {
    return this.settingsService.getOperationLogs(
      Number(page) || 1,
      Number(pageSize) || 20,
      module,
    );
  }

  @Post('meituan/test')
  @ApiOperation({ summary: '测试美团连接' })
  @RequirePermissions('settings:write')
  async testMeituanConnection(@CurrentUser() admin: JwtPayload) {
    return this.settingsService.testMeituanConnection();
  }

  // Public endpoint for store info (used by mini-program club page)
  @Get('public/store-info')
  @ApiOperation({ summary: '获取店铺公开信息（电话/地址/营业时间）' })
  @Public()
  async getStoreInfo() {
    const result = await this.settingsService.getAllSettings();
    return {
      storeName: result.basic.store_name ?? 'GOAT CIGAR CLUB',
      storeAddress: result.basic.store_address ?? '',
      storePhone: result.basic.store_phone ?? '',
      storeHours: result.basic.store_hours ?? '',
      logoUrl: result.basic.logo_url ?? null,
    };
  }
}
