import { Module } from '@nestjs/common';
import { PollService } from './poll.service';
import { PollController } from './poll.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PollController],
  providers: [PollService, PrismaService],
  exports: [PollService],
})
export class PollModule {}
