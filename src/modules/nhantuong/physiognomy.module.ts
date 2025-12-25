import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PhysiognomyService } from './physiognomy.service';
import { PhysiognomyController } from './physiognomy.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { GoogleGeminiModule } from '../gemini/google-gemini.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000, // 60 giây timeout
      maxRedirects: 5,
    }),
    PrismaModule,
    GoogleGeminiModule 
  ],
  controllers: [PhysiognomyController],
  providers: [PhysiognomyService], 
  exports: [PhysiognomyService],
})
export class PhysiognomyModule {}