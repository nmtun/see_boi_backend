import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({
    description: 'Nội dung bình luận mới',
    example: 'Nội dung đã chỉnh sửa',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  content: string;
}
