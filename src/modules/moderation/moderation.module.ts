import { Module } from '@nestjs/common';
import { ModerationController } from './moderation.controller';
import { LLMModerationService } from '../../utils/llm-moderation.service';
import { GoogleGeminiModule } from '../gemini/google-gemini.module';

@Module({
  imports: [GoogleGeminiModule],
  controllers: [ModerationController],
  providers: [LLMModerationService],
  exports: [LLMModerationService],
})
export class ModerationModule {}
