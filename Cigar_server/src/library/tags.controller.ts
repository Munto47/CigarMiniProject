import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { TagsService } from './tags.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { QueryTagDto } from './dto/query-tag.dto';

@ApiTags('admin/library/tags')
@Controller('admin/library/tags')
export class TagsController {
  constructor(
    private readonly tagsService: TagsService,
    private readonly opLogService: OperationLogService,
  ) {}

  @Get()
  @RequirePermissions('tag:read')
  @ApiOperation({ summary: '风味标签列表' })
  async list(@Query() query: QueryTagDto) {
    return this.tagsService.list(query);
  }

  @Get(':id')
  @RequirePermissions('tag:read')
  @ApiOperation({ summary: '风味标签详情' })
  async detail(@Param('id') id: string) {
    return this.tagsService.findById(BigInt(id));
  }

  @Post()
  @RequirePermissions('tag:write')
  @ApiOperation({ summary: '创建风味标签' })
  async create(
    @Body() dto: CreateTagDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.tagsService.create(dto);
    void this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.roleCode ?? '',
      module: 'library',
      action: 'create_tag',
      targetType: 'flavor_tag',
      targetId: result.id.toString(),
      description: `创建风味标签: ${dto.name}`,
      afterData: result,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Put(':id')
  @RequirePermissions('tag:write')
  @ApiOperation({ summary: '更新风味标签' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.tagsService.update(BigInt(id), dto);
    void this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.roleCode ?? '',
      module: 'library',
      action: 'update_tag',
      targetType: 'flavor_tag',
      targetId: id,
      description: `更新风味标签 id=${id}`,
      afterData: result,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Delete(':id')
  @RequirePermissions('tag:write')
  @ApiOperation({ summary: '删除风味标签' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    await this.tagsService.delete(BigInt(id));
    void this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.roleCode ?? '',
      module: 'library',
      action: 'delete_tag',
      targetType: 'flavor_tag',
      targetId: id,
      description: `删除风味标签 id=${id}`,
      level: 'warning',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { message: '删除成功' };
  }
}
