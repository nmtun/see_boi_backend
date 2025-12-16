import { Module } from '@nestjs/common';
import { BadgeService } from './badge.service';
import { BadgeController } from './badge.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [BadgeController],
  providers: [BadgeService, PrismaService],
  exports: [BadgeService],
})
export class BadgeModule {}
