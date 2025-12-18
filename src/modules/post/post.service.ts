import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { PostStatus, PostVisibility } from '@prisma/client';

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) { }

  // tạo bài viết
  async create(userId: number, dto: CreatePostDto) {
    let tagIds = dto.tagIds;
    // loại bỏ tag trùng
    if (tagIds) {
      tagIds = Array.from(new Set(tagIds));
    }
    const post = await this.prisma.post.create({
      data: {
        userId,
        title: dto.title,
        content: dto.content,
        type: dto.type,
        visibility: dto.visibility ?? PostVisibility.PUBLIC,
        isDraft: dto.isDraft ?? false,
        status: PostStatus.VISIBLE,
        tags: tagIds
          ? {
            create: tagIds.map(tagId => ({
              tagId,
            })),
          }
          : undefined,
      },
      include: {
        tags: { include: { tag: true } },
      },
    });

    let poll: any = null;
    if (dto.poll) {
      poll = await this.createPoll(post.id, userId, dto.poll);
    }

    return {
      ...post,
      poll,
    };
  }

  // cập nhật bài viết
  async update(postId: number, userId: number, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException();
    if (post.userId !== userId) throw new ForbiddenException();

    // lưu lịch sử chỉnh sửa
    await this.prisma.postEditHistory.create({
      data: {
        postId,
        oldContent: post.content,
      },
    });

    // Loại bỏ trường poll nếu có
    const { poll, ...updateData } = dto;

    return this.prisma.post.update({
      where: { id: postId },
      data: updateData,
    });
  }

  async findAll() {
    return this.prisma.post.findMany({
      where: {
        status: PostStatus.VISIBLE,
        isDraft: false,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        likes: true,
        comments: true,
        tags: { include: { tag: true } },
        poll: { include: { options: true } },
      },
    });
  }

  async findById(postId: number, viewerId?: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        likes: true,
        comments: true,
        tags: { include: { tag: true } },
        poll: { include: { options: true } },
      },
    });
    if (!post || post.status !== PostStatus.VISIBLE || post.isDraft) throw new NotFoundException('Post not found or not visible');

    // log view
    await this.prisma.postView.create({
      data: {
        postId: postId,
        userId: viewerId,
      },
    });

    return post;
  }

  async softDelete(postId: number, userId: number) {
    return this.prisma.post.update({
      where: { id: postId, userId },
      data: {
        status: PostStatus.DELETED,
        deletedAt: new Date(),
      },
    })
  }

  async restore(postId: number, userId: number) {
    return this.prisma.post.update({
      where: { id: postId, userId },
      data: {
        status: PostStatus.VISIBLE,
        deletedAt: null,
      },
    })
  }

  async getDeletedPosts(userId: number) {
    return this.prisma.post.findMany({
      where: {
        userId,
        status: PostStatus.DELETED
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async getDrafts(userId: number) {
    return this.prisma.post.findMany({
      where: {
        userId,
        isDraft: true,
        status: PostStatus.VISIBLE,
      },
    });
  }

  async remove(postId: number, userId: number) {
    return this.prisma.post.deleteMany({
      where: { id: postId, userId },
    });
  }

  // like & unlike bài viết
  async like(postId: number, userId: number) {
    return this.prisma.postLike.create({
      data: {
        postId,
        userId,
      },
    });
  }

  async unlike(postId: number, userId: number) {
    return this.prisma.postLike.delete({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });
  }

  // bài viết trending
  async getTrending(limit = 10) {
    return this.prisma.post.findMany({
      where: {
        status: PostStatus.VISIBLE,
        isDraft: false,
      },
      orderBy: [
        { likes: { _count: 'desc' } },
        { comments: { _count: 'desc' } },
      ],
      take: limit,
      include: {
        _count: {
          select: { likes: true, comments: true, views: true },
        },
      },
    });
  }

  // lấy danh sách người thích bài viết
  async getLikes(postId: number) {
    return this.prisma.postLike.findMany({
      where: { postId },
      include: { user: true },
    });
  }

  // tạo comment cho bài viết
  async commentOnPost(postId: number, userId: number, content: string, parentId?: number) { // parentId để hỗ trợ reply
    const post = await this.prisma.post.findUnique({
      where: {
        id: postId
      }
    });

    if (!post || post.status !== PostStatus.VISIBLE || post.isDraft) throw new NotFoundException('Post not found or not visible');

    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({ where: { id: parentId } });
      if (!parentComment || parentComment.postId !== postId) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    return this.prisma.comment.create({
      data: {
        postId,
        userId,
        content,
        parentId,
      },
    });
  }

  // lấy bình luận của bài viết
  async getComments(postId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post not found');

    return this.prisma.comment.findMany({
      where: {
        postId,
        parentId: null
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  // bookmark bài viết
  async bookmark(postId: number, userId: number, collectionId?: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId }
    });
    if (!post || post.status !== PostStatus.VISIBLE || post.isDraft) {
      throw new NotFoundException('Post not found or not visible');
    }

    try {
      return await this.prisma.bookmark.create({
        data: {
          postId,
          userId,
          collectionId,
        },
      });
    } catch (error) {
      // đã bookmark rồi
      throw new ForbiddenException('You have already bookmarked this post');
    }
  }

  // remove bookmark
  async removeBookmark(postId: number, userId: number) {
    return this.prisma.bookmark.delete({
      where: {
        userId_postId: {
          postId,
          userId,
        },
      },
    });
  }

  // tạo poll cho bài viết
  async createPoll(postId: number, userId: number, dto: CreatePollDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { poll: true },
    });

    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) {
      throw new ForbiddenException('You are not the post owner');
    }
    if (post.poll) {
      throw new ConflictException('Post already has a poll');
    }

    // validate options
    if (dto.options.length < 2 || dto.options.length > 10) {
      throw new ForbiddenException('Poll must have between 2 and 10 options');
    }

    return this.prisma.poll.create({
      data: {
        postId,
        expiresAt: dto.expiresAt,
        options: {
          create: dto.options.map(text => ({ text })),
        },
      },
      include: {
        options: true,
      },
    });
  }

  // update pullish status
  async updatePublish(postId: number, userId: number, isDraft: boolean) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException();
    if (post.userId !== userId) throw new ForbiddenException();
    return this.prisma.post.update({
      where: { id: postId },
      data: { isDraft },
    });
  }

  // update visibility
  async updateVisibility(postId: number, userId: number, visibility: PostVisibility) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException();
    if (post.userId !== userId) throw new ForbiddenException();
    return this.prisma.post.update({
      where: { id: postId },
      data: { visibility },
    });
  }

  // lấy bài viết của 1 users khi xem profile
  async getPostsByUser(userId: number) {
    return this.prisma.post.findMany({
      where: {
        userId,
        status: PostStatus.VISIBLE,
        isDraft: false,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        likes: true,
        comments: true,
        tags: { include: { tag: true } },
        poll: { include: { options: true } },
      },
    });
  }
}