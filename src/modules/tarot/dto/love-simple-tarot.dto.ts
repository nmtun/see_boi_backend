import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoveSimpleTarotDto {
  @ApiProperty({
    example: 'Tình yêu của tôi sẽ phát triển như thế nào?',
    description: 'Câu hỏi về tình yêu mà người dùng muốn được luận giải',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    example: 'The Lovers',
    description: 'Tên lá bài tarot thứ nhất (cho Quá khứ)',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  card1: string;

  @ApiProperty({
    example: 'The Two of Cups',
    description: 'Tên lá bài tarot thứ hai (cho Hiện tại)',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  card2: string;

  @ApiProperty({
    example: 'The Sun',
    description: 'Tên lá bài tarot thứ ba (cho Tương lai)',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  card3: string;
}

