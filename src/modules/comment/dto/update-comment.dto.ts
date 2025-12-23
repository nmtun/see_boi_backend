import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({
    description: 'Nội dung bình luận mới',
    example: 'Nội dung đã chỉnh sửa',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Đính kèm thêm ảnh hoặc chỉnh sửa ảnh cũ',
    example: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    type: String,
  })
  imageUrl?: string;
}
