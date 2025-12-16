import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class TagService {
  constructor(private prisma: PrismaService) { }

  // create tag - admin only
  async create(createTagDto: CreateTagDto) {
    return this.prisma.tag.create({
      data: createTagDto,
    });
  }

  // lấy tất cả tag, sắp xếp theo số bài viết nhiều nhất - để thống kê số tag thịnh hành
  async findAll() {
    return this.prisma.tag.findMany({
      orderBy: {
        posts: { _count: 'desc' },
      },
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });
  }

  // update tag - admin only
  async update(tagId: number, updateTagDto: UpdateTagDto) {
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag) throw new NotFoundException('Tag not found');
    return this.prisma.tag.update({
      where: { id: tagId },
      data: updateTagDto,
    });
  }

  // delete tag - admin only
  async remove(tagId: number) {
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag) throw new NotFoundException('Tag not found');
    return this.prisma.tag.delete({
      where: { id: tagId },
    });
  }

}
