import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DailyTarotDto {
  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Tên của người muốn bói tarot',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '2002-08-15',
    description: 'Ngày tháng năm sinh (YYYY-MM-DD)',
    required: true,
  })
  @IsDateString()
  @IsNotEmpty()
  birthday: string;

  @ApiProperty({
    example: 'The Fool',
    description: 'Tên lá bài tarot thứ nhất (cho câu hỏi về Tình yêu)',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  card1: string;

  @ApiProperty({
    example: 'The Magician',
    description: 'Tên lá bài tarot thứ hai (cho câu hỏi về Tâm trạng)',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  card2: string;

  @ApiProperty({
    example: 'The High Priestess',
    description: 'Tên lá bài tarot thứ ba (cho câu hỏi về Tiền bạc)',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  card3: string;
}

