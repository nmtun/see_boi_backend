import { Module } from '@nestjs/common';
import { GoogleGeminiService } from './google-gemini.service';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule],
    providers: [GoogleGeminiService],
    exports: [GoogleGeminiService],
})
export class GoogleGeminiModule {}