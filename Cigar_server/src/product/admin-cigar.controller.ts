import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { ProductService } from './product.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { CreateCigarDto } from './dto/create-cigar.dto';
import { UpdateCigarDto } from './dto/update-cigar.dto';
import { QueryCigarDto } from './dto/query-cigar.dto';

@ApiTags('admin/products/cigars')
@Controller('admin/products/cigars')
export class AdminCigarController {
  constructor(
    private readonly productService: ProductService,
    private readonly opLogService: OperationLogService,
  ) {}

  @Get()
  @RequirePermissions('product:read')
  @ApiOperation({ summary: '雪茄列表（管理端）' })
  async list(@Query() query: QueryCigarDto) {
    return this.productService.findCigars(query, true);
  }

  @Get(':id')
  @RequirePermissions('product:read')
  @ApiOperation({ summary: '雪茄详情（管理端）' })
  async detail(@Param('id') id: string) {
    return this.productService.findCigarById(BigInt(id));
  }

  @Post()
  @RequirePermissions('product:write')
  @ApiOperation({ summary: '创建雪茄' })
  async create(
    @Body() dto: CreateCigarDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.productService.createCigar(dto);
    void this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.roleCode ?? '',
      module: 'product',
      action: 'create',
      targetType: 'cigar',
      targetId: result.id,
      description: `创建雪茄: ${dto.name}`,
      afterData: result,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Put(':id')
  @RequirePermissions('product:write')
  @ApiOperation({ summary: '更新雪茄' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCigarDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const beforeData = await this.productService.findCigarById(BigInt(id));
    const result = await this.productService.updateCigar(BigInt(id), dto);
    void this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.roleCode ?? '',
      module: 'product',
      action: 'update',
      targetType: 'cigar',
      targetId: id,
      description: `更新雪茄: ${dto.name ?? beforeData?.name}`,
      beforeData,
      afterData: result,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Delete(':id')
  @RequirePermissions('product:delete')
  @ApiOperation({ summary: '删除雪茄（软删除）' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const beforeData = await this.productService.findCigarById(BigInt(id));
    await this.productService.deleteCigar(BigInt(id));
    void this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.roleCode ?? '',
      module: 'product',
      action: 'delete',
      targetType: 'cigar',
      targetId: id,
      description: `删除雪茄: ${beforeData?.name}`,
      beforeData,
      level: 'warning',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { message: '删除成功' };
  }
}
