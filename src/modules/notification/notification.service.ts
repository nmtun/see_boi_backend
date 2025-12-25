import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationGateway } from 'src/utils/notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
  ) { }

  // Lấy tất cả thông báo của user, có phân trang
  async findMine(userId: number, query: NotificationQueryDto) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(query.unread === 'true' && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });
  }

  // Đánh dấu đã đọc một thông báo
  async markAsRead(userId: number, notificationId: number) {
    // findUnique chỉ chấp nhận unique field (id), check ownership sau
    const noti = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!noti) {
      throw new NotFoundException('Notification not found');
    }

    if (noti.userId !== userId) {
      throw new NotFoundException('Notification not found or access denied');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  // Đánh dấu là đọc hết 
    async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });
  }
}
