import { IsEnum } from 'class-validator';
import { ReportStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateReportStatusDto {
  @ApiProperty({
    description: 'Trạng thái mới của báo cáo',
    enum: ReportStatus,
    example: ReportStatus.RESOLVED,
  })
  @IsEnum(ReportStatus)
  status: ReportStatus;
}
