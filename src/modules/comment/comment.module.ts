import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [NotificationModule, UserModule], // Import UserModule để sử dụng UserService, NotificationModule để sử dụng NotificationGateway
  controllers: [CommentController],
  providers: [CommentService, PrismaService],
  exports: [CommentService],
})
export class CommentModule {}
