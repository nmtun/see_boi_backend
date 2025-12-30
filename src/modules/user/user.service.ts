import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationGateway } from 'src/utils/notification.gateway';
import { v2 as cloudinary} from 'cloudinary';
import { Role } from '@prisma/client';
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService, private notificationGateway: NotificationGateway) { }

  // profile
  async findMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // tìm user theo id
  async findById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // cập nhật thông tin user
  async updateMe(userId: number, dto: UpdateUserDto) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    return updatedUser;
  }

  // lấy bài viết của user
  async getUserPosts(userId: number) {
    const posts = await this.prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return posts;
  }

  // lấy danh sách người theo dõi của user
  async getUserFollowers(userId: number) {
    if (!userId || isNaN(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    const followers = await this.prisma.userFollow.findMany({
      where: { followingId: userId },
      include: { follower: true },
    });
    return followers.map(f => f.follower);
  }

  // lấy danh sách người mà user đang theo dõi
  async getUserFollowing(userId: number) {
    if (!userId || isNaN(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    const following = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      include: { following: true },
    });
    return following.map(f => f.following);
  }

  // theo dõi một user
  async followUser(followerId: number, followingId: number) {
    const follow = await this.prisma.userFollow.create({
      data: {
        followerId,
        followingId,
      },
    });

    // Lưu notification vào database
    const notification = await this.prisma.notification.create({
      data: {
        userId: followingId,
        type: 'FOLLOW',
        content: 'Bạn có người theo dõi mới',
        refId: followerId,
      },
    });

    // Gửi realtime notification qua WebSocket
    this.notificationGateway.sendNotification(followingId, notification);
  }

  // bỏ theo dõi một user
  async unfollowUser(followerId: number, followingId: number) {
    return this.prisma.userFollow.deleteMany({
      where: {
        followerId,
        followingId,
      },
    });
  }

  // kiểm tra xem user có đang follow user khác không
  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    if (!followerId || !followingId || isNaN(followerId) || isNaN(followingId)) {
      return false;
    }
    const follow = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
    return !!follow;
  }

  // hủy user đang theo dõi mình
  async removeFollower(followerId: number, followingId: number) {
    return this.prisma.userFollow.deleteMany({
      where: {
        followerId,
        followingId,
      },
    });
  }

  // xp
  async getMyXp(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        level: true,
        xp: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  // xp-logs
  async getMyXpLogs(userId: number) {
    return this.prisma.xPLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // thêm XP cho user
  async addXP(
    userId: number,
    action: 'POST' | 'COMMENT' | 'LIKE_RECEIVED',
    value: number,
  ) {
    // Tạo XP log
    await this.prisma.xPLog.create({
      data: {
        userId,
        action,
        value,
      },
    });

    // Cập nhật XP của user
    let user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        xp: {
          increment: value,
        },
      },
      select: {
        xp: true,
        level: true,
      },
    });

    // Đảm bảo XP không bao giờ nhỏ hơn 0
    if (user.xp < 0) {
      user = await this.prisma.user.update({
        where: { id: userId },
        data: { xp: 0 },
        select: {
          xp: true,
          level: true,
        },
      });
    }

    // Tính toán level (mỗi 1000 XP = 1 level)
    const newLevel = Math.floor(Math.max(0, user.xp) / 1000) + 1;
    if (newLevel !== user.level) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { level: newLevel },
      });
    }

    return user;
  }

  // badges
  async getUserBadges(userId: number) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: true,
      },
      orderBy: {
        earnedAt: 'asc',
      },
    });
  }

  // xoá ảnh đại diện cũ trên Cloudinary
  async deleteAvatar(avatarUrl: string) {
    const publicId = this.extractPublicIdFromUrl(avatarUrl);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  }

  // xoá ảnh đại diện cũ trên Cloudinary (chỉ nếu URL từ Cloudinary)
  async deleteAvatarIfCloudinary(avatarUrl: string) {
    // Chỉ xóa nếu URL từ Cloudinary (chứa 'cloudinary.com' hoặc 'res.cloudinary.com')
    if (avatarUrl && (avatarUrl.includes('cloudinary.com') || avatarUrl.includes('res.cloudinary.com'))) {
      try {
        await this.deleteAvatar(avatarUrl);
      } catch (error) {
        // Bỏ qua lỗi nếu không thể xóa (có thể ảnh đã bị xóa hoặc không tồn tại)
        console.warn('Không thể xóa avatar cũ trên Cloudinary:', error);
      }
    }
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

  // ==================== ADMIN METHODS ====================

  // Lấy thống kê dashboard
  async getDashboardStats() {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Basic counts
    const [
      totalUsers,
      totalPosts,
      totalComments,
      pendingReports,
      newUsersThisWeek,
      newUsersThisMonth,
      postsThisWeek,
      commentsThisWeek,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.post.count({ where: { isDraft: false } }),
      this.prisma.comment.count(),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: oneMonthAgo } } }),
      this.prisma.post.count({ 
        where: { 
          createdAt: { gte: oneWeekAgo },
          isDraft: false 
        } 
      }),
      this.prisma.comment.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    ]);

    // Post statistics by type
    const postsByType = await this.prisma.post.groupBy({
      by: ['type'],
      where: { isDraft: false },
      _count: true,
    });

    // Post statistics by status
    const postsByStatus = await this.prisma.post.groupBy({
      by: ['status'],
      where: { isDraft: false },
      _count: true,
    });

    // Comment statistics by category
    const commentsByCategory = await this.prisma.comment.groupBy({
      by: ['category'],
      _count: true,
    });

    // Top users by XP (exclude ADMIN)
    const topUsers = await this.prisma.user.findMany({
      where: {
        role: 'USER',
      },
      take: 10,
      orderBy: { xp: 'desc' },
      select: {
        id: true,
        fullName: true,
        userName: true,
        avatarUrl: true,
        xp: true,
        level: true,
        _count: {
          select: {
            posts: true,
            comments: true,
          },
        },
      },
    });

    // User growth (last 30 days)
    const userGrowth = await this.prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*)::int as count
      FROM "User"
      WHERE "createdAt" >= ${oneMonthAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Post activity (last 30 days)
    const postActivity = await this.prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*)::int as count
      FROM "Post"
      WHERE "createdAt" >= ${oneMonthAgo}
        AND "isDraft" = false
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Engagement stats
    const [totalLikes, totalViews, totalBookmarks] = await Promise.all([
      this.prisma.postLike.count(),
      this.prisma.postView.count(),
      this.prisma.bookmark.count(),
    ]);

    // Report statistics by status
    const reportsByStatus = await this.prisma.report.groupBy({
      by: ['status'],
      _count: true,
    });

    return {
      overview: {
        totalUsers,
        totalPosts,
        totalComments,
        pendingReports,
        newUsersThisWeek,
        newUsersThisMonth,
        postsThisWeek,
        commentsThisWeek,
      },
      posts: {
        byType: postsByType,
        byStatus: postsByStatus,
      },
      comments: {
        byCategory: commentsByCategory,
      },
      engagement: {
        totalLikes,
        totalViews,
        totalBookmarks,
      },
      reports: {
        byStatus: reportsByStatus,
      },
      topUsers,
      charts: {
        userGrowth,
        postActivity,
      },
    };
  }

  // Lấy danh sách tất cả users với pagination, search, filter
  async getAllUsers(query: {
    search?: string;
    role?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, role } = query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Search by name, username, email
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { userName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by role
    if (role && role !== 'ALL') {
      where.role = role;
    } else {
      // Không hiển thị ADMIN trong danh sách
      where.role = 'USER';
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          userName: true,
          email: true,
          role: true,
          avatarUrl: true,
          level: true,
          xp: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              posts: true,
              comments: true,
              followsFrom: true,
              followsTo: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Lấy thống kê chi tiết của user
  async getUserStats(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            posts: true,
            comments: true,
            likes: true,
            followsFrom: true,
            followsTo: true,
            reports: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      fullName: user.fullName,
      userName: user.userName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      level: user.level,
      xp: user.xp,
      createdAt: user.createdAt,
      stats: {
        totalPosts: user._count.posts,
        totalComments: user._count.comments,
        totalLikes: user._count.likes,
        followers: user._count.followsTo,
        following: user._count.followsFrom,
        reports: user._count.reports,
      },
    };
  }

  // Xóa user (soft delete hoặc hard delete)
  async deleteUser(userId: number) {
    // Hard delete
    return this.prisma.user.delete({
      where: { id: userId },
    });
  }

  // Lấy danh sách "những người bạn có thể biết"
  async getSuggestedFriends(userId: number, limit: number = 20) {
    // Lấy danh sách những người user đang follow và đã follow user
    const [following, followers] = await Promise.all([
      this.prisma.userFollow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      }),
      this.prisma.userFollow.findMany({
        where: { followingId: userId },
        select: { followerId: true },
      }),
    ]);

    const followingIds = new Set(following.map((f) => f.followingId));
    const followerIds = new Set(followers.map((f) => f.followerId));
    const excludedIds = Array.from(new Set([userId, ...followingIds, ...followerIds]));

    // 1. Tìm bạn chung (mutual friends) - những người mà cả user và suggested user đều follow
    const userFollowing = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const userFollowingIds = userFollowing.map((f) => f.followingId);
    let mutualFriends: Array<{ suggested_user_id: number; mutual_friends_count: number }> = [];

    if (userFollowingIds.length > 0) {
      const mutualFriendsData = await this.prisma.userFollow.findMany({
        where: {
          followerId: { in: userFollowingIds },
          followingId: {
            notIn: excludedIds,
          },
        },
        select: {
          followingId: true,
          followerId: true,
        },
      });

      // Đếm số bạn chung cho mỗi suggested user
      const mutualCountMap = new Map<number, Set<number>>();
      mutualFriendsData.forEach((mf) => {
        if (!mutualCountMap.has(mf.followingId)) {
          mutualCountMap.set(mf.followingId, new Set());
        }
        mutualCountMap.get(mf.followingId)!.add(mf.followerId);
      });

      mutualFriends = Array.from(mutualCountMap.entries()).map(([suggestedUserId, mutualSet]) => ({
        suggested_user_id: suggestedUserId,
        mutual_friends_count: mutualSet.size,
      }));
    }

    // 2. Tìm những người follow cùng tags
    const userTags = await this.prisma.tagFollow.findMany({
      where: { userId },
      select: { tagId: true },
    });

    const userTagIds = userTags.map((t) => t.tagId);
    let commonTagsUsers: Array<{ suggested_user_id: number; common_tags_count: number }> = [];

    if (userTagIds.length > 0) {
      const commonTagsData = await this.prisma.tagFollow.findMany({
        where: {
          tagId: { in: userTagIds },
          userId: {
            notIn: excludedIds,
          },
        },
        select: {
          userId: true,
          tagId: true,
        },
      });

      // Đếm số tags chung cho mỗi user
      const tagsCountMap = new Map<number, Set<number>>();
      commonTagsData.forEach((ct) => {
        if (!tagsCountMap.has(ct.userId)) {
          tagsCountMap.set(ct.userId, new Set());
        }
        tagsCountMap.get(ct.userId)!.add(ct.tagId);
      });

      commonTagsUsers = Array.from(tagsCountMap.entries()).map(([suggestedUserId, tagsSet]) => ({
        suggested_user_id: suggestedUserId,
        common_tags_count: tagsSet.size,
      }));
    }

    // 3. Tìm những người tương tác trên cùng posts (like hoặc comment)
    const userPosts = await this.prisma.post.findMany({
      where: { userId },
      select: { id: true },
    });

    const userPostIds = userPosts.map((p) => p.id);
    let commonInteractionsUsers: Array<{ suggested_user_id: number; interaction_score: number }> = [];

    if (userPostIds.length > 0) {
      const [postLikes, postComments] = await Promise.all([
        this.prisma.postLike.findMany({
          where: {
            postId: { in: userPostIds },
            userId: { notIn: excludedIds },
          },
          select: {
            userId: true,
            postId: true,
          },
        }),
        this.prisma.comment.findMany({
          where: {
            postId: { in: userPostIds },
            userId: { notIn: excludedIds },
          },
          select: {
            userId: true,
            postId: true,
          },
        }),
      ]);

      // Đếm số posts tương tác cho mỗi user
      const interactionsMap = new Map<number, Set<number>>();
      [...postLikes, ...postComments].forEach((interaction) => {
        if (!interactionsMap.has(interaction.userId)) {
          interactionsMap.set(interaction.userId, new Set());
        }
        interactionsMap.get(interaction.userId)!.add(interaction.postId);
      });

      commonInteractionsUsers = Array.from(interactionsMap.entries()).map(([suggestedUserId, postsSet]) => ({
        suggested_user_id: suggestedUserId,
        interaction_score: postsSet.size,
      }));
    }

    // 4. Tính điểm và gộp kết quả
    const scoreMap = new Map<number, {
      mutualFriends: number;
      commonTags: number;
      interactions: number;
      totalScore: number;
    }>();

    // Điểm cho mutual friends (trọng số cao nhất: 10 điểm mỗi bạn chung)
    mutualFriends.forEach((mf) => {
      const suggestedUserId = mf.suggested_user_id;
      const count = mf.mutual_friends_count;
      if (!scoreMap.has(suggestedUserId)) {
        scoreMap.set(suggestedUserId, { mutualFriends: 0, commonTags: 0, interactions: 0, totalScore: 0 });
      }
      const score = scoreMap.get(suggestedUserId)!;
      score.mutualFriends = count;
      score.totalScore += count * 10;
    });

    // Điểm cho common tags (trọng số: 5 điểm mỗi tag chung)
    commonTagsUsers.forEach((ct) => {
      const suggestedUserId = ct.suggested_user_id;
      const count = ct.common_tags_count;
      if (!scoreMap.has(suggestedUserId)) {
        scoreMap.set(suggestedUserId, { mutualFriends: 0, commonTags: 0, interactions: 0, totalScore: 0 });
      }
      const score = scoreMap.get(suggestedUserId)!;
      score.commonTags = count;
      score.totalScore += count * 5;
    });

    // Điểm cho interactions (trọng số: 2 điểm mỗi tương tác)
    commonInteractionsUsers.forEach((ci) => {
      const suggestedUserId = ci.suggested_user_id;
      const count = ci.interaction_score;
      if (!scoreMap.has(suggestedUserId)) {
        scoreMap.set(suggestedUserId, { mutualFriends: 0, commonTags: 0, interactions: 0, totalScore: 0 });
      }
      const score = scoreMap.get(suggestedUserId)!;
      score.interactions = count;
      score.totalScore += count * 2;
    });

    // 5. Sắp xếp theo điểm và lấy top users
    const suggestedUserIds = Array.from(scoreMap.entries())
      .sort((a, b) => b[1].totalScore - a[1].totalScore)
      .slice(0, limit)
      .map(([suggestedUserId]) => suggestedUserId);

    // 6. Nếu không đủ, thêm những user ngẫu nhiên mà user chưa follow
    if (suggestedUserIds.length < limit) {
      const neededCount = limit - suggestedUserIds.length;
      
      // Tạo danh sách excluded IDs bao gồm cả những user đã được suggest
      const allExcludedIds = [...excludedIds, ...suggestedUserIds];
      
      // Lấy tất cả user IDs phù hợp
      const allAvailableUsers = await this.prisma.user.findMany({
        where: {
          id: { notIn: allExcludedIds },
          role: 'USER',
        },
        select: { id: true },
      });

      // Shuffle ngẫu nhiên và lấy số lượng cần thiết
      const availableIds = allAvailableUsers.map((u) => u.id);
      // Fisher-Yates shuffle algorithm
      for (let i = availableIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableIds[i], availableIds[j]] = [availableIds[j], availableIds[i]];
      }

      const randomUsers = availableIds.slice(0, neededCount);
      suggestedUserIds.push(...randomUsers);
    }

    // 7. Lấy thông tin chi tiết của suggested users
    const suggestedUsers = await this.prisma.user.findMany({
      where: {
        id: { in: suggestedUserIds },
      },
      select: {
        id: true,
        fullName: true,
        userName: true,
        email: true,
        avatarUrl: true,
        bio: true,
        level: true,
        xp: true,
        _count: {
          select: {
            posts: true,
            followsFrom: true,
            followsTo: true,
          },
        },
      },
    });

    // 8. Sắp xếp lại theo thứ tự điểm số và thêm thông tin điểm
    // Đảm bảo loại bỏ những người đã follow (double check để chắc chắn)
    const result = suggestedUserIds
      .filter((id) => !followingIds.has(id)) // Loại bỏ những người đã follow
      .map((id) => {
        const user = suggestedUsers.find((u) => u.id === id);
        if (!user) return null;
        const score = scoreMap.get(id) || { mutualFriends: 0, commonTags: 0, interactions: 0, totalScore: 0 };
        return {
          ...user,
          suggestionScore: {
            mutualFriends: score.mutualFriends,
            commonTags: score.commonTags,
            interactions: score.interactions,
            totalScore: score.totalScore,
          },
        };
      })
      .filter((u) => u !== null);

    return result;
  }
}
