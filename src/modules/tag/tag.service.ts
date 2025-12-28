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

  //////////////////////////////////////////////////
  // TAG FOLLOW SYSTEM
  //////////////////////////////////////////////////

  // Follow a tag
  async followTag(userId: number, tagId: number) {
    // Check if tag exists
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag) throw new NotFoundException('Tag not found');

    // Check if already following
    const existingFollow = await this.prisma.tagFollow.findUnique({
      where: {
        userId_tagId: { userId, tagId },
      },
    });

    if (existingFollow) {
      throw new ForbiddenException('Already following this tag');
    }

    return this.prisma.tagFollow.create({
      data: { userId, tagId },
      include: {
        tag: true,
      },
    });
  }

  // Unfollow a tag
  async unfollowTag(userId: number, tagId: number) {
    const tagFollow = await this.prisma.tagFollow.findUnique({
      where: {
        userId_tagId: { userId, tagId },
      },
    });

    if (!tagFollow) {
      throw new NotFoundException('Not following this tag');
    }

    return this.prisma.tagFollow.delete({
      where: {
        userId_tagId: { userId, tagId },
      },
    });
  }

  // Check if user is following a tag
  async isFollowingTag(userId: number, tagId: number): Promise<boolean> {
    const tagFollow = await this.prisma.tagFollow.findUnique({
      where: {
        userId_tagId: { userId, tagId },
      },
    });

    return !!tagFollow;
  }

  // Get all tags that a user is following
  async getUserFollowingTags(userId: number) {
    const tagFollows = await this.prisma.tagFollow.findMany({
      where: { userId },
      include: {
        tag: {
          include: {
            _count: {
              select: {
                posts: true,
                followers: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tagFollows.map((tf) => ({
      ...tf.tag,
      followedAt: tf.createdAt,
    }));
  }

  // Get tag details with follow status (for logged-in users)
  async getTagWithFollowStatus(tagId: number, viewerId?: number) {
    const tag = await this.prisma.tag.findUnique({
      where: { id: tagId },
      include: {
        _count: {
          select: {
            posts: true,
            followers: true,
          },
        },
      },
    });

    if (!tag) throw new NotFoundException('Tag not found');

    let isFollowing = false;
    if (viewerId) {
      isFollowing = await this.isFollowingTag(viewerId, tagId);
    }

    return {
      ...tag,
      isFollowing,
    };
  }

}
