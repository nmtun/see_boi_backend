import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: 'Nội dung bình luận' })
  content: string;

  @ApiPropertyOptional({ description: 'ID của bình luận cha (nếu là reply)' })
  parentId?: number;

  @ApiPropertyOptional({ description: 'URL ảnh (nếu có)' })
  imageUrl?: string;
}