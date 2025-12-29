import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PostContentFormat,
  PostStatus,
  PostVisibility,
  Prisma,
} from '@prisma/client';
import { NotificationGateway } from 'src/utils/notification.gateway';
import { v2 as cloudinary } from 'cloudinary';
import { UserService } from '../user/user.service';
import { getDefaultPollThumbnail } from 'src/utils/poll-thumbnails';

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private notificationGateway: NotificationGateway,
    private userService: UserService,
  ) {}

  private validateContentJsonSize(
    contentJson: Record<string, any>,
    maxBytes = 200_000,
  ) {
    // Xấp xỉ byte-length. Với JSON ASCII là khá sát; unicode có thể lớn hơn một chút.
    const size = Buffer.byteLength(JSON.stringify(contentJson), 'utf8');
    if (size > maxBytes) {
      throw new BadRequestException(
        `contentJson quá lớn (${size} bytes). Giới hạn: ${maxBytes} bytes.`,
      );
    }
  }

  /**
   * Kiểm tra xem viewer có quyền xem post này không
   */
  private async canViewPost(
    post: {
      visibility: PostVisibility;
      userId: number;
    },
    viewerId?: number,
  ): Promise<boolean> {
    // PUBLIC và ANONYMOUS: ai cũng xem được
    if (
      post.visibility === PostVisibility.PUBLIC ||
      post.visibility === PostVisibility.ANONYMOUS
    ) {
      return true;
    }

    // Chưa đăng nhập: không xem được PRIVATE và FOLLOWERS
    if (!viewerId) {
      return false;
    }

    // Chủ post: luôn xem được post của mình
    if (post.userId === viewerId) {
      return true;
    }

    // PRIVATE: chỉ chủ post xem được
    if (post.visibility === PostVisibility.PRIVATE) {
      return false;
    }

    // FOLLOWERS: chỉ followers xem được
    if (post.visibility === PostVisibility.FOLLOWERS) {
      return this.isFollowing(viewerId, post.userId);
    }

    return false;
  }

  /**
   * Kiểm tra xem followerId có đang follow followingId không
   */
  private async isFollowing(
    followerId: number,
    followingId: number,
  ): Promise<boolean> {
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

  // tạo bài viết
  async create(
    userId: number,
    dto: CreatePostDto,
    files?: {
      thumbnail?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ) {
    let tagIds = dto.tagIds;
    // loại bỏ tag trùng
    if (tagIds) {
      // Đảm bảo tagIds là array trước khi dùng Set
      if (!Array.isArray(tagIds)) {
        tagIds = [tagIds];
      }
      tagIds = Array.from(new Set(tagIds));
    }

    if (dto.contentJson) {
      this.validateContentJsonSize(dto.contentJson);
    }

    const contentFormat = dto.contentJson
      ? PostContentFormat.TIPTAP_JSON
      : dto.content
        ? PostContentFormat.PLAIN_TEXT
        : PostContentFormat.TIPTAP_JSON;

    // Extract thumbnail URL from uploaded file
    let thumbnailUrl: string | undefined;
    if (files?.thumbnail && files.thumbnail.length > 0) {
      const thumbnailFile = files.thumbnail[0];
      thumbnailUrl =
        (thumbnailFile as any).path ||
        (thumbnailFile as any).url ||
        (thumbnailFile as any).secure_url;
    }

    // Auto-assign default thumbnail for POLL type if no thumbnail uploaded
    if (!thumbnailUrl && dto.type === 'POLL') {
      thumbnailUrl = getDefaultPollThumbnail();
    }

    // Get image URLs from CloudinaryStorage for content images
    const imageUrls: string[] = [];
    if (files?.images && files.images.length > 0) {
      for (const file of files.images) {
        const url =
          (file as any).path || (file as any).url || (file as any).secure_url;
        if (url) {
          imageUrls.push(url);
        }
      }
    }

    const post = await this.prisma.post.create({
      data: {
        userId,
        title: dto.title,
        content: dto.content,
        contentJson: dto.contentJson
          ? (dto.contentJson as Prisma.InputJsonValue)
          : undefined,
        contentText: dto.contentText ?? null,
        contentFormat,
        thumbnailUrl: thumbnailUrl ?? null,
        type: dto.type,
        visibility: dto.visibility ?? PostVisibility.PUBLIC,
        isDraft: dto.isDraft ?? false,
        status: PostStatus.VISIBLE,
        tags: tagIds
          ? {
              create: tagIds.map((tagId) => ({
                tagId,
              })),
            }
          : undefined,
      },
      include: {
        tags: { include: { tag: true } },
      },
    });

    // Create images if URLs provided
    if (imageUrls.length > 0) {
      await this.prisma.image.createMany({
        data: imageUrls.map((url) => ({
          url,
          type: 'POST',
          entityId: post.id,
          postId: post.id,
        })),
      });
    }

    let poll: any = null;
    if (dto.poll) {
      poll = await this.createPoll(post.id, userId, dto.poll);
    }

    // gửi thông báo đến followers nếu không phải draft
    if (!post.isDraft) {
      const followers = await this.prisma.userFollow.findMany({
        where: { followingId: userId },
        select: { followerId: true },
      });

      const notifications = await Promise.all(
        followers.map((follower) =>
          this.prisma.notification.create({
            data: {
              userId: follower.followerId,
              type: 'NEW_POST',
              content: 'Người bạn theo dõi vừa đăng bài viết mới',
              refId: post.id,
            },
          }),
        ),
      );

      for (const notification of notifications) {
        this.notificationGateway.sendNotification(
          notification.userId,
          notification,
        );
      }
    }

    // Fetch post with images
    const postWithImages = await this.prisma.post.findUnique({
      where: { id: post.id },
      include: {
        tags: { include: { tag: true } },
        images: true,
      },
    });

    // Cộng 100 điểm cho user khi đăng bài (nếu không phải draft)
    if (!post.isDraft) {
      await this.userService.addXP(userId, 'POST', 100);
    }

    return {
      ...postWithImages,
      poll,
    };
  }

  // cập nhật bài viết
  async update(postId: number, userId: number, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({ 
      where: { id: postId },
      include: { poll: { include: { options: true } } }
    });
    if (!post) throw new NotFoundException();
    if (post.userId !== userId) throw new ForbiddenException();

    // lưu lịch sử chỉnh sửa
    await this.prisma.postEditHistory.create({
      data: {
        postId,
        oldContent: post.content,
      },
    });

    if (dto.contentJson) {
      this.validateContentJsonSize(dto.contentJson);
    }

    // Loại bỏ các trường không thuộc bảng Post
    const { poll, tagIds, ...rest } = dto;

    let nextContentFormat: PostContentFormat | undefined = undefined;
    if (dto.contentJson !== undefined || dto.content !== undefined) {
      const willUseJson =
        dto.contentJson !== undefined ? !!dto.contentJson : !!post.contentJson;
      const willUseLegacy =
        dto.content !== undefined ? !!dto.content : !!post.content;
      nextContentFormat = willUseJson
        ? PostContentFormat.TIPTAP_JSON
        : willUseLegacy
          ? PostContentFormat.PLAIN_TEXT
          : PostContentFormat.TIPTAP_JSON;
    }

    const normalizedTagIds = tagIds ? Array.from(new Set(tagIds)) : undefined;

    // Update post
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        ...rest,
        contentJson:
          dto.contentJson === undefined
            ? undefined
            : (dto.contentJson as Prisma.InputJsonValue),
        contentText:
          dto.contentText === undefined ? undefined : (dto.contentText ?? null),
        contentFormat: nextContentFormat,
        tags: normalizedTagIds
          ? {
              deleteMany: {},
              create: normalizedTagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
      },
    });

    // Update poll nếu có
    if (poll && post.poll) {
      const pollId = post.poll.id;
      
      // Post đã có poll, update options
      if (poll.options && poll.options.length >= 2) {
        // Bước 1: Xóa tất cả votes của poll trước (vì votes reference đến options)
        await this.prisma.pollVote.deleteMany({
          where: {
            option: {
              pollId,
            },
          },
        });

        // Bước 2: Xóa tất cả options cũ
        await this.prisma.pollOption.deleteMany({
          where: { pollId },
        });

        // Bước 3: Tạo options mới
        await this.prisma.pollOption.createMany({
          data: poll.options.map((text) => ({
            pollId,
            text,
          })),
        });

        // Update expiresAt nếu có
        if (poll.expiresAt !== undefined) {
          await this.prisma.poll.update({
            where: { id: pollId },
            data: { expiresAt: poll.expiresAt },
          });
        }
      }
    } else if (poll && !post.poll && dto.type === 'POLL') {
      // Post chưa có poll nhưng được chuyển sang type POLL
      await this.createPoll(postId, userId, poll);
    }

    // Fetch lại post với poll mới
    return this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        tags: { include: { tag: true } },
        poll: { include: { options: true } },
      },
    });
  }

  async findAll(viewerId?: number) {
    // Tạo điều kiện where dựa trên viewerId
    const whereClause: any = {
      status: PostStatus.VISIBLE,
      isDraft: false,
    };

    if (!viewerId) {
      // Chưa đăng nhập: chỉ xem PUBLIC và ANONYMOUS
      whereClause.visibility = {
        in: [PostVisibility.PUBLIC, PostVisibility.ANONYMOUS],
      };
    } else {
      // Đã đăng nhập: xem PUBLIC, ANONYMOUS, posts của mình, và FOLLOWERS (nếu đang follow)
      whereClause.OR = [
        { visibility: PostVisibility.PUBLIC },
        { visibility: PostVisibility.ANONYMOUS },
        { userId: viewerId }, // Posts của mình (bao gồm cả PRIVATE)
        {
          visibility: PostVisibility.FOLLOWERS,
          user: {
            followsFrom: {
              some: { followerId: viewerId },
            },
          },
        },
      ];
    }

    return this.prisma.post.findMany({
      where: whereClause,
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
        bookmarks: true,
        tags: { include: { tag: true } },
        poll: { include: { options: true } },
      },
    });
  }

  //////////////////////////////////////////////////
  // FILTER POSTS BY TAGS WITH SORTING
  //////////////////////////////////////////////////

  async getPostsByTags(
    tagIds: number[],
    sortBy: 'recent' | 'likes' | 'views' = 'recent',
    skip: number = 0,
    take: number = 20,
    viewerId?: number,
  ) {
    // Tạo điều kiện where cho visibility
    const whereClause: any = {
      status: PostStatus.VISIBLE,
      isDraft: false,
      tags: {
        some: {
          tagId: {
            in: tagIds,
          },
        },
      },
    };

    if (!viewerId) {
      // Chưa đăng nhập: chỉ xem PUBLIC và ANONYMOUS
      whereClause.visibility = {
        in: [PostVisibility.PUBLIC, PostVisibility.ANONYMOUS],
      };
    } else {
      // Đã đăng nhập: xem PUBLIC, ANONYMOUS, posts của mình, và FOLLOWERS (nếu đang follow)
      whereClause.OR = [
        { visibility: PostVisibility.PUBLIC },
        { visibility: PostVisibility.ANONYMOUS },
        { userId: viewerId },
        {
          visibility: PostVisibility.FOLLOWERS,
          user: {
            followsFrom: {
              some: { followerId: viewerId },
            },
          },
        },
      ];
    }

    // Xác định cách sắp xếp
    let orderBy: any = { createdAt: 'desc' }; // default: recent
    if (sortBy === 'likes') {
      orderBy = { likes: { _count: 'desc' } };
    } else if (sortBy === 'views') {
      orderBy = { views: { _count: 'desc' } };
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: whereClause,
        orderBy,
        skip,
        take,
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
          bookmarks: true,
          tags: { include: { tag: true } },
          poll: { include: { options: true } },
          _count: {
            select: {
              likes: true,
              views: true,
              comments: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where: whereClause }),
    ]);

    return {
      posts,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  //////////////////////////////////////////////////
  // GET POSTS FROM FOLLOWING USERS (FEED)
  //////////////////////////////////////////////////

  async getFollowingFeed(
    userId: number,
    skip: number = 0,
    take: number = 20,
  ) {
    // Lấy danh sách users mà userId đang follow
    const following = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);

    // Nếu không follow ai, trả về empty
    if (followingIds.length === 0) {
      return {
        posts: [],
        total: 0,
        skip,
        take,
        hasMore: false,
      };
    }

    // Lấy posts từ những người đang follow
    const whereClause: any = {
      userId: { in: followingIds },
      status: PostStatus.VISIBLE,
      isDraft: false,
      visibility: {
        in: [
          PostVisibility.PUBLIC,
          PostVisibility.FOLLOWERS,
          PostVisibility.ANONYMOUS,
        ],
      },
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
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
          bookmarks: true,
          tags: { include: { tag: true } },
          poll: { include: { options: true } },
          _count: {
            select: {
              likes: true,
              views: true,
              comments: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where: whereClause }),
    ]);

    return {
      posts,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
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
        bookmarks: true,
        tags: { include: { tag: true } },
        poll: { include: { options: true } },
      },
    });
    
    if (!post || post.status !== PostStatus.VISIBLE || post.isDraft) {
      throw new NotFoundException('Post not found or not visible');
    }

    // Kiểm tra quyền xem post
    const canView = await this.canViewPost(post, viewerId);
    if (!canView) {
      throw new ForbiddenException(
        'You do not have permission to view this post',
      );
    }

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
    });
  }

  async restore(postId: number, userId: number) {
    return this.prisma.post.update({
      where: { id: postId, userId },
      data: {
        status: PostStatus.VISIBLE,
        deletedAt: null,
      },
    });
  }

  async getDeletedPosts(userId: number) {
    return this.prisma.post.findMany({
      where: {
        userId,
        status: PostStatus.DELETED,
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
    const post = await this.prisma.post.findUnique({
      where: { id: postId, userId },
      include: { images: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    // Delete thumbnail from Cloudinary if exists
    if (post.thumbnailUrl) {
      try {
        const publicId = this.extractPublicIdFromUrl(post.thumbnailUrl);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (error) {
        console.error('Error deleting thumbnail from Cloudinary:', error);
      }
    }

    // Delete images from Cloudinary
    if (post.images && post.images.length > 0) {
      for (const image of post.images) {
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

    // Delete related records first (to avoid foreign key constraint errors)
    // Note: onDelete: Cascade đã được thiết lập trong schema nên không cần xóa thủ công
    // nhưng vẫn giữ lại để đảm bảo xóa Notification (không có cascade)
    await this.prisma.$transaction([
      // Delete notifications related to this post
      this.prisma.notification.deleteMany({
        where: { refId: postId, type: { in: ['POST_LIKE', 'POST_COMMENT'] } },
      }),
      // Finally delete the post - cascade sẽ tự động xóa các bảng liên quan:
      // PostLike, PostTag, PostEditHistory, Comment, CommentVote, Poll, PollOption, PollVote,
      // Bookmark, PostView, Image, Report
      this.prisma.post.delete({
        where: { id: postId },
      }),
    ]);

    return { message: 'Post deleted successfully' };
  }

  // like & unlike bài viết
  async like(postId: number, userId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    const like = await this.prisma.postLike.create({
      data: {
        postId,
        userId,
      },
    });

    // Chỉ gửi thông báo nếu người like khác chủ bài viết
    if (post.userId !== userId) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: post.userId,
          type: 'POST_LIKE',
          content: 'Có người thích bài viết của bạn',
          refId: postId,
        },
      });

      // Gửi socket realtime
      this.notificationGateway.sendLike(post.userId, notification);

      // Cộng 5 điểm cho chủ bài viết
      await this.userService.addXP(post.userId, 'LIKE_RECEIVED', 5);
    }

    return like;
  }

  async unlike(postId: number, userId: number) {
    // Lấy thông tin post để biết chủ bài viết
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    // Xóa like
    const result = await this.prisma.postLike.delete({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    // Chỉ trừ XP nếu người unlike khác chủ bài viết
    if (post.userId !== userId) {
      await this.userService.addXP(post.userId, 'LIKE_RECEIVED', -5);
    }

    return result;
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
  async commentOnPost(
    postId: number,
    userId: number,
    content: string,
    parentId?: number,
    isAnonymous?: boolean,
    files?: Express.Multer.File[],
  ) {
    const post = await this.prisma.post.findUnique({
      where: {
        id: postId,
      },
    });

    if (!post || post.status !== PostStatus.VISIBLE || post.isDraft)
      throw new NotFoundException('Post not found or not visible');

    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment || parentComment.postId !== postId) {
        throw new NotFoundException('Parent comment not found');
      }
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
    const comment = await this.prisma.comment.create({
      data: {
        postId,
        userId,
        content,
        parentId,
        isAnonymous: isAnonymous ?? false,
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
          entityId: comment.id,
          commentId: comment.id,
        })),
      });
    }

    // Fetch lại comment với images
    const commentWithImages = await this.prisma.comment.findUnique({
      where: { id: comment.id },
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

    // Chỉ gửi thông báo nếu người comment khác chủ bài viết
    if (post.userId !== userId) {
      // Lưu thông báo vào database
      const notification = await this.prisma.notification.create({
        data: {
          userId: post.userId,
          type: 'POST_COMMENT',
          content: 'Có bình luận mới trên bài viết của bạn',
          refId: post.id,
        },
      });

      // Gửi socket realtime
      this.notificationGateway.sendComment(post.userId, notification);

      // Cộng 2 điểm cho chủ bài viết
      await this.userService.addXP(post.userId, 'COMMENT', 2);
    }

    // Broadcast real-time comment to all users viewing this post
    // Include displayName and isOwner metadata
    if (!commentWithImages) {
      throw new NotFoundException('Comment not found after creation');
    }

    const commentWithMeta = {
      ...commentWithImages,
      images: commentWithImages.images.map((img) => img.url),
      isOwner: false, // FE sẽ tự xác định dựa vào userId
      displayName: commentWithImages.isAnonymous
        ? 'Ẩn danh'
        : commentWithImages.user?.fullName || 'Unknown',
      voteCounts: {
        upvotes: 0,
        downvotes: 0,
        total: 0,
      },
    };
    this.notificationGateway.emitNewComment(postId, commentWithMeta);

    return commentWithImages;
  }

  // lấy bình luận của bài viết
  async getComments(
    postId: number,
    skip: number = 0,
    take: number = 5,
    sort: 'oldest' | 'newest' | 'score' = 'score',
    viewerId?: number,
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post not found');

    // Xác định orderBy dựa trên sort
    let orderBy: any;
    if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sort === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else {
      // sort === 'score': không sort ở DB, sẽ sort sau khi tính voteCounts
      orderBy = { createdAt: 'desc' }; // Tạm lấy mới nhất trước
    }

    // Lấy tất cả votes của viewer (nếu có) cho các comments trong post này
    const viewerVotes = viewerId
      ? await this.prisma.commentVote.findMany({
          where: {
            userId: viewerId,
            comment: {
              postId,
            },
          },
          select: {
            commentId: true,
            type: true,
          },
        })
      : [];

    // Tạo map để tra cứu nhanh vote của viewer
    const viewerVoteMap = new Map(
      viewerVotes.map((v) => [v.commentId, v.type]),
    );

    const [comments, totalRootComments, totalAllComments] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          postId,
          parentId: null,
        },
        skip,
        take,
        orderBy,
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
          _count: {
            select: {
              votes: true,
              replies: true,
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
              votes: true,
              images: {
                select: {
                  id: true,
                  url: true,
                },
              },
              _count: {
                select: {
                  votes: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.comment.count({
        where: {
          postId,
          parentId: null,
        },
      }),
      this.prisma.comment.count({
        where: {
          postId,
        },
      }),
    ]);

    // Calculate vote counts + displayName + isOwner
    const commentsWithMetadata = comments.map((comment) => {
      const upvotes = comment.votes.filter((v) => v.type === 'UP').length;
      const downvotes = comment.votes.filter((v) => v.type === 'DOWN').length;
      const voteTotal = upvotes - downvotes;

      const isOwner = viewerId === comment.userId;
      const displayName = isOwner
        ? 'Bạn'
        : comment.isAnonymous
          ? 'Ẩn danh'
          : comment.user?.fullName || 'Unknown';

      // Lấy vote của viewer cho comment này
      const viewerVoteType = viewerVoteMap.get(comment.id);
      const userVote = viewerVoteType
        ? viewerVoteType === 'UP'
          ? 'up'
          : 'down'
        : null;

      return {
        ...comment,
        images: comment.images?.map((img) => img.url) || [],
        isOwner,
        displayName,
        voteCounts: {
          upvotes,
          downvotes,
          total: voteTotal,
        },
        userVote,
        hasUpvoted: userVote === 'up',
        hasDownvoted: userVote === 'down',
        replies: comment.replies.map((reply) => {
          const replyUpvotes = reply.votes.filter(
            (v) => v.type === 'UP',
          ).length;
          const replyDownvotes = reply.votes.filter(
            (v) => v.type === 'DOWN',
          ).length;
          const replyVoteTotal = replyUpvotes - replyDownvotes;

          const replyIsOwner = viewerId === reply.userId;
          const replyDisplayName = replyIsOwner
            ? 'Bạn'
            : reply.isAnonymous
              ? 'Ẩn danh'
              : reply.user?.fullName || 'Unknown';

          // Lấy vote của viewer cho reply này
          const replyViewerVoteType = viewerVoteMap.get(reply.id);
          const replyUserVote = replyViewerVoteType
            ? replyViewerVoteType === 'UP'
              ? 'up'
              : 'down'
            : null;

          return {
            ...reply,
            images: reply.images?.map((img) => img.url) || [],
            isOwner: replyIsOwner,
            displayName: replyDisplayName,
            voteCounts: {
              upvotes: replyUpvotes,
              downvotes: replyDownvotes,
              total: replyVoteTotal,
            },
            userVote: replyUserVote,
            hasUpvoted: replyUserVote === 'up',
            hasDownvoted: replyUserVote === 'down',
          };
        }),
      };
    });

    // Sort by score nếu cần
    if (sort === 'score') {
      commentsWithMetadata.sort(
        (a, b) => b.voteCounts.total - a.voteCounts.total,
      );
    }

    return {
      comments: commentsWithMetadata,
      pagination: {
        total: totalRootComments, // Tổng comment gốc (dùng cho pagination)
        totalComments: totalAllComments, // ✅ Tổng TẤT CẢ comments (gốc + reply)
        skip,
        take,
        hasMore: skip + take < totalRootComments,
      },
    };
  }

  // lấy số lượng bình luận của bài viết
  async getCommentCount(postId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post not found');

    // ✅ Đếm tất cả comments (gốc + reply)
    return this.prisma.comment.count({
      where: {
        postId,
      },
    });
  }

  // bookmark bài viết
  async bookmark(postId: number, userId: number, collectionId?: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
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
          create: dto.options.map((text) => ({ text })),
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
    
    // Nếu đang publish draft (từ isDraft: true -> false)
    const isPublishing = post.isDraft && !isDraft;
    
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        isDraft,
        // Cập nhật createdAt thành thời điểm publish nếu đang publish draft
        ...(isPublishing && { createdAt: new Date() }),
      },
    });

    // Gửi thông báo đến followers khi publish draft
    if (isPublishing) {
      const followers = await this.prisma.userFollow.findMany({
        where: { followingId: userId },
        select: { followerId: true },
      });

      const notifications = await Promise.all(
        followers.map((follower) =>
          this.prisma.notification.create({
            data: {
              userId: follower.followerId,
              type: 'NEW_POST',
              content: 'Người bạn theo dõi vừa đăng bài viết mới',
              refId: post.id,
            },
          }),
        ),
      );

      for (const notification of notifications) {
        this.notificationGateway.sendNotification(
          notification.userId,
          notification,
        );
      }

      // Cộng 100 điểm cho user khi publish draft
      await this.userService.addXP(userId, 'POST', 100);
    }

    return updatedPost;
  }

  // update visibility
  async updateVisibility(
    postId: number,
    userId: number,
    visibility: PostVisibility,
  ) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException();
    if (post.userId !== userId) throw new ForbiddenException();
    return this.prisma.post.update({
      where: { id: postId },
      data: { visibility },
    });
  }

  // lấy bài viết của 1 users khi xem profile
  async getPostsByUser(userId: number, viewerId?: number) {
    // Tạo điều kiện where dựa trên viewerId
    const whereClause: any = {
      userId,
      status: PostStatus.VISIBLE,
      isDraft: false,
    };

    if (!viewerId || viewerId !== userId) {
      // Không phải chủ profile hoặc chưa đăng nhập
      if (!viewerId) {
        // Chưa đăng nhập: chỉ xem PUBLIC và ANONYMOUS
        whereClause.visibility = {
          in: [PostVisibility.PUBLIC, PostVisibility.ANONYMOUS],
        };
      } else {
        // Đã đăng nhập nhưng không phải chủ: xem PUBLIC, ANONYMOUS, và FOLLOWERS (nếu đang follow)
        const isFollower = await this.isFollowing(viewerId, userId);
        if (isFollower) {
          whereClause.visibility = {
            in: [
              PostVisibility.PUBLIC,
              PostVisibility.ANONYMOUS,
              PostVisibility.FOLLOWERS,
            ],
          };
        } else {
          whereClause.visibility = {
            in: [PostVisibility.PUBLIC, PostVisibility.ANONYMOUS],
          };
        }
      }
    }
    // Nếu viewerId === userId: xem tất cả posts (không thêm điều kiện visibility)

    return this.prisma.post.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        likes: true,
        comments: true,
        tags: { include: { tag: true } },
        poll: { include: { options: true } },
      },
    });
  }

  // lấy số lượt xem của bài viết
  async getViewCount(postId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post not found');

    const totalViews = await this.prisma.postView.count({
      where: { postId },
    });

    const uniqueViews = await this.prisma.postView.groupBy({
      by: ['userId'],
      where: {
        postId,
        userId: { not: null },
      },
    });

    const anonymousViews = await this.prisma.postView.count({
      where: {
        postId,
        userId: null,
      },
    });

    return {
      totalViews,
      uniqueViews: uniqueViews.length,
      anonymousViews,
    };
  }

  // lấy danh sách người đã xem bài viết (chỉ user đã đăng nhập)
  async getViewDetails(postId: number, limit: number = 20) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post not found');

    // Lấy danh sách người xem (distinct by userId) với thông tin user
    const views = await this.prisma.postView.findMany({
      where: {
        postId,
        userId: { not: null },
      },
      distinct: ['userId'],
      take: limit,
      orderBy: { viewedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            userName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return views.map((view) => ({
      user: view.user,
      viewedAt: view.viewedAt,
    }));
  }

  // Đồng bộ danh sách ảnh của post
  async addImagesToPost(
    postId: number,
    userId: number,
    imageUrls: string[],
  ) {
    // Kiểm tra post có tồn tại không
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post không tồn tại');
    }

    // Kiểm tra quyền: chỉ tác giả post mới được cập nhật ảnh
    if (post.userId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật ảnh của post này',
      );
    }

    // Lấy danh sách ảnh hiện tại của post
    const existingImages = await this.prisma.image.findMany({
      where: {
        postId: postId,
        type: 'POST',
      },
      select: {
        id: true,
        url: true,
      },
    });

    // Tạo Set từ URL hiện tại và URL mới để so sánh
    const existingUrls = new Set(existingImages.map((img) => img.url));
    const newUrls = new Set(imageUrls);

    // Tìm những URL cần thêm (có trong mới nhưng không có trong cũ)
    const urlsToAdd = imageUrls.filter((url) => !existingUrls.has(url));

    // Tìm những URL cần xóa (có trong cũ nhưng không có trong mới)
    const urlsToDelete = existingImages
      .filter((img) => !newUrls.has(img.url))
      .map((img) => img.id);

    // Thêm những URL mới (bỏ qua những URL đã có)
    if (urlsToAdd.length > 0) {
      await this.prisma.image.createMany({
        data: urlsToAdd.map((url) => ({
          url,
          type: 'POST',
          entityId: postId,
          postId: postId,
          userId: userId,
        })),
      });
    }

    // Xóa những URL không còn trong danh sách mới
    if (urlsToDelete.length > 0) {
      await this.prisma.image.deleteMany({
        where: {
          id: {
            in: urlsToDelete,
          },
        },
      });
    }

    // Lấy lại post với danh sách ảnh đã cập nhật
    const postWithImages = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        images: true,
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Đảm bảo post tồn tại (đã kiểm tra ở trên nên không bao giờ null)
    if (!postWithImages) {
      throw new NotFoundException('Post không tồn tại');
    }

    return postWithImages;
  }

  // Lấy danh sách ảnh của một post
  async getPostImages(postId: number): Promise<string[]> {
    // Kiểm tra post có tồn tại không
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post không tồn tại');
    }

    // Lấy danh sách ảnh của post và chỉ trả về mảng các URL
    const images = await this.prisma.image.findMany({
      where: {
        postId: postId,
        type: 'POST',
      },
      select: {
        url: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Chỉ trả về mảng các link ảnh
    return images.map((image) => image.url);
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
