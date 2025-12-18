import { IsOptional, IsBooleanString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc thông báo chưa đọc (true) hoặc tất cả (không truyền)',
    example: 'true',
    type: String,
    enum: ['true', 'false'],
  })
  @IsOptional()
  @IsBooleanString()
  unread?: string; // "true" | "false"

  @ApiPropertyOptional({
    description: 'Số lượng thông báo trên mỗi trang',
    example: '10',
    type: String,
  })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({
    description: 'Số trang',
    example: '1',
    type: String,
  })
  @IsOptional()
  @IsString()
  page?: string;
}