import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Tên đầy đủ của người dùng',
    example: 'Nguyễn Văn A',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({
    description: 'Email của người dùng (dùng để đăng nhập)',
    example: 'nguyenvana@example.com',
    type: String,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Mật khẩu (tối thiểu 6 ký tự)',
    example: 'password123',
    minLength: 6,
    type: String,
  })
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({
    description: 'Tên người dùng (username duy nhất)',
    example: 'nguyenvana',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  userName: string;

  @ApiPropertyOptional({
    description: 'Vai trò của người dùng trong hệ thống',
    enum: Role,
    example: Role.USER,
    default: Role.USER,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

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
}

export class LoginDto {
  @ApiProperty({
    description: 'Email đăng nhập',
    example: 'nguyenvana@example.com',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty({
    description: 'Mật khẩu',
    example: 'password123',
    type: String,
  })
  @IsNotEmpty()
  password: string;
}