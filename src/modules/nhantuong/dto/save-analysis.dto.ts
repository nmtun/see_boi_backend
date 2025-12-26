import {
  IsBoolean,
  IsOptional,
  IsObject,
  IsString,
  ValidateNested,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

class AnalysisDataDto {
  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Họ và tên người được phân tích',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: '2002-08-15',
    description: 'Ngày tháng năm sinh (YYYY-MM-DD)',
  })
  @IsString()
  birthday: string;

  @ApiProperty({
    enum: Gender,
    example: Gender.MALE,
    description: 'Giới tính (MALE | FEMALE)',
  })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({
    description: 'Kết quả phân tích các đặc điểm khuôn mặt (tam đình, ngũ quan, ấn đường)',
    example: {
      tam_dinh: [
        { trait: 'Trán rộng', tags: ['Thông minh', 'Sáng suốt'] }
      ],
      ngu_quan: {
        long_may: [{ trait: 'Lông mày thanh tú', tags: ['Tình cảm tốt'] }],
        mat: [{ trait: 'Mắt sáng', tags: ['Tinh tường'] }],
        mui: [{ trait: 'Mũi cao', tags: ['Tài vận tốt'] }],
        tai: [{ trait: 'Tai dày', tags: ['Thọ mệnh'] }],
        mieng_cam: [{ trait: 'Miệng đẹp', tags: ['Giao tiếp tốt'] }]
      },
      an_duong: [
        { trait: 'Ấn đường sáng', tags: ['Tâm trí thông suốt', 'Vận khí tốt'] }
      ]
    }
  })
  @IsObject()
  report: any;

  @ApiProperty({
    description: 'Giải thích chi tiết bằng AI',
    required: false,
    example: {
      tam_dinh: {
        thuong_dinh: 'Vùng trán đại diện cho trí tuệ...',
        trung_dinh: 'Vùng từ mày đến mũi...',
        ha_dinh: 'Vùng cằm và miệng...',
        tong_quan: 'Tổng quan về tam đình...',
      },
      ngu_quan: {
        long_may: 'Lông mày thể hiện cảm xúc...',
        mat: 'Mắt thể hiện tinh thần...',
        mui: 'Mũi thể hiện tài vận...',
        tai: 'Tai thể hiện phúc thọ...',
        mieng_cam: 'Miệng và cằm thể hiện hậu vận...',
      },
      an_duong: {
        mo_ta: 'Ấn đường nằm giữa hai lông mày, thuộc trung đình',
        y_nghia: 'Thể hiện tâm trí, khí vận và sự thông suốt',
        danh_gia: 'Rộng và sáng là dấu hiệu tốt',
      },
      loi_khuyen: ['Giữ tinh thần ổn định', 'Tránh căng thẳng kéo dài'],
    }
  })
  @IsOptional()
  @IsObject()
  interpret?: any;

  @ApiProperty({
    description: 'Dữ liệu landmarks của khuôn mặt (tọa độ các điểm)',
    example: {},
  })
  @IsObject()
  landmarks: any;

  @ApiProperty({
    description: 'Ảnh khuôn mặt đã được xử lý (base64)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...',
  })
  @IsString()
  image_base64: string;
}

export class SaveAnalysisDto {
  @ApiProperty({
    type: 'boolean',
    default: false,
    required: false,
    description: 'Có lưu kết quả vào database hay không',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  saveResult?: boolean;

  @ApiProperty({
    type: AnalysisDataDto,
    description: 'Dữ liệu phân tích khuôn mặt',
  })
  @ValidateNested()
  @Type(() => AnalysisDataDto)
  data: AnalysisDataDto;
}
