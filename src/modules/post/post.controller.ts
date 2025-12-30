import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  UseInterceptors,
  Logger,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';

import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { AddImagesToPostDto } from './dto/add-images-to-post.dto';
import { Posts } from './entities/post.entity';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { OptionalJwtAuthGuard } from '../../auth/guard/optional-jwt.guard';
import { PostVisibility } from '@prisma/client';
import { PollService } from '../poll/poll.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { postStorage, commentStorage } from '../../utils/cloudinary.storage';
import { UploadedFile } from '@nestjs/common';
import { ModerateRateLimit, RelaxedRateLimit } from '../../auth/decorator/throttle.decorator';

@ApiTags('Posts')
@ApiBearerAuth()
@Controller('post')
export class PostController {
  private readonly logger = new Logger(PostController.name);

  constructor(
    private readonly postService: PostService,
    private readonly pollService: PollService, // Inject PollService
  ) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post()
  @ModerateRateLimit() // 20 requests per minute
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'thumbnail', maxCount: 1 },
        { name: 'images', maxCount: 10 },
      ],
      { storage: postStorage },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tạo bài viết mới',
    description:
      'Tạo một bài viết mới với thumbnail (ảnh đại diện) và images (ảnh trong bài viết). Có thể là bài viết thường hoặc bài viết có poll. Tất cả các trường đều là optional.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Tiêu đề bài viết' },
        content: { type: 'string', example: 'Nội dung bài viết' },
        contentJson: { type: 'object', example: { type: 'doc', content: [] } },
        contentText: { type: 'string', example: 'Nội dung plain text' },
        visibility: { type: 'string', enum: ['PUBLIC', 'FOLLOWERS', 'PRIVATE', 'ANONYMOUS'], example: 'PUBLIC' },
        isDraft: { type: 'boolean', example: false },
        type: { type: 'string', enum: ['NORMAL', 'POLL'], example: 'NORMAL' },
        tagIds: { type: 'array', items: { type: 'number' }, example: [1, 2, 3] },
        poll: {
          type: 'object',
          properties: {
            options: { type: 'array', items: { type: 'string' }, example: ['Lựa chọn 1', 'Lựa chọn 2'] },
            expiresAt: { type: 'string', format: 'date-time', example: '2025-12-31T23:59:59Z' },
          },
          description: 'Thông tin poll (chỉ dùng khi type=POLL)',
        },
        thumbnail: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh đại diện/thumbnail của bài viết (1 ảnh)',
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Ảnh trong bài viết (tối đa 10 ảnh)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo bài viết thành công',
  })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async create(
    @Body() body: any,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
    @Req() req,
  ) {
    const dto: CreatePostDto = {
      content: body.content,
      title: body.title,
      visibility: body.visibility,
      isDraft: body.isDraft === 'true' || body.isDraft === true,
      type: body.type,
      tagIds: body.tagIds
        ? (() => {
            // Nếu đã là array, map to Number
            if (Array.isArray(body.tagIds)) {
              return body.tagIds.map(Number);
            }
            // Nếu là string, thử parse JSON
            if (typeof body.tagIds === 'string') {
              try {
                const parsed = JSON.parse(body.tagIds);
                // Nếu parse ra là array, map to Number
                if (Array.isArray(parsed)) {
                  return parsed.map(Number);
                }
                // Nếu parse ra là number, chuyển thành array
                return [Number(parsed)];
              } catch {
                // Nếu parse lỗi, coi như là một số đơn
                return [Number(body.tagIds)];
              }
            }
            // Nếu là number, chuyển thành array
            return [Number(body.tagIds)];
          })()
        : undefined,
      contentJson: body.contentJson
        ? typeof body.contentJson === 'string'
          ? JSON.parse(body.contentJson)
          : body.contentJson
        : undefined,
      contentText: body.contentText,
      poll: body.poll
        ? typeof body.poll === 'string'
          ? JSON.parse(body.poll)
          : body.poll
        : undefined,
    };
    const post = await this.postService.create(req.user.id, dto, files);
    return new Posts(post);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id')
  @ModerateRateLimit() // 20 requests per minute
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'thumbnail', maxCount: 1 },
        { name: 'images', maxCount: 10 },
      ],
      { storage: postStorage },
    ),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Cập nhật bài viết',
    description:
      'Cập nhật thông tin bài viết. Chỉ tác giả mới có thể cập nhật. Hỗ trợ cả JSON và multipart/form-data.',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiBody({ type: UpdatePostDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền cập nhật' })
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles()
    files?: {
      thumbnail?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
    @Req() req?,
  ) {
    // Parse poll data nếu có (giống như trong create endpoint)
    const dto: UpdatePostDto = {
      ...body,
      poll: body.poll
        ? typeof body.poll === 'string'
          ? JSON.parse(body.poll)
          : body.poll
        : undefined,
      contentJson: body.contentJson
        ? typeof body.contentJson === 'string'
          ? JSON.parse(body.contentJson)
          : body.contentJson
        : undefined,
      tagIds: body.tagIds
        ? (() => {
            if (Array.isArray(body.tagIds)) {
              return body.tagIds.map(Number);
            }
            if (typeof body.tagIds === 'string') {
              try {
                const parsed = JSON.parse(body.tagIds);
                if (Array.isArray(parsed)) {
                  return parsed.map(Number);
                }
                return [Number(parsed)];
              } catch {
                return [Number(body.tagIds)];
              }
            }
            return [Number(body.tagIds)];
          })()
        : undefined,
      isDraft: body.isDraft === 'true' || body.isDraft === true ? true : body.isDraft === 'false' || body.isDraft === false ? false : undefined,
    };
    
    // Update post (service sẽ xử lý poll update)
    const post = await this.postService.update(+id, req.user.id, dto, files);
    
    // Return đầy đủ poll data với options
    if (!post) {
      throw new BadRequestException('Post not found or update failed');
    }
    
    return {
      ...post,
      poll: post.poll
        ? {
            ...post.poll,
            options: post.poll.options || [],
          }
        : null,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('following-feed')
  @RelaxedRateLimit() // 200 requests per minute
  @ApiOperation({
    summary: 'Lấy bài viết từ những người mình follow',
    description:
      'Lấy danh sách bài viết từ những users mà người dùng hiện tại đang follow. ' +
      'Chỉ hiển thị bài viết PUBLIC, FOLLOWERS, và ANONYMOUS. ' +
      'Query params: skip, take',
  })
  @ApiResponse({ status: 200, description: 'Danh sách bài viết từ following users' })
  async getFollowingFeed(
    @Req() req,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const userId = req.user.id;
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 20;

    const result = await this.postService.getFollowingFeed(
      userId,
      skipNum,
      takeNum,
    );

    // Process posts with polls
    const processedPosts = await Promise.all(
      result.posts.map(async (post) => {
        let pollResult: any = null;
        let userVotedOptionId: number | null = null;

        if (post.type === 'POLL' && post.poll) {
          pollResult = await this.pollService.getResult(post.poll.id);

          if (userId) {
            userVotedOptionId = await this.pollService.getUserVote(post.poll.id, userId);
          }
        }

        return {
          ...new Posts(post),
          poll: post.poll,
          pollResult,
          userVotedOptionId,
        };
      }),
    );

    return {
      posts: processedPosts,
      total: result.total,
      skip: result.skip,
      take: result.take,
      hasMore: result.hasMore,
    };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách tất cả bài viết hoặc lọc theo tags',
    description:
      'Lấy tất cả bài viết công khai trong hệ thống. Nếu bài viết có poll, sẽ trả kèm kết quả poll. ' +
      'Có thể lọc theo tags và sắp xếp theo recent/likes/views. ' +
      'Query params: tagIds (comma-separated IDs), sortBy (recent|likes|views), skip, take',
  })
  @ApiResponse({ status: 200, description: 'Danh sách bài viết' })
  async findAll(
    @Req() req?,
    @Query('tagIds') tagIds?: string,
    @Query('sortBy') sortBy?: 'recent' | 'likes' | 'views',
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const viewerId = req?.user?.id;

    // Nếu có filter theo tags
    if (tagIds) {
      const tagIdArray = tagIds.split(',').map((id) => parseInt(id.trim(), 10));
      const skipNum = skip ? parseInt(skip, 10) : 0;
      const takeNum = take ? parseInt(take, 10) : 20;

      const result = await this.postService.getPostsByTags(
        tagIdArray,
        sortBy || 'recent',
        skipNum,
        takeNum,
        viewerId,
      );

      // Process posts with polls
      const processedPosts = await Promise.all(
        result.posts.map(async (post) => {
          let pollResult: any = null;
          let userVotedOptionId: number | null = null;

          if (post.type === 'POLL' && post.poll) {
            pollResult = await this.pollService.getResult(post.poll.id);

            if (viewerId) {
              userVotedOptionId = await this.pollService.getUserVote(post.poll.id, viewerId);
            }
          }

          return {
            ...new Posts(post),
            poll: post.poll,
            pollResult,
            userVotedOptionId,
          };
        }),
      );

      return {
        posts: processedPosts,
        total: result.total,
        skip: result.skip,
        take: result.take,
        hasMore: result.hasMore,
      };
    }

    // Default behavior: get all posts
    const posts = await this.postService.findAll(viewerId);

    return Promise.all(
      posts.map(async (post) => {
        // Nếu có poll, trả về luôn kết quả poll
        let pollResult: any = null;
        let userVotedOptionId: number | null = null;
        
        if (post.poll) {
          pollResult = await this.pollService.getResult(post.poll.id);
          userVotedOptionId = await this.pollService.getUserVote(post.poll.id, viewerId);
        }
        
        return {
          ...new Posts(post),
          poll: post.poll
            ? {
                ...post.poll,
                options: post.poll.options,
                result: pollResult,
                userVotedOptionId,
              }
            : null,
        };
      }),
    );
  }

  @Get('trending')
  @RelaxedRateLimit() // 200 requests per minute
  @ApiOperation({
    summary: 'Lấy bài viết trending',
    description: 'Lấy danh sách bài viết đang hot/trending',
  })
  @ApiResponse({ status: 200, description: 'Danh sách bài viết trending' })
  async getTrending() {
    return this.postService.getTrending();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('deleted/me')
  @ApiOperation({
    summary: 'Lấy danh sách bài viết đã xóa',
    description:
      'Lấy danh sách bài viết đã xóa tạm thời của người dùng hiện tại',
  })
  @ApiResponse({ status: 200, description: 'Danh sách bài viết đã xóa' })
  async getDeletedPosts(@Req() req) {
    return this.postService.getDeletedPosts(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('drafts/me')
  @ApiOperation({
    summary: 'Lấy danh sách bản nháp',
    description: 'Lấy tất cả bài viết bản nháp của người dùng hiện tại',
  })
  @ApiResponse({ status: 200, description: 'Danh sách bản nháp' })
  async getDrafts(@Req() req) {
    return this.postService.getDrafts(req.user.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết bài viết',
    description:
      'Lấy thông tin chi tiết của một bài viết theo ID. Có thể truy cập không cần đăng nhập, nhưng nếu có token sẽ log view.',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({ status: 200, description: 'Thông tin bài viết' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết' })
  async findOne(@Param('id') id: string, @Req() req) {
    // viewerId là optional - chỉ truyền nếu có user đăng nhập
    const viewerId = req.user?.id;

    // Log username của người xem post
    const username = req.user?.userName || 'Ẩn danh';
    this.logger.log(`Người dùng "${username}" đã yêu cầu xem post ID: ${id}`);

    const post = await this.postService.findById(+id, viewerId);

    // Nếu có poll, trả về luôn kết quả poll và thông tin vote của user
    let pollResult: any = null;
    let userVotedOptionId: number | null = null;
    
    if (post.poll) {
      pollResult = await this.pollService.getResult(post.poll.id);
      userVotedOptionId = await this.pollService.getUserVote(post.poll.id, viewerId);
    }

    return {
      ...new Posts(post),
      poll: post.poll
        ? {
            ...post.poll,
            options: post.poll.options,
            result: pollResult,
            userVotedOptionId,
          }
        : null,
    };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa vĩnh viễn bài viết',
    description:
      'Xóa vĩnh viễn bài viết khỏi hệ thống. Chỉ tác giả mới có thể xóa.',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa' })
  async remove(@Param('id') id: string, @Req() req) {
    await this.postService.remove(+id, req.user.id);
    return { message: 'Post deleted successfully' };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id/soft-delete')
  @ApiOperation({
    summary: 'Xóa tạm thời bài viết',
    description:
      'Xóa bài viết nhưng vẫn lưu trong hệ thống, có thể khôi phục sau này.',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({ status: 200, description: 'Xóa tạm thời thành công' })
  async softDelete(@Param('id') id: string, @Req() req) {
    const post = await this.postService.softDelete(+id, req.user.id);
    return new Posts(post);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id/restore')
  @ApiOperation({
    summary: 'Khôi phục bài viết',
    description: 'Khôi phục bài viết đã xóa tạm thời',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({ status: 200, description: 'Khôi phục thành công' })
  async restore(@Param('id') id: string, @Req() req) {
    const post = await this.postService.restore(+id, req.user.id);
    return new Posts(post);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/like')
  @ApiOperation({
    summary: 'Thích bài viết',
    description: 'Thêm lượt thích cho bài viết',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({ status: 201, description: 'Thích thành công' })
  async like(@Param('id') id: string, @Req() req) {
    return this.postService.like(+id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/unlike')
  @ApiOperation({
    summary: 'Bỏ thích bài viết',
    description: 'Xóa lượt thích khỏi bài viết',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({ status: 200, description: 'Bỏ thích thành công' })
  async unlike(@Param('id') id: string, @Req() req) {
    return this.postService.unlike(+id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/likes')
  @ApiOperation({
    summary: 'Lấy danh sách người thích',
    description: 'Lấy danh sách người dùng đã thích bài viết này',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách người thích' })
  async getLikes(@Param('id') id: string) {
    return this.postService.getLikes(+id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/comment')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10, { storage: commentStorage }))
  @ApiOperation({
    summary: 'Bình luận bài viết với nhiều ảnh',
    description:
      'Thêm bình luận mới cho bài viết, có thể đính kèm tối đa 10 ảnh.',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Nội dung bình luận',
          example: 'Đây là bình luận của tôi',
        },
        parentId: {
          type: 'number',
          description:
            'ID của bình luận cha (nếu đây là reply, có thể bỏ trống)',
          example: 1,
        },
        isAnonymous: {
          type: 'boolean',
          description: 'Ẩn danh hay không',
          example: false,
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Danh sách ảnh đính kèm (tối đa 10 ảnh)',
        },
      },
      required: ['content'],
    },
  })
  @ApiResponse({ status: 201, description: 'Bình luận thành công' })
  async commentOnPost(
    @Param('id') id: string,
    @Req() req,
    @Body() body: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const content = body.content;
    const parentId = body.parentId ? +body.parentId : undefined;
    const isAnonymous =
      body.isAnonymous === 'true' || body.isAnonymous === true;

    const comment = await this.postService.commentOnPost(
      +id,
      req.user.id,
      content,
      parentId,
      isAnonymous,
      files,
    );
    return comment;
  }

  @Get(':id/comments')
  @ApiOperation({
    summary: 'Lấy danh sách bình luận',
    description:
      'Lấy bình luận của bài viết với phân trang. Mặc định trả về 10 bình luận đầu tiên.',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Danh sách bình luận với pagination',
    schema: {
      type: 'object',
      properties: {
        comments: { type: 'array' },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 15 },
            skip: { type: 'number', example: 0 },
            take: { type: 'number', example: 10 },
            hasMore: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  async getComments(
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('sort') sort?: 'oldest' | 'newest' | 'score',
    @Req() req?,
  ) {
    const skipNum = skip ? parseInt(skip) : 0;
    const takeNum = take ? parseInt(take) : 10;
    const sortBy = sort || 'score'; // Mặc định theo điểm
    const viewerId = req?.user?.id; // Lấy userId để xác định isOwner
    return this.postService.getComments(
      +id,
      skipNum,
      takeNum,
      sortBy,
      viewerId,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/comments/count')
  @ApiOperation({
    summary: 'Lấy số lượng bình luận',
    description: 'Lấy tổng số bình luận của bài viết',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({ status: 200, description: 'Số lượng bình luận' })
  async getCommentCount(@Param('id') id: string) {
    const count = await this.postService.getCommentCount(+id);
    return { count };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/poll')
  @ApiOperation({
    summary: 'Tạo poll cho bài viết',
    description:
      'Thêm poll vào bài viết hiện có. Chỉ tác giả mới có thể thêm poll.',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiBody({ type: CreatePollDto })
  @ApiResponse({ status: 201, description: 'Tạo poll thành công' })
  async createPoll(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: CreatePollDto,
  ) {
    const poll = await this.postService.createPoll(+id, req.user.id, dto);
    return poll;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/bookmark')
  @ApiOperation({
    summary: 'Lưu bài viết',
    description:
      'Lưu bài viết vào bookmark. Có thể lưu vào collection cụ thể bằng cách truyền collectionId.',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        collectionId: {
          type: 'number',
          description: 'ID của collection (có thể bỏ trống)',
          example: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Lưu thành công' })
  async bookmark(
    @Param('id') id: string,
    @Req() req,
    @Body('collectionId') collectionId?: number,
  ) {
    const bookmark = await this.postService.bookmark(
      +id,
      req.user.id,
      collectionId,
    );
    return bookmark;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id/bookmark')
  @ApiOperation({
    summary: 'Bỏ lưu bài viết',
    description: 'Xóa bài viết khỏi bookmark',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({ status: 200, description: 'Bỏ lưu thành công' })
  async removeBookmark(@Param('id') id: string, @Req() req) {
    await this.postService.removeBookmark(+id, req.user.id);
    return { message: 'Bookmark removed successfully' };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id/publish')
  @ApiOperation({
    summary: 'Cập nhật trạng thái xuất bản',
    description: 'Chuyển bài viết giữa trạng thái bản nháp và đã xuất bản',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isDraft: {
          type: 'boolean',
          description: 'true = lưu như bản nháp, false = xuất bản',
          example: false,
        },
      },
      required: ['isDraft'],
    },
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updatePublish(
    @Param('id') id: string,
    @Req() req,
    @Body('isDraft') isDraft: boolean,
  ) {
    const post = await this.postService.updatePublish(
      +id,
      req.user.id,
      isDraft,
    );
    return new Posts(post);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id/visibility')
  @ApiOperation({
    summary: 'Cập nhật mức độ hiển thị',
    description:
      'Thay đổi quyền hiển thị bài viết (PUBLIC, FOLLOWERS, PRIVATE, ANONYMOUS)',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        visibility: {
          type: 'string',
          enum: ['PUBLIC', 'FOLLOWERS', 'PRIVATE', 'ANONYMOUS'],
          description: 'Mức độ hiển thị',
          example: 'PUBLIC',
        },
      },
      required: ['visibility'],
    },
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateVisibility(
    @Param('id') id: string,
    @Req() req,
    @Body('visibility') visibility: PostVisibility,
  ) {
    const post = await this.postService.updateVisibility(
      +id,
      req.user.id,
      visibility,
    );
    return new Posts(post);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/posts')
  @ApiOperation({
    summary: 'Lấy danh sách bài viết liên quan',
    description: 'Lấy tất cả bài viết liên quan do cùng một tác giả tạo',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách bài viết liên quan' })
  async getPostsByUser(@Param('id') id: string, @Req() req?) {
    const viewerId = req?.user?.id;
    const posts = await this.postService.getPostsByUser(+id, viewerId);
    return posts;
  }

  @Get(':id/views')
  @ApiOperation({
    summary: 'Lấy số lượt xem bài viết',
    description:
      'Lấy thống kê lượt xem của bài viết bao gồm tổng lượt xem, lượt xem unique và lượt xem ẩn danh',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Thống kê lượt xem',
    schema: {
      type: 'object',
      properties: {
        totalViews: {
          type: 'number',
          example: 150,
          description: 'Tổng số lượt xem',
        },
        uniqueViews: {
          type: 'number',
          example: 45,
          description: 'Số người xem unique (đã đăng nhập)',
        },
        anonymousViews: {
          type: 'number',
          example: 105,
          description: 'Số lượt xem ẩn danh (chưa đăng nhập)',
        },
      },
    },
  })
  async getViewCount(@Param('id') id: string) {
    return this.postService.getViewCount(+id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/views/details')
  @ApiOperation({
    summary: 'Lấy danh sách người đã xem bài viết',
    description:
      'Lấy danh sách người dùng đã đăng nhập và xem bài viết này. Chỉ hiển thị người xem unique (không trùng lặp). Yêu cầu đăng nhập.',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Danh sách người xem',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              fullName: { type: 'string' },
              userName: { type: 'string' },
              avatarUrl: { type: 'string' },
            },
          },
          viewedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getViewDetails(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 20;
    return this.postService.getViewDetails(+id, limitNum);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/images')
  @ApiOperation({
    summary: 'Đồng bộ danh sách ảnh của post',
    description:
      'Đồng bộ danh sách ảnh của post với danh sách URL được gửi lên. Những URL đã có sẽ được bỏ qua, URL mới sẽ được thêm vào, và những URL không còn trong danh sách sẽ bị xóa. Chỉ tác giả của post mới có quyền cập nhật.',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiBody({ type: AddImagesToPostDto })
  @ApiResponse({
    status: 201,
    description: 'Thêm ảnh thành công',
  })
  @ApiResponse({ status: 403, description: 'Không có quyền thêm ảnh' })
  @ApiResponse({ status: 404, description: 'Post không tồn tại' })
  async addImagesToPost(
    @Param('id') id: string,
    @Body() dto: AddImagesToPostDto,
    @Req() req,
  ) {
    // Kiểm tra userId từ token có khớp với userId trong body không
    if (req.user.id !== dto.userId) {
      throw new BadRequestException(
        'UserId không khớp với user đang đăng nhập',
      );
    }

    // Kiểm tra postId trong param có khớp với postId trong body không
    if (+id !== dto.postId) {
      throw new BadRequestException(
        'PostId trong URL không khớp với postId trong body',
      );
    }

    const post = await this.postService.addImagesToPost(
      dto.postId,
      dto.userId,
      dto.imageUrls,
    );
    return new Posts(post);
  }

  @Get(':id/images')
  @ApiOperation({
    summary: 'Lấy danh sách ảnh của bài viết',
    description: 'Lấy mảng danh sách các link ảnh của một bài viết theo ID',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Mảng danh sách các link ảnh',
    schema: {
      type: 'array',
      items: {
        type: 'string',
        example: 'https://res.cloudinary.com/demo/image/upload/v123/image.jpg',
      },
      example: [
        'https://res.cloudinary.com/demo/image/upload/v123/image1.jpg',
        'https://res.cloudinary.com/demo/image/upload/v123/image2.jpg',
      ],
    },
  })
  @ApiResponse({ status: 404, description: 'Post không tồn tại' })
  async getPostImages(@Param('id') id: string) {
    const imageUrls = await this.postService.getPostImages(+id);
    return imageUrls;
  }

  // ==================== ADMIN ENDPOINTS ====================

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('admin/all')
  @ApiOperation({
    summary: '[ADMIN] Lấy tất cả bài viết',
    description: 'Lấy danh sách tất cả bài viết trong hệ thống. Chỉ ADMIN mới truy cập được.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách bài viết' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async getAllPostsAdmin(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    const skipNum = skip ? parseInt(skip) : 0;
    const takeNum = take ? parseInt(take) : 50;
    return this.postService.getAllPostsForAdmin(skipNum, takeNum, search);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Delete('admin/:id')
  @ApiOperation({
    summary: '[ADMIN] Xóa bài viết',
    description: 'Xóa vĩnh viễn bài viết. Chỉ ADMIN mới có quyền.',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  async deletePostAdmin(@Param('id') id: string) {
    await this.postService.deletePostAdmin(+id);
    return { message: 'Post deleted successfully' };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch('admin/:id/toggle-visibility')
  @ApiOperation({
    summary: '[ADMIN] Ẩn/Hiện bài viết',
    description: 'Chuyển đổi trạng thái hiển thị của bài viết. Chỉ ADMIN mới có quyền.',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  async togglePostVisibility(@Param('id') id: string) {
    const post = await this.postService.togglePostVisibility(+id);
    return new Posts(post);
  }
}
