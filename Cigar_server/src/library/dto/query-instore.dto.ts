import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryInstoreDto extends PaginationDto {
  @ApiPropertyOptional({ description: '分类代码筛选' })
  @IsOptional() @IsString()
  categoryCode?: string;

  @ApiPropertyOptional({ description: '品牌筛选' })
  @IsOptional() @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: '关键词搜索' })
  @IsOptional() @IsString()
  keyword?: string;
}
