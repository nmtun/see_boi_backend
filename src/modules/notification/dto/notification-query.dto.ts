import { IsOptional, IsBooleanString, IsString } from 'class-validator';

export class NotificationQueryDto {
  @IsOptional()
  @IsBooleanString()
  unread?: string; // "true" | "false"

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  page?: string;
}