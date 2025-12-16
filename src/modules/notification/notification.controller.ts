import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('me')
  async getMyNotifications(@Req() req, @Query() query: NotificationQueryDto ) {
    return this.notificationService.findMine(req.user.id, query);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id/read')
  async markAsRead(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.notificationService.markAsRead(req.user.id, id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('read-all')
  async markAllAsRead(@Req() req) {
    return this.notificationService.markAllAsRead(req.user.id);
  }
}
