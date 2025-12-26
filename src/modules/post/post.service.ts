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

  // tạo bài viết
  async create(
    userId: number,
    dto: CreatePostDto,
    files?: Array<Express.Multer.File>,
  ) {
    let tagIds = dto.tagIds;
    // loại bỏ tag trùng
    if (tagIds) {
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

    return this.prisma.post.update({
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
        bookmarks: true,
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
        bookmarks: true,
        tags: { include: { tag: true } },
        poll: { include: { options: true } },
      },
    });
    if (!post || post.status !== PostStatus.VISIBLE || post.isDraft)
      throw new NotFoundException('Post not found or not visible');

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
    await this.prisma.$transaction([
      // Delete post views
      this.prisma.postView.deleteMany({
        where: { postId },
      }),
      // Delete bookmarks
      this.prisma.bookmark.deleteMany({
        where: { postId },
      }),
      // Delete post likes
      this.prisma.postLike.deleteMany({
        where: { postId },
      }),
      // Delete notifications related to this post
      this.prisma.notification.deleteMany({
        where: { refId: postId, type: { in: ['POST_LIKE', 'POST_COMMENT'] } },
      }),
      // Delete images
      this.prisma.image.deleteMany({
        where: { postId },
      }),
      // Delete comments and their votes (cascade should handle this, but to be safe)
      this.prisma.commentVote.deleteMany({
        where: { comment: { postId } },
      }),
      this.prisma.comment.deleteMany({
        where: { postId },
      }),
      // Delete poll votes and options if exists
      this.prisma.pollOption.deleteMany({
        where: { poll: { postId } },
      }),
      this.prisma.poll.deleteMany({
        where: { postId },
      }),
      // Delete post tags
      this.prisma.postTag.deleteMany({
        where: { postId },
      }),
      // Delete post edit history
      this.prisma.postEditHistory.deleteMany({
        where: { postId },
      }),
      // Finally delete the post
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
    return this.prisma.post.update({
      where: { id: postId },
      data: { isDraft },
    });
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
