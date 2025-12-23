import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class ReplyCommentDto {
  @ApiProperty({
    description: 'Nội dung bình luận trả lời',
    example: 'Đây là phản hồi của tôi',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Ẩn danh hay không',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
