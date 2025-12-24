import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PhysiognomyService } from './physiognomy.service';
import { PhysiognomyController } from './physiognomy.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
  ],
  controllers: [PhysiognomyController],
  providers: [PhysiognomyService],
  exports: [PhysiognomyService],
})
export class PhysiognomyModule {}