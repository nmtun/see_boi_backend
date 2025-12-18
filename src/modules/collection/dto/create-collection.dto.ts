import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCollectionDto {
  @ApiProperty({
    description: 'Tên của collection',
    example: 'Bài viết yêu thích',
    type: String,
  })
  @IsString()
  @MinLength(1)
  name: string;
}
