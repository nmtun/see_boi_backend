import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoveDeepTarotDto {
  @ApiProperty({
    example: 'Tôi muốn hiểu sâu hơn về hành trình tình yêu của mình',
    description: 'Câu hỏi về tình yêu mà người dùng muốn được luận giải sâu sắc',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    example: 'The Fool',
    description: 'Tên lá bài tarot thứ nhất - Năng lượng khi bước vào mối quan hệ',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  card1: string;

  @ApiProperty({
    example: 'The Tower',
    description: 'Tên lá bài tarot thứ hai - Thử thách hay vấn đề trên hành trình yêu thương',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  card2: string;

  @ApiProperty({
    example: 'The Moon',
    description: 'Tên lá bài tarot thứ ba - Dư âm từ những mối tình đã qua',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  card3: string;

  @ApiProperty({
    example: 'The Star',
    description: 'Tên lá bài tarot thứ tư - Điều cần chữa lành, hoàn thiện hoặc học hỏi',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  card4: string;

  @ApiProperty({
    example: 'The Sun',
    description: 'Tên lá bài tarot thứ năm - Thông điệp về yêu thương bản thân',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  card5: string;
}

