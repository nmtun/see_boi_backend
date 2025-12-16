import { Injectable } from '@nestjs/common';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BadgeService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll() {
    return this.prisma.badge.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { users: true }, // số người đã đạt badge
        },
      },
    });
  }

}
