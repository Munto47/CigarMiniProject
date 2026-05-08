import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { ProductService } from './product.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { CreateDrinkDto } from './dto/create-drink.dto';
import { UpdateDrinkDto } from './dto/update-drink.dto';
import { QueryDrinkDto } from './dto/query-drink.dto';

@ApiTags('admin/products/drinks')
@Controller('admin/products/drinks')
export class AdminDrinkController {
  constructor(
    private readonly productService: ProductService,
    private readonly opLogService: OperationLogService,
  ) {}

  @Get()
  @RequirePermissions('product:read')
  @ApiOperation({ summary: '饮品列表（管理端）' })
  async list(@Query() query: QueryDrinkDto) {
    return this.productService.findDrinks(query, true);
  }

  @Get(':id')
  @RequirePermissions('product:read')
  @ApiOperation({ summary: '饮品详情（管理端）' })
  async detail(@Param('id') id: string) {
    return this.productService.findDrinkById(BigInt(id));
  }

  @Post()
  @RequirePermissions('product:write')
  @ApiOperation({ summary: '创建饮品' })
  async create(
    @Body() dto: CreateDrinkDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.productService.createDrink(dto);
    void this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.roleCode ?? '',
      module: 'product',
      action: 'create',
      targetType: 'drink',
      targetId: result.id,
      description: `创建饮品: ${dto.name}`,
      afterData: result,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Put(':id')
  @RequirePermissions('product:write')
  @ApiOperation({ summary: '更新饮品' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDrinkDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.productService.updateDrink(BigInt(id), dto);
    void this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.roleCode ?? '',
      module: 'product',
      action: 'update',
      targetType: 'drink',
      targetId: id,
      description: `更新饮品: ${dto.name ?? id}`,
      afterData: result,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Delete(':id')
  @RequirePermissions('product:delete')
  @ApiOperation({ summary: '删除饮品（软删除）' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    await this.productService.deleteDrink(BigInt(id));
    void this.opLogService.log({
      adminId: BigInt(user.sub),
      adminName: user.roleCode ?? '',
      module: 'product',
      action: 'delete',
      targetType: 'drink',
      targetId: id,
      description: `删除饮品 id=${id}`,
      level: 'warning',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { message: '删除成功' };
  }
}
