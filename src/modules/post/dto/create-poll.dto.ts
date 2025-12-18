import { IsArray, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePollDto {
  @ApiProperty({
    description: 'Danh sách các lựa chọn trong poll (tối thiểu 2 lựa chọn)',
    example: ['Lựa chọn 1', 'Lựa chọn 2', 'Lựa chọn 3'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  options: string[];

  @ApiPropertyOptional({
    description: 'Thời gian hết hạn của poll (định dạng ISO 8601). Nếu không truyền, poll không có thời gian hết hạn.',
    example: '2024-12-31T23:59:59Z',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string; 
}