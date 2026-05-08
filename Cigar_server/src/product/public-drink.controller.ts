import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { ProductService } from './product.service';
import { QueryDrinkDto } from './dto/query-drink.dto';

@ApiTags('drinks')
@Controller('drinks')
export class PublicDrinkController {
  constructor(private readonly productService: ProductService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '饮品列表（公开）' })
  async list(@Query() query: QueryDrinkDto) {
    return this.productService.findDrinks(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '饮品详情（公开）' })
  async detail(@Param('id') id: string) {
    return this.productService.findDrinkById(BigInt(id));
  }
}
