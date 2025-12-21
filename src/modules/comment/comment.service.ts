import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ReplyCommentDto } from './dto/reply-comment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { VoteType } from '@prisma/client';
import { NotificationGateway } from 'src/utils/notification.gateway';

@Injectable()
export class CommentService {
  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
  ) { }

  async update(commentId: number, userId: number, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException();
    if (comment.userId !== userId) throw new ForbiddenException();

    return this.prisma.comment.update({
      where: { id: commentId },
      data: {
        content: dto.content,
      },
    });
  }

  async remove(commentId: number, userId: number) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException();
    if (comment.userId !== userId) throw new ForbiddenException();

    // Xóa cascade reply + vote
    return this.prisma.comment.delete({
      where: { id: commentId },
    });
  }

  async reply(
    commentId: number,
    userId: number,
    dto: ReplyCommentDto,
  ) {
    const parent = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!parent) throw new NotFoundException('Parent comment not found');

    const replyComment = await this.prisma.comment.create({
      data: {
        postId: parent.postId,
        userId,
        parentId: commentId,
        content: dto.content,
        imageUrl: dto.imageUrl,
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
          refId: replyComment.id,
        },
      });

      // Gửi socket realtime
      this.notificationGateway.sendComment(parent.userId, notification);
    }

    return replyComment;
  }

  // vote type: upvote / downvote
  async vote(
    commentId: number,
    userId: number,
    type: VoteType,
  ) {
    // đảm bảo comment tồn tại
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException();

    return this.prisma.commentVote.upsert({
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
  }

  async removeVote(commentId: number, userId: number) {
    return this.prisma.commentVote.delete({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });
  }
}
