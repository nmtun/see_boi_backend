import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OneCardTarotDto {
  @ApiProperty({
    example: 'Tôi nên làm gì để cải thiện mối quan hệ hiện tại?',
    description: 'Câu hỏi mà người dùng muốn được luận giải',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    example: 'The Lovers',
    description: 'Tên lá bài tarot mà người dùng đã bốc',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  card: string;
}

