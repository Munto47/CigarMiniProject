import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { InstoreService } from './instore.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { CreateInstoreDto } from './dto/create-instore.dto';
import { UpdateInstoreDto } from './dto/update-instore.dto';
import { QueryInstoreDto } from './dto/query-instore.dto';

@ApiTags('admin/library/reference')
@Controller('admin/library/reference')
export class ReferenceController {
  constructor(
    private readonly instoreService: InstoreService,
    private readonly opLogService: OperationLogService,
  ) {}

  @Get()
  @RequirePermissions('library:read')
  @ApiOperation({ summary: '行业参考库列表' })
  async list(@Query() query: QueryInstoreDto) {
    return this.instoreService.list(query);
  }

  @Get(':id')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: '行业参考库详情' })
  async detail(@Param('id') id: string) {
    return this.instoreService.findById(BigInt(id));
  }

  @Post()
  @RequirePermissions('library:write')
  @ApiOperation({ summary: '创建行业参考库条目' })
  async create(
    @Body() dto: CreateInstoreDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.instoreService.create(dto);
    void this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.roleCode ?? '',
      module: 'library',
      action: 'create_reference',
      targetType: 'reference_cigar',
      targetId: result.id.toString(),
      description: `创建行业参考库: ${dto.name}`,
      afterData: result,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Put(':id')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: '更新行业参考库条目' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInstoreDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.instoreService.update(BigInt(id), dto);
    void this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.roleCode ?? '',
      module: 'library',
      action: 'update_reference',
      targetType: 'reference_cigar',
      targetId: id,
      description: `更新行业参考库 id=${id}`,
      afterData: result,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Delete(':id')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: '删除行业参考库条目' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    await this.instoreService.delete(BigInt(id));
    void this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.roleCode ?? '',
      module: 'library',
      action: 'delete_reference',
      targetType: 'reference_cigar',
      targetId: id,
      description: `删除行业参考库 id=${id}`,
      level: 'warning',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { message: '删除成功' };
  }
}
