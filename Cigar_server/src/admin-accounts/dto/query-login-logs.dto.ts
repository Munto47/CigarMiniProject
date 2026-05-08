import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryLoginLogsDto {
  @ApiPropertyOptional({ description: '用户名筛选' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ description: '结果筛选', example: 'success' })
  @IsString()
  @IsOptional()
  result?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 20;
}
