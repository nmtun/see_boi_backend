import { Module } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { OpenAIAPIService } from './openai-api.service';
import { ConfigModule } from '@nestjs/config';
import { OpenAIController } from './openai.controller';

@Module({
  imports: [ConfigModule],
  providers: [OpenAIService, OpenAIAPIService],
  controllers: [OpenAIController],
  exports: [OpenAIService],
})
export class OpenAIModule {}

