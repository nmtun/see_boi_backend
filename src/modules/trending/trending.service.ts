import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PostStatus } from '@prisma/client';

@Injectable()
export class TrendingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy top bài viết theo views hoặc likes trong khoảng thời gian
   * @param type 'views' hoặc 'likes'
   * @param period '24h' | 'today' | 'week' | 'month'
   * @param limit số lượng bài viết (mặc định 10)
   */
  async getTopPosts(
    type: 'views' | 'likes',
    period: '24h' | 'today' | 'week' | 'month',
    limit = 10,
  ) {
    const timeFilter = this.getTimeFilter(period);

    if (type === 'views') {
      return this.getTopByViews(timeFilter, limit);
    } else {
      return this.getTopByLikes(timeFilter, limit);
    }
  }

  /**
   * Tính toán time filter dựa trên period
   */
  private getTimeFilter(period: '24h' | 'today' | 'week' | 'month'): Date {
    const now = new Date();
    const currentHour = now.getHours();

    switch (period) {
      case '24h':
        // 24 giờ gần nhất
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);

      case 'today':
        // Nếu sau 7h sáng thì lấy từ 0h hôm nay, không thì lấy 24h
        if (currentHour >= 7) {
          const startOfToday = new Date(now);
          startOfToday.setHours(0, 0, 0, 0);
          return startOfToday;
        } else {
          return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

      case 'week':
        // 7 ngày gần nhất
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      case 'month':
        // 30 ngày gần nhất
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Lấy top bài viết theo lượt xem
   */
  private async getTopByViews(fromDate: Date, limit: number) {
    // Đếm views cho mỗi post trong khoảng thời gian
    const viewCounts = await this.prisma.postView.groupBy({
      by: ['postId'],
      where: {
        viewedAt: {
          gte: fromDate,
        },
      },
      _count: {
        postId: true,
      },
      orderBy: {
        _count: {
          postId: 'desc',
        },
      },
      take: limit,
    });

    // Lấy thông tin chi tiết của các post
    const postIds = viewCounts.map((v) => v.postId);
    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: postIds },
        status: PostStatus.VISIBLE,
        isDraft: false,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            userName: true,
            avatarUrl: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        images: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            views: true,
          },
        },
      },
    });

    // Map posts theo thứ tự view count
    const postsMap = new Map(posts.map((p) => [p.id, p]));
    const sortedPosts = viewCounts
      .map((vc) => {
        const post = postsMap.get(vc.postId);
        return post
          ? {
              ...post,
              viewsInPeriod: vc._count.postId,
            }
          : null;
      })
      .filter((p) => p !== null);

    return sortedPosts;
  }

  /**
   * Lấy top bài viết theo lượt thích
   */
  private async getTopByLikes(fromDate: Date, limit: number) {
    // Đếm likes cho mỗi post trong khoảng thời gian
    const likeCounts = await this.prisma.postLike.groupBy({
      by: ['postId'],
      where: {
        createdAt: {
          gte: fromDate,
        },
      },
      _count: {
        postId: true,
      },
      orderBy: {
        _count: {
          postId: 'desc',
        },
      },
      take: limit,
    });

    // Lấy thông tin chi tiết của các post
    const postIds = likeCounts.map((l) => l.postId);
    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: postIds },
        status: PostStatus.VISIBLE,
        isDraft: false,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            userName: true,
            avatarUrl: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        images: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            views: true,
          },
        },
      },
    });

    // Map posts theo thứ tự like count
    const postsMap = new Map(posts.map((p) => [p.id, p]));
    const sortedPosts = likeCounts
      .map((lc) => {
        const post = postsMap.get(lc.postId);
        return post
          ? {
              ...post,
              likesInPeriod: lc._count.postId,
            }
          : null;
      })
      .filter((p) => p !== null);

    return sortedPosts;
  }

  /**
   * Lấy thống kê tổng quan về trending
   */
  async getTrendingStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalViews24h, totalLikes24h, totalPosts24h, totalViews7d] =
      await Promise.all([
        this.prisma.postView.count({
          where: { viewedAt: { gte: last24h } },
        }),
        this.prisma.postLike.count({
          where: { createdAt: { gte: last24h } },
        }),
        this.prisma.post.count({
          where: {
            createdAt: { gte: last24h },
            status: PostStatus.VISIBLE,
            isDraft: false,
          },
        }),
        this.prisma.postView.count({
          where: { viewedAt: { gte: last7days } },
        }),
      ]);

    return {
      last24h: {
        totalViews: totalViews24h,
        totalLikes: totalLikes24h,
        totalPosts: totalPosts24h,
      },
      last7days: {
        totalViews: totalViews7d,
      },
    };
  }
}
