import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationGateway } from 'src/utils/notification.gateway';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, PrismaService, NotificationGateway],
  exports: [NotificationService],
})
export class NotificationModule {}
