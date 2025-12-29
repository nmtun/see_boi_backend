import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PollModule } from '../poll/poll.module';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [PollModule, NotificationModule, UserModule, ModerationModule], // Import ModerationModule để sử dụng LLMModerationService
  controllers: [PostController],
  providers: [PostService, PrismaService],
  exports: [PostService],
})
export class PostModule {}
