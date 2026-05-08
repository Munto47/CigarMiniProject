import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { LevelConfigService } from './tiers.service';
import { LevelRecalcService } from './level-recalc.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateLevelConfigDto, UpdateLevelConfigDto } from './dto/level-config.dto';
import type { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('admin/storedvalue')
@ApiBearerAuth()
@Controller('admin/storedvalue/level-config')
export class LevelConfigAdminController {
  constructor(
    private readonly levelConfigService: LevelConfigService,
    private readonly levelRecalcService: LevelRecalcService,
    private readonly opLogService: OperationLogService,
  ) {}

  @Get()
  @RequirePermissions('storedvalue:level-config')
  @ApiOperation({ summary: '等级配置列表' })
  @ApiQuery({ name: 'type', required: false, enum: ['recharge', 'consumption'] })
  async list(@Query('type') type?: string) {
    return this.levelConfigService.findAll(type);
  }

  @Post()
  @RequirePermissions('storedvalue:level-config')
  @ApiOperation({ summary: '新增等级配置' })
  async create(
    @Body() dto: CreateLevelConfigDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.levelConfigService.create({
      levelType: dto.levelType,
      level: dto.level,
      name: dto.name,
      minPoints: dto.minPoints,
      maxPoints: dto.maxPoints,
      icon: dto.icon,
    });
    await this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.sub,
      module: 'storedvalue',
      action: 'create_level_config',
      targetType: 'level_config',
      targetId: result.id,
      description: `新增${dto.levelType === 'recharge' ? '充值' : '消费'}等级 V${dto.level}：${dto.name}`,
      level: 'warning',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Put(':id')
  @RequirePermissions('storedvalue:level-config')
  @ApiOperation({ summary: '修改等级配置' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLevelConfigDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.levelConfigService.update(BigInt(id), dto);
    await this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.sub,
      module: 'storedvalue',
      action: 'update_level_config',
      targetType: 'level_config',
      targetId: id,
      description: '修改等级配置',
      level: 'warning',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Delete(':id')
  @RequirePermissions('storedvalue:level-config')
  @ApiOperation({ summary: '禁用等级配置' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    await this.levelConfigService.remove(BigInt(id));
    await this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.sub,
      module: 'storedvalue',
      action: 'delete_level_config',
      targetType: 'level_config',
      targetId: id,
      description: '禁用等级配置',
      level: 'warning',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { message: '已禁用' };
  }

  @Post('recalculate')
  @RequirePermissions('storedvalue:level-config')
  @ApiOperation({ summary: '触发等级重算' })
  async recalculate(
    @Body('levelType') levelType: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.levelRecalcService.triggerRecalc(
      levelType || 'recharge',
      BigInt(user.sub),
      user.sub,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('recalculate/:jobId')
  @RequirePermissions('storedvalue:level-config')
  @ApiOperation({ summary: '查询重算进度' })
  async getRecalcProgress(@Param('jobId') jobId: string) {
    const progress = this.levelRecalcService.getProgress(Number(jobId));
    if (!progress) return { message: '任务不存在' };
    return progress;
  }
}
