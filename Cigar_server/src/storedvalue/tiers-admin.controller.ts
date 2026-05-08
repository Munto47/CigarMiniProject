import { Controller, Get, Post, Put, Delete, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { TiersService } from './tiers.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OperationLogService } from '../operation-log/operation-log.service';
import { CreateRechargeTierDto, UpdateRechargeTierDto } from './dto/tier.dto';
import type { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('admin/storedvalue')
@ApiBearerAuth()
@Controller('admin/storedvalue/tiers')
export class TiersAdminController {
  constructor(
    private readonly tiersService: TiersService,
    private readonly opLogService: OperationLogService,
  ) {}

  @Get()
  @RequirePermissions('storedvalue:read')
  @ApiOperation({ summary: '充值档位列表' })
  async list() {
    return this.tiersService.findAll(true);
  }

  @Post()
  @RequirePermissions('storedvalue:adjust')
  @ApiOperation({ summary: '新增充值档位' })
  async create(
    @Body() dto: CreateRechargeTierDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.tiersService.create(dto);
    await this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.sub,
      module: 'storedvalue',
      action: 'create_tier',
      targetType: 'recharge_tier',
      targetId: result.id,
      description: `新增充值档位：${result.displayName} ${result.amountYuan}元`,
      level: 'info',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Put(':id')
  @RequirePermissions('storedvalue:adjust')
  @ApiOperation({ summary: '修改充值档位' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRechargeTierDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.tiersService.update(BigInt(id), dto);
    await this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.sub,
      module: 'storedvalue',
      action: 'update_tier',
      targetType: 'recharge_tier',
      targetId: id,
      description: `修改充值档位`,
      level: 'info',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Delete(':id')
  @RequirePermissions('storedvalue:adjust')
  @ApiOperation({ summary: '下架充值档位' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    await this.tiersService.remove(BigInt(id));
    await this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.sub,
      module: 'storedvalue',
      action: 'delete_tier',
      targetType: 'recharge_tier',
      targetId: id,
      description: '下架充值档位',
      level: 'info',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { message: '已下架' };
  }
}
