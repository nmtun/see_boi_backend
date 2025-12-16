import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReportStatus } from '@prisma/client';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';


@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) { }


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
          select: { id: true, fullName: true },
        },
        post: {
          select: { id: true, title: true },
        },
        comment: {
          select: { id: true, content: true },
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


}
