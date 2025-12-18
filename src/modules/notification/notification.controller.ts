import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('me')
  @ApiOperation({ 
    summary: 'Lấy thông báo của tôi',
    description: 'Lấy danh sách thông báo của người dùng hiện tại. Có thể lọc theo trạng thái đã đọc/chưa đọc và phân trang.' 
  })
  @ApiQuery({ name: 'unread', required: false, type: String, description: 'true = chỉ lấy thông báo chưa đọc' })
  @ApiQuery({ name: 'limit', required: false, type: String, description: 'Số thông báo mỗi trang' })
  @ApiQuery({ name: 'page', required: false, type: String, description: 'Số trang' })
  @ApiResponse({ status: 200, description: 'Danh sách thông báo' })
  async getMyNotifications(@Req() req, @Query() query: NotificationQueryDto ) {
    return this.notificationService.findMine(req.user.id, query);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id/read')
  @ApiOperation({ 
    summary: 'Đánh dấu đã đọc',
    description: 'Đánh dấu một thông báo là đã đọc' 
  })
  @ApiParam({ name: 'id', description: 'ID của thông báo', type: Number })
  @ApiResponse({ status: 200, description: 'Đánh dấu thành công' })
  async markAsRead(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.notificationService.markAsRead(req.user.id, id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('read-all')
  @ApiOperation({ 
    summary: 'Đánh dấu tất cả đã đọc',
    description: 'Đánh dấu tất cả thông báo của người dùng là đã đọc' 
  })
  @ApiResponse({ status: 200, description: 'Đánh dấu thành công' })
  async markAllAsRead(@Req() req) {
    return this.notificationService.markAllAsRead(req.user.id);
  }
}
