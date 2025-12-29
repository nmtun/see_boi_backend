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
import { TuViModule } from './modules/tuvi/tuvi.module';
import { GoogleGeminiModule } from './modules/gemini/google-gemini.module';
import { UploadModule } from './modules/upload/upload.module';
import { PhysiognomyModule } from './modules/nhantuong/physiognomy.module';
import { TrendingModule } from './modules/trending/trending.module';
import { TarotModule } from './modules/tarot/tarot.module';
import { OpenAIModule } from './modules/openai/openai.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { SearchModule } from './modules/search/search.module';

@Module({
  imports: [
    PrismaModule, 
    AuthModule, UserModule, PostModule, CommentModule, TagModule, CollectionModule, PollModule, BadgeModule, NotificationModule, ReportModule, TuViModule ,
    GoogleGeminiModule, PhysiognomyModule, TarotModule, OpenAIModule,
    UploadModule, TrendingModule, ModerationModule, SearchModule
  ],
  controllers: [], 
  providers: [], // Đã xóa NotificationGateway khỏi đây, chỉ khai báo trong NotificationModule
})
export class AppModule {}