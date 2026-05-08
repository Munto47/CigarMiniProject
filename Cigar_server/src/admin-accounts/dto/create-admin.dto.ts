import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ description: '用户名', example: 'admin2' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 32)
  username: string;

  @ApiProperty({ description: '姓名', example: '张三' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 32)
  name: string;

  @ApiProperty({ description: '密码（≥8位，含大小写和数字）', example: 'Admin123456' })
  @IsString()
  @IsNotEmpty()
  @Length(8, 64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: '密码必须包含大写字母、小写字母和数字',
  })
  password: string;

  @ApiProperty({ description: '角色代码', example: 'product' })
  @IsString()
  @IsNotEmpty()
  roleCode: string;
}
