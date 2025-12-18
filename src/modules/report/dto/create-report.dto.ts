import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiPropertyOptional({
    description: 'ID của bài viết bị báo cáo (chọn 1 trong 2: postId hoặc commentId)',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  postId?: number;

  @ApiPropertyOptional({
    description: 'ID của bình luận bị báo cáo (chọn 1 trong 2: postId hoặc commentId)',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  commentId?: number;

  @ApiProperty({
    description: 'Lý do báo cáo',
    example: 'Nội dung không phù hợp',
    type: String,
  })
  @IsString()
  reason: string;
}
