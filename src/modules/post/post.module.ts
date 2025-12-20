import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PollModule } from '../poll/poll.module';
import { NotificationGateway } from 'src/utils/notification.gateway';

@Module({
  imports: [PollModule],
  controllers: [PostController],
  providers: [PostService, PrismaService, NotificationGateway],
  exports: [PostService],
})
export class PostModule {}
