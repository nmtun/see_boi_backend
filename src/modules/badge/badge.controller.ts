import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BadgeService } from './badge.service';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { Roles } from '../../auth/decorator/roles.decorator';

@Controller('badge')
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  // Xem số lượng badge của tất cả người dùng
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get()
  async findAll() {
    return this.badgeService.findAll();
  }
}
