import { IsString, IsOptional, Length, Matches, IsInt, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAdminDto {
  @ApiPropertyOptional({ description: '姓名' })
  @IsString()
  @IsOptional()
  @Length(1, 32)
  name?: string;

  @ApiPropertyOptional({ description: '角色代码' })
  @IsString()
  @IsOptional()
  roleCode?: string;

  @ApiPropertyOptional({ description: '状态（1=启用, 0=禁用）' })
  @IsInt()
  @IsOptional()
  @IsIn([0, 1])
  status?: number;

  @ApiPropertyOptional({ description: '新密码（≥8位，含大小写和数字）' })
  @IsString()
  @IsOptional()
  @Length(8, 64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: '密码必须包含大写字母、小写字母和数字',
  })
  password?: string;
}
