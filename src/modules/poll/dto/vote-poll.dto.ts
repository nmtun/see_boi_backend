import { IsInt } from 'class-validator';

export class VotePollDto {
  @IsInt()
  optionId: number;
}
