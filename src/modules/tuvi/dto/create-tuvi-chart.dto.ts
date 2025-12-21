// src/tuvi/dto/create-tuvi-chart.dto.ts
import { IsString, IsNumber, IsIn, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class CreateTuViChartDto {
  @IsDateString()
  birthDate: string; // YYYY-MM-DD

  @IsNumber()
  birthHour: number; // 0-23

  @IsString()
  @IsIn(['nam', 'nữ'])
  gender: string;

  @IsOptional()
  @IsString()
  birthPlace?: string;

  @IsOptional()
  @IsBoolean()
  isLunar?: boolean; // Nếu người dùng nhập theo lịch âm
}