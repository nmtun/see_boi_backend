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
import { Posts } from './entities/post.entity';
import { RolesGuard } from '../../auth/guard/roles.guard';
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
import { FilesInterceptor } from '@nestjs/platform-express';
import { postStorage, commentStorage } from '../../utils/cloudinary.storage';
import { UploadedFile } from '@nestjs/common';

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
  @UseInterceptors(FilesInterceptor('images', 10, { storage: postStorage }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tạo bài viết mới',
    description:
      'Tạo một bài viết mới. Có thể là bài viết thường hoặc bài viết có poll. Tất cả các trường đều là optional.',
  })
  @ApiBody({ type: CreatePostDto })
  @ApiResponse({
    status: 201,
    description: 'Tạo bài viết thành công',
  })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async create(
    @Body() body: any,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Req() req,
  ) {
    const dto: CreatePostDto = {
      content: body.content,
      title: body.title,
      visibility: body.visibility,
      isDraft: body.isDraft === 'true' || body.isDraft === true,
      type: body.type,
      tagIds: body.tagIds
        ? Array.isArray(body.tagIds)
          ? body.tagIds.map(Number)
          : JSON.parse(body.tagIds)
        : undefined,
      contentJson: body.contentJson
        ? typeof body.contentJson === 'string'
          ? JSON.parse(body.contentJson)
          : body.contentJson
        : undefined,
      contentText: body.contentText,
    };
    const post = await this.postService.create(req.user.id, dto, files);
    return new Posts(post);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật bài viết',
    description:
      'Cập nhật thông tin bài viết. Chỉ tác giả mới có thể cập nhật.',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiBody({ type: UpdatePostDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền cập nhật' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @Req() req,
  ) {
    const post = await this.postService.update(+id, req.user.id, dto);
    return new Posts(post);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách tất cả bài viết',
    description:
      'Lấy tất cả bài viết công khai trong hệ thống. Nếu bài viết có poll, sẽ trả kèm kết quả poll.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách bài viết' })
  async findAll() {
    const posts = await this.postService.findAll();

    return Promise.all(
      posts.map(async (post) => {
        // Nếu có poll, trả về luôn kết quả poll
        let pollResult: any = null;
        if (post.poll) {
          pollResult = await this.pollService.getResult(post.poll.id);
        }
        return {
          ...new Posts(post),
          poll: post.poll
            ? {
                ...post.poll,
                options: post.poll.options,
                result: pollResult,
              }
            : null,
        };
      }),
    );
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

    // Nếu có poll, trả về luôn kết quả poll
    let pollResult: any = null;
    if (post.poll) {
      pollResult = await this.pollService.getResult(post.poll.id);
    }

    return {
      ...new Posts(post),
      poll: post.poll
        ? {
            ...post.poll,
            options: post.poll.options,
            result: pollResult,
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

  @Get('trending')
  @ApiOperation({
    summary: 'Lấy bài viết trending',
    description: 'Lấy danh sách bài viết đang hot/trending',
  })
  @ApiResponse({ status: 200, description: 'Danh sách bài viết trending' })
  async getTrending() {
    return this.postService.getTrending();
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

  @Get(':id/posts')
  @ApiOperation({
    summary: 'Lấy danh sách bài viết liên quan',
    description: 'Lấy tất cả bài viết liên quan do cùng một tác giả tạo',
  })
  @ApiParam({ name: 'id', description: 'ID của bài viết', type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách bài viết liên quan' })
  async getPostsByUser(@Param('id') id: string) {
    const posts = await this.postService.getPostsByUser(+id);
    return posts;
  }
}
