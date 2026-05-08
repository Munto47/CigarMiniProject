import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartDto } from './dto/add-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: '获取购物车列表' })
  async getCart(@CurrentUser('sub') userId: string) {
    return this.cartService.getCart(BigInt(userId));
  }

  @Post('add')
  @ApiOperation({ summary: '添加到购物车' })
  async addToCart(@CurrentUser('sub') userId: string, @Body() dto: AddCartDto) {
    return this.cartService.addToCart(BigInt(userId), dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '修改购物车数量' })
  async updateQty(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCartDto,
  ) {
    return this.cartService.updateQty(BigInt(userId), Number(id), dto.qty);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除购物车项' })
  async removeItem(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.cartService.removeItem(BigInt(userId), Number(id));
  }

  @Get('count')
  @ApiOperation({ summary: '购物车角标数量' })
  async getCount(@CurrentUser('sub') userId: string) {
    const count = await this.cartService.getCount(BigInt(userId));
    return { count };
  }

  @Get('validate')
  @ApiOperation({ summary: '校验购物车（库存/价格/下架）' })
  async validate(@CurrentUser('sub') userId: string) {
    return this.cartService.validate(BigInt(userId));
  }
}
