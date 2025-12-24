import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeFaceDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
  })
  image: any;
}