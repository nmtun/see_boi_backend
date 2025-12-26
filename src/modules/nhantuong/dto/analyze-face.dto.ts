import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsString } from 'class-validator';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export class AnalyzeFaceDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Ảnh khuôn mặt',
  })
  image: any;

  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Họ và tên',
  })
  @IsString()
  fullName: string;

  @ApiProperty({
    example: '2002-08-15',
    description: 'Ngày tháng năm sinh (YYYY-MM-DD)',
  })
  @IsDateString()
  birthDate: string;

  @ApiProperty({
    enum: Gender,
    example: Gender.MALE,
    description: 'Giới tính (MALE | FEMALE)',
  })
  @IsEnum(Gender)
  gender: Gender;
}
