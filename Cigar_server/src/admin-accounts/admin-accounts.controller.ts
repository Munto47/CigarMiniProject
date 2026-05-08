import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminAccountsService } from './admin-accounts.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { QueryLoginLogsDto } from './dto/query-login-logs.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OperationLogService } from '../operation-log/operation-log.service';

@ApiTags('Admin - Accounts')
@ApiBearerAuth()
@Controller('admin')
export class AdminAccountsController {
  constructor(
    private readonly adminAccountsService: AdminAccountsService,
    private readonly opLog: OperationLogService,
  ) {}

  @Get('accounts')
  @ApiOperation({ summary: '管理员账号列表' })
  @RequirePermissions('account:read')
  async list(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.adminAccountsService.listAccounts(page ?? 1, pageSize ?? 20);
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: '管理员账号详情' })
  @RequirePermissions('account:read')
  async detail(@Param('id') id: string) {
    return this.adminAccountsService.getAccountById(Number(id));
  }

  @Post('accounts')
  @ApiOperation({ summary: '创建管理员账号' })
  @RequirePermissions('account:write')
  async create(
    @CurrentUser() user: { sub: string; uname: string },
    @Body() dto: CreateAdminDto,
    @Req() req: any,
  ) {
    const result = await this.adminAccountsService.createAccount(dto);
    await this.opLog.log({
      adminId: BigInt(user.sub),
      adminName: user.uname,
      module: 'account',
      action: 'create',
      targetType: 'admin',
      targetId: String(result.id),
      description: `创建管理员 ${dto.username}`,
      level: 'warning',
      ip: req.ip,
    });
    return result;
  }

  @Put('accounts/:id')
  @ApiOperation({ summary: '更新管理员账号' })
  @RequirePermissions('account:write')
  async update(
    @CurrentUser() user: { sub: string; uname: string },
    @Param('id') id: string,
    @Body() dto: UpdateAdminDto,
    @Req() req: any,
  ) {
    const before = await this.adminAccountsService.getAccountById(Number(id));
    const result = await this.adminAccountsService.updateAccount(Number(id), dto);
    await this.opLog.log({
      adminId: BigInt(user.sub),
      adminName: user.uname,
      module: 'account',
      action: 'update',
      targetType: 'admin',
      targetId: id,
      description: `修改管理员 ${before.username}`,
      beforeData: { name: before.name, roleCode: before.roleCode, status: before.status },
      afterData: { name: result.name, roleCode: result.roleCode, status: result.status },
      level: 'warning',
      ip: req.ip,
    });
    return result;
  }

  @Delete('accounts/:id')
  @ApiOperation({ summary: '删除管理员账号（软删除）' })
  @RequirePermissions('account:write')
  async remove(
    @CurrentUser() user: { sub: string; uname: string },
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const before = await this.adminAccountsService.getAccountById(Number(id));
    await this.adminAccountsService.deleteAccount(Number(id));
    await this.opLog.log({
      adminId: BigInt(user.sub),
      adminName: user.uname,
      module: 'account',
      action: 'delete',
      targetType: 'admin',
      targetId: id,
      description: `删除管理员 ${before.username}`,
      level: 'warning',
      ip: req.ip,
    });
    return { deleted: true };
  }

  @Get('login-logs')
  @ApiOperation({ summary: '管理员登录日志' })
  @RequirePermissions('account:read')
  async loginLogs(@Query() query: QueryLoginLogsDto) {
    return this.adminAccountsService.getLoginLogs(query);
  }
}
