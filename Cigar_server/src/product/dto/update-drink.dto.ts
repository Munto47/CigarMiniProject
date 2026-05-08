import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateDrinkDto } from './create-drink.dto';

export class UpdateDrinkDto extends PartialType(CreateDrinkDto) {
  @ApiPropertyOptional({ description: '状态', enum: ['active', 'disabled', 'inactive'] })
  @IsOptional() @IsString()
  status?: string;
}
