import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SaveAnalysisDto {
  @ApiProperty({
    type: 'boolean',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  saveResult?: boolean;

  data: {
    report: any;
    metrics: any;
    landmarks: any;
    image_base64: string;
  };
}