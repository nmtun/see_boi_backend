import { IsArray, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreatePollDto {
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  options: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string; 
}