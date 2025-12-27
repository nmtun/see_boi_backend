import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class YesNoTarotDto {
  @ApiProperty({
    example: 'Tôi có nên thay đổi công việc hiện tại không?',
    description: 'Câu hỏi yes/no mà người dùng muốn được trả lời',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    example: 'The Fool',
    description: 'Tên lá bài tarot thứ nhất (một trong hai lá bài đã bốc)',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  card1: string;

  @ApiProperty({
    example: 'The Magician',
    description: 'Tên lá bài tarot thứ hai (lá bài còn lại đã bốc)',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  card2: string;

  @ApiProperty({
    example: 'card1',
    description: 'Lá bài nào đã được lật (card1 hoặc card2)',
    enum: ['card1', 'card2'],
    required: true,
  })
  @IsString()
  @IsIn(['card1', 'card2'])
  @IsNotEmpty()
  revealedCard: 'card1' | 'card2';
}

