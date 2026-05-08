import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { ProductService } from './product.service';
import { QueryCigarDto } from './dto/query-cigar.dto';

@ApiTags('cigars')
@Controller('cigars')
export class PublicCigarController {
  constructor(private readonly productService: ProductService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '雪茄列表（公开）' })
  async list(@Query() query: QueryCigarDto) {
    return this.productService.findCigars(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '雪茄详情（公开）' })
  async detail(@Param('id') id: string) {
    return this.productService.findCigarById(BigInt(id));
  }
}
