import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PollModule } from '../poll/poll.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PollModule, NotificationModule], // Import NotificationModule để sử dụng NotificationGateway
  controllers: [PostController],
  providers: [PostService, PrismaService],
  exports: [PostService],
})
export class PostModule {}
