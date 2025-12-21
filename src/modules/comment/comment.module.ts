import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationGateway } from 'src/utils/notification.gateway';

@Module({
  controllers: [CommentController],
  providers: [CommentService, PrismaService, NotificationGateway],
  exports: [CommentService],
})
export class CommentModule {}
