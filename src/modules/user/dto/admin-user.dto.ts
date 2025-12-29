import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class GetUsersQueryDto {
  @ApiProperty({ required: false, description: 'Tìm kiếm theo tên, username, email' })
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false, enum: Role, description: 'Lọc theo vai trò' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ required: false, default: 1, description: 'Số trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10, description: 'Số lượng mỗi trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: Role, description: 'Vai trò mới' })
  @IsEnum(Role)
  role: Role;
}
