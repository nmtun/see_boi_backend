import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [NotificationModule, UserModule, ModerationModule], // Import ModerationModule để sử dụng LLMModerationService
  controllers: [CommentController],
  providers: [CommentService, PrismaService],
  exports: [CommentService],
})
export class CommentModule {}
