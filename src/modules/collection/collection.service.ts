import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) { }

  async create(userId: number, dto: CreateCollectionDto) {
    return this.prisma.collection.create({
      data: {
        userId,
        name: dto.name,
      },
    });
  }

  async update(collectionId: number, userId: number, dto: UpdateCollectionDto) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection) throw new NotFoundException();
    if (collection.userId !== userId) throw new ForbiddenException();
    return this.prisma.collection.update({
      where: { id: collectionId },
      data: {
        name: dto.name,
      },
    });
  }

  async findMine(userId: number) {
    return this.prisma.collection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { bookmarks: true },
        },
      },
    });
  }

  async remove(collectionId: number, userId: number) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection) throw new NotFoundException();
    if (collection.userId !== userId) throw new ForbiddenException();

    // bỏ liên kết bookmark
    await this.prisma.bookmark.updateMany({
      where: { collectionId },
      data: { collectionId: null },
    });

    return this.prisma.collection.delete({
      where: { id: collectionId },
    });
  }
}
