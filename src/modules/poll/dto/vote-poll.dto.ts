import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VotePollDto {
  @ApiProperty({
    description: 'ID của lựa chọn (option) trong poll',
    example: 1,
    type: Number,
  })
  @IsInt()
  optionId: number;
}
