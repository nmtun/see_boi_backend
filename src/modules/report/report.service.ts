import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReportStatus } from '@prisma/client';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { NotificationGateway } from 'src/utils/notification.gateway';


@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
  ) { }


  async create(userId: number, dto: CreateReportDto) {
    // validate target
    if (!dto.postId && !dto.commentId) {
      throw new BadRequestException('postId or commentId is required');
    }

    if (dto.postId && dto.commentId) {
      throw new BadRequestException('Only one target is allowed');
    }

    // tránh report trùng
    const existed = await this.prisma.report.findFirst({
      where: {
        reporterId: userId,
        postId: dto.postId ?? undefined,
        commentId: dto.commentId ?? undefined,
        status: ReportStatus.PENDING,
      },
    });

    if (existed) {
      throw new ForbiddenException('You already reported this content');
    }

    return this.prisma.report.create({
      data: {
        reporterId: userId,
        postId: dto.postId,
        commentId: dto.commentId,
        reason: dto.reason,
      },
    });
  }

  async findAll(status?: ReportStatus) {
    return this.prisma.report.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { 
            id: true, 
            fullName: true,
            email: true,
            userName: true,
          },
        },
        post: {
          select: { 
            id: true, 
            title: true,
            content: true,
            status: true,
            category: true,
            user: {
              select: { id: true, fullName: true, userName: true }
            }
          },
        },
        comment: {
          select: { 
            id: true, 
            content: true,
            isDeleted: true,
            category: true,
            user: {
              select: { id: true, fullName: true, userName: true }
            },
            post: {
              select: { id: true, title: true }
            }
          },
        },
      },
    });
  }

  async updateStatus(reportId: number, status: ReportStatus) {
    return this.prisma.report.update({
      where: { id: reportId },
      data: { status },
    });
  }

  async resolveReport(reportId: number, adminAction: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { 
        post: { include: { user: true } }, 
        comment: { include: { user: true, post: true } }
      }
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Determine content type and author
    const contentType = report.post ? 'post' : 'comment';
    const author = report.post?.user || report.comment?.user;
    const contentTitle = report.post?.title || report.comment?.post?.title || 'Nội dung';

    // Send notification to reporter
    this.notificationGateway.emitReportResolved(report.reporterId, adminAction, contentType);

    // Send warning to content author if action is warning
    if (author && adminAction.includes('cảnh cáo')) {
      this.notificationGateway.emitReportWarning(author.id, contentType, contentTitle, report.reason);
    }

    // Update report status
    return this.prisma.report.update({
      where: { id: reportId },
      data: { 
        status: ReportStatus.RESOLVED,
      },
    });
  }

  async deleteReportedPost(reportId: number) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { post: { include: { user: true } } }
    });

    if (!report || !report.postId || !report.post) {
      throw new NotFoundException('Report or post not found');
    }

    const post = report.post;
    const authorId = post.user?.id;
    const postTitle = post.title || 'Bài viết của bạn';

    // Send notification to reporter
    this.notificationGateway.emitReportResolved(report.reporterId, 'Đã xóa nội dung vi phạm', 'post');

    // Send notification to post author
    if (authorId) {
      this.notificationGateway.emitReportedContentDeleted(authorId, 'post', postTitle, report.reason);
    }

    // IMPORTANT: Mark report as resolved BEFORE deleting post (to avoid cascade delete)
    await this.prisma.report.update({
      where: { id: reportId },
      data: { status: ReportStatus.RESOLVED, postId: null } // Clear postId to avoid cascade
    });

    // Delete the post
    await this.prisma.post.delete({
      where: { id: report.postId }
    });

    return { message: 'Post deleted and report resolved successfully' };
  }

  async deleteReportedComment(reportId: number) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { comment: { include: { user: true, post: true } } }
    });

    if (!report || !report.commentId || !report.comment) {
      throw new NotFoundException('Report or comment not found');
    }

    const comment = report.comment;
    const authorId = comment.user?.id;
    const postTitle = comment.post?.title || 'bài viết';
    const commentPreview = comment.content.substring(0, 50) + '...';

    // Send notification to reporter
    this.notificationGateway.emitReportResolved(report.reporterId, 'Đã xóa nội dung vi phạm', 'comment');

    // Send notification to comment author
    if (authorId) {
      this.notificationGateway.emitReportedContentDeleted(authorId, 'comment', `"${commentPreview}" trong ${postTitle}`, report.reason);
    }

    // IMPORTANT: Mark report as resolved BEFORE deleting comment (to avoid cascade delete)
    await this.prisma.report.update({
      where: { id: reportId },
      data: { status: ReportStatus.RESOLVED, commentId: null } // Clear commentId to avoid cascade
    });

    // Delete the comment
    await this.prisma.comment.delete({
      where: { id: report.commentId }
    });

    return { message: 'Comment deleted and report resolved successfully' };
  }


}
