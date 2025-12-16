import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) { }

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

  // Đánh dấu đã đọc tất cả thông báo của user
  async markAsRead(id: number, userId: number) {
    const noti = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!noti || noti.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
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
