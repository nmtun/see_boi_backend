import { Module } from '@nestjs/common';
import { TarotService } from './tarot.service';
import { TarotController } from './tarot.controller';
import { GoogleGeminiModule } from '../gemini/google-gemini.module';

@Module({
  imports: [GoogleGeminiModule],
  controllers: [TarotController],
  providers: [TarotService],
  exports: [TarotService],
})
export class TarotModule {}

