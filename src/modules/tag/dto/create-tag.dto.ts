import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({
    description: 'Tên của tag',
    example: 'JavaScript',
    type: String,
  })
  @IsString()
  @MinLength(1)
  name: string;
}