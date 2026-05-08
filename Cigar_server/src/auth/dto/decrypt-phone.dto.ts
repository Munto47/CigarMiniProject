import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DecryptPhoneDto {
  @ApiProperty({ description: 'getPhoneNumber 返回的 encryptedData' })
  @IsString()
  @IsNotEmpty()
  encryptedData: string;

  @ApiProperty({ description: 'getPhoneNumber 返回的 iv' })
  @IsString()
  @IsNotEmpty()
  iv: string;
}
