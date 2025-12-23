import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationGateway } from 'src/utils/notification.gateway';
import { v2 as cloudinary} from 'cloudinary';
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

    this.notificationGateway.sendNotification(followingId, {
      type: 'FOLLOW',
      content: 'Bạn có người theo dõi mới',
      refId: followerId,
    });
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
    const parts = avatarUrl.split('/');
    const publicIdWithExtension = parts.slice(7).join('/').split('.')[0]; 
    const publicId = publicIdWithExtension; 
    await cloudinary.uploader.destroy(publicId);
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
}