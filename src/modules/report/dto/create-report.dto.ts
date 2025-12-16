import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateReportDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  postId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  commentId?: number;

  @IsString()
  reason: string;
}
