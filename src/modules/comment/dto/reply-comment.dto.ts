import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReplyCommentDto {
  @ApiProperty({
    description: 'Nội dung bình luận trả lời',
    example: 'Đây là phản hồi của tôi',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'URL ảnh (nếu có)' })
  imageUrl?: string;
}
