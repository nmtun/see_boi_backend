import { IsBoolean, IsOptional, IsObject, IsString, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

class AnalysisDataDto {
  @ApiProperty({
    description: 'Kết quả phân tích các đặc điểm khuôn mặt (tam đình, ngũ quan)',
    example: {
      tam_dinh: [
        { trait: 'Trán rộng', tags: ['Thông minh', 'Sáng suốt'] }
      ],
      long_may: [
        { trait: 'Lông mày thanh tú', tags: ['Tình cảm tốt'] }
      ],
      mat: [
        { trait: 'Mắt sáng', tags: ['Tinh tường'] }
      ],
      mui: [
        { trait: 'Mũi cao', tags: ['Tài vận tốt'] }
      ],
      tai: [
        { trait: 'Tai dày', tags: ['Thọ mệnh'] }
      ],
      mieng_cam: [
        { trait: 'Miệng đẹp', tags: ['Giao tiếp tốt'] }
      ]
    }
  })
  @IsObject()
  report: any;

  @ApiProperty({
    description: 'Giải thích chi tiết bằng AI (tùy chọn, có thể không có nếu chưa gọi interpret)',
    required: false,
    example: {
      tam_dinh: {
        thuong_dinh: 'Vùng trán đại diện cho trí tuệ...',
        trung_dinh: 'Vùng từ mày đến mũi...',
        ha_dinh: 'Vùng cằm và miệng...',
        tong_quan: 'Tổng quan về tam đình...'
      },
      ngu_quan: {
        long_may: 'Lông mày thể hiện...',
        mat: 'Mắt thể hiện...',
        mui: 'Mũi thể hiện...',
        tai: 'Tai thể hiện...',
        mieng_cam: 'Miệng và hàm thể hiện...'
      },
      loi_khuyen: ['Lời khuyên 1', 'Lời khuyên 2']
    }
  })
  @IsOptional()
  @IsObject()
  interpret?: any;

  @ApiProperty({
    description: 'Dữ liệu landmarks của khuôn mặt (tọa độ các điểm trên khuôn mặt)',
    example: {}
  })
  @IsObject()
  landmarks: any;

  @ApiProperty({
    description: 'Ảnh khuôn mặt đã được xử lý (base64 encoded)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
  })
  @IsString()
  image_base64: string;
}

export class SaveAnalysisDto {
  @ApiProperty({
    type: 'boolean',
    default: false,
    required: false,
    description: 'Có lưu kết quả vào database hay không (mặc định: false)'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  saveResult?: boolean;

  @ApiProperty({
    type: AnalysisDataDto,
    description: 'Dữ liệu phân tích khuôn mặt bao gồm report, interpret (tùy chọn), landmarks và ảnh'
  })
  @ValidateNested()
  @Type(() => AnalysisDataDto)
  data: AnalysisDataDto;
}