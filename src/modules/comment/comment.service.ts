import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ReplyCommentDto } from './dto/reply-comment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { VoteType } from '@prisma/client';
import { NotificationGateway } from 'src/utils/notification.gateway';
import { v2 as cloudinary } from 'cloudinary';
import { UserService } from '../user/user.service';

@Injectable()
export class CommentService {
  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
    private userService: UserService,
  ) {}

  async update(commentId: number, userId: number, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { images: true },
    });
    if (!comment) throw new NotFoundException();
    if (comment.userId !== userId) throw new ForbiddenException();

    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        content: dto.content,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        votes: true,
        images: {
          select: {
            id: true,
            url: true,
          },
        },
      },
    });

    // ✅ Broadcast real-time update to all users viewing this post
    const upvotes = updatedComment.votes.filter((v) => v.type === 'UP').length;
    const downvotes = updatedComment.votes.filter(
      (v) => v.type === 'DOWN',
    ).length;

    const commentWithMeta = {
      ...updatedComment,
      images: updatedComment.images.map((img) => img.url),
      isOwner: false, // FE tự xác định
      displayName: updatedComment.isAnonymous
        ? 'Ẩn danh'
        : updatedComment.user?.fullName || 'Unknown',
      voteCounts: {
        upvotes,
        downvotes,
        total: upvotes - downvotes,
      },
    };
    this.notificationGateway.emitUpdateComment(comment.postId, commentWithMeta);

    return updatedComment;
  }

  async getCommentById(commentId: number) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException();
    return comment;
  }

  async deleteCommentImage(imageUrl: string) {
    const publicId = this.extractPublicIdFromUrl(imageUrl);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  }

  async remove(commentId: number, userId: number) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { images: true },
    });
    if (!comment) throw new NotFoundException();
    if (comment.userId !== userId) throw new ForbiddenException();

    const postId = comment.postId;

    // Delete images from Cloudinary
    if (comment.images && comment.images.length > 0) {
      for (const image of comment.images) {
        try {
          const publicId = this.extractPublicIdFromUrl(image.url);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
        }
      }
    }

    // Xóa cascade reply + vote
    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    // Broadcast real-time delete to all users viewing this post
    this.notificationGateway.emitDeleteComment(postId, commentId);

    return comment;
  }

  async reply(
    commentId: number,
    userId: number,
    dto: ReplyCommentDto,
    files?: Express.Multer.File[],
  ) {
    const parent = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!parent) throw new NotFoundException('Parent comment not found');

    // Validate: Chỉ cho phép reply comment gốc (parentId === null)
    if (parent.parentId !== null) {
      throw new ForbiddenException(
        'Chỉ có thể reply comment gốc, không thể reply của reply',
      );
    }

    // Get image URLs from CloudinaryStorage
    const imageUrls: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const url =
          (file as any).path || (file as any).url || (file as any).secure_url;
        if (url) {
          imageUrls.push(url);
        }
      }
    }

    const replyComment = await this.prisma.comment.create({
      data: {
        postId: parent.postId,
        userId,
        parentId: commentId,
        content: dto.content,
        isAnonymous: dto.isAnonymous ?? false,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
          },
        },
      },
    });

    // Lưu images vào bảng Image
    if (imageUrls.length > 0) {
      await this.prisma.image.createMany({
        data: imageUrls.map((url) => ({
          url,
          type: 'COMMENT',
          entityId: replyComment.id,
          commentId: replyComment.id,
        })),
      });
    }

    // Fetch lại comment với images
    const replyWithImages = await this.prisma.comment.findUnique({
      where: { id: replyComment.id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
          },
        },
      },
    });

    // Chỉ gửi thông báo nếu người reply khác chủ comment cha
    if (parent.userId !== userId) {
      // Lưu thông báo vào database
      const notification = await this.prisma.notification.create({
        data: {
          userId: parent.userId,
          type: 'POST_COMMENT',
          content: 'Có người trả lời bình luận của bạn',
          refId: replyComment.postId,
        },
      });

      // Gửi socket realtime
      this.notificationGateway.sendComment(parent.userId, notification);
    }

    // Broadcast real-time reply to all users viewing this post
    if (!replyWithImages) {
      throw new NotFoundException('Reply comment not found after creation');
    }

    const replyWithMeta = {
      ...replyWithImages,
      images: replyWithImages.images.map((img) => img.url),
      isOwner: false, // FE xử lý
      displayName: replyWithImages.isAnonymous
        ? 'Ẩn danh'
        : replyWithImages.user?.fullName || 'Unknown',
      voteCounts: {
        upvotes: 0,
        downvotes: 0,
        total: 0,
      },
    };
    this.notificationGateway.emitNewComment(parent.postId, replyWithMeta);

    return replyWithImages;
  }

  // vote type: upvote / downvote
  async vote(commentId: number, userId: number, type: VoteType) {
    // đảm bảo comment tồn tại
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException();

    // Kiểm tra vote hiện tại của user
    const existingVote = await this.prisma.commentVote.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });

    const result = await this.prisma.commentVote.upsert({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
      update: {
        type,
      },
      create: {
        commentId,
        userId,
        type,
      },
    });

    // Xử lý XP cho chủ comment (không tự vote cho mình)
    if (comment.userId !== userId) {
      // Nếu đổi từ DOWN sang UP hoặc ngược lại
      if (existingVote && existingVote.type !== type) {
        if (type === 'UP') {
          // Đổi từ downvote sang upvote: +3 (upvote) + 2 (hoàn lại downvote) = +5
          await this.userService.addXP(comment.userId, 'LIKE_RECEIVED', 5);
        } else {
          // Đổi từ upvote sang downvote: -3 (mất upvote) - 2 (downvote) = -5
          await this.userService.addXP(comment.userId, 'LIKE_RECEIVED', -5);
        }
      } else if (!existingVote) {
        // Vote mới
        if (type === 'UP') {
          // Upvote: +3 điểm
          await this.userService.addXP(comment.userId, 'LIKE_RECEIVED', 3);
        } else {
          // Downvote: -2 điểm
          await this.userService.addXP(comment.userId, 'LIKE_RECEIVED', -2);
        }
      }
    }

    return result;
  }

  async removeVote(commentId: number, userId: number) {
    // Lấy thông tin comment và vote hiện tại
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException();

    const existingVote = await this.prisma.commentVote.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });

    const result = await this.prisma.commentVote.delete({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });

    // Xử lý XP khi remove vote (hoàn lại điểm)
    if (existingVote && comment.userId !== userId) {
      if (existingVote.type === 'UP') {
        // Remove upvote: -3 điểm
        await this.userService.addXP(comment.userId, 'LIKE_RECEIVED', -3);
      } else {
        // Remove downvote: +2 điểm
        await this.userService.addXP(comment.userId, 'LIKE_RECEIVED', 2);
      }
    }

    return result;
  }

  // Helper method to extract publicId from Cloudinary URL
  private extractPublicIdFromUrl(url: string): string | null {
    try {
      const regex = /\/(?:v\d+\/)?([^\/]+\/[^\.]+)/;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch (error) {
      console.error('Error extracting publicId from URL:', error);
      return null;
    }
  }
}
