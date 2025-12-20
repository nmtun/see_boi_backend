import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationGateway } from 'src/utils/notification.gateway';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService, NotificationGateway],
  exports: [UserService],
})
export class UserModule {}
