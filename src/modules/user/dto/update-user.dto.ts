import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsEmail } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Tên đầy đủ của người dùng',
    example: 'Nguyễn Văn A',
    type: String,
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Tên người dùng (username)',
    example: 'nguyenvana',
    type: String,
  })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional({
    description: 'Email của người dùng',
    example: 'nguyenvana@example.com',
    type: String,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Ngày sinh của người dùng (định dạng ISO 8601)',
    example: '1990-01-01',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  birthday?: string;

  @ApiPropertyOptional({
    description: 'Giới tính của người dùng',
    example: 'Nam',
    type: String,
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({
    description: 'Biếu tượng (Bio) của người dùng',
    example: 'Developer at ABC Company',
    type: String,
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: 'URL ảnh đại diện',
    example: 'https://example.com/avatar.jpg',
    type: String,
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
