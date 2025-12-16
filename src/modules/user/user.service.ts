import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

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
    const followers = await this.prisma.userFollow.findMany({
      where: { followingId: userId },
      include: { follower: true },
    });
    return followers.map(f => f.follower);
  }

  // lấy danh sách người mà user đang theo dõi
  async getUserFollowing(userId: number) {
    const following = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      include: { following: true },
    });
    return following.map(f => f.following);
  }

  // theo dõi một user
  async followUser(followerId: number, followingId: number) {
    return this.prisma.userFollow.create({
      data: {
        followerId,
        followingId,
      },
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

}