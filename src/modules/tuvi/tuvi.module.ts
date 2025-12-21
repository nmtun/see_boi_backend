import { Module } from '@nestjs/common';
import { TuViController } from './tuvi.controller';
import { TuViService } from './tuvi.service';
import { PrismaModule } from '../../prisma/prisma.module'; 
import { GoogleGeminiModule } from '../gemini/google-gemini.module';

@Module({
  imports: [PrismaModule,GoogleGeminiModule],
  controllers: [TuViController],
  providers: [TuViService],
  exports: [TuViService], 
})
export class TuViModule {}