import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PostModule } from './modules/post/post.module';
import { CommentModule } from './modules/comment/comment.module';
import { TagModule } from './modules/tag/tag.module';
import { CollectionModule } from './modules/collection/collection.module';
import { PollModule } from './modules/poll/poll.module';
import { BadgeModule } from './modules/badge/badge.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ReportModule } from './modules/report/report.module';
import { NotificationGateway } from './utils/notification.gateway';

@Module({
  imports: [
    PrismaModule, 
    AuthModule, UserModule, PostModule, CommentModule, TagModule, CollectionModule, PollModule, BadgeModule, NotificationModule, ReportModule,   
  ],
  controllers: [], 
  providers: [NotificationGateway],  
})
export class AppModule {}