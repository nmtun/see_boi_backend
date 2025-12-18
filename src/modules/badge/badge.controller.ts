import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BadgeService } from './badge.service';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Badges')
@ApiBearerAuth()
@Controller('badge')
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  // Xem số lượng badge của tất cả người dùng
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get()
  @ApiOperation({ 
    summary: 'Lấy thống kê badges (ADMIN)',
    description: 'Xem số lượng badge của tất cả người dùng trong hệ thống. Chỉ admin mới có quyền truy cập.' 
  })
  @ApiResponse({ status: 200, description: 'Danh sách thống kê badges' })
  @ApiResponse({ status: 403, description: 'Không có quyền (chỉ admin)' })
  async findAll() {
    return this.badgeService.findAll();
  }
}
