import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Posts } from './entities/post.entity';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { PostVisibility } from '@prisma/client';
import { PollService } from '../poll/poll.service';

@Controller('post')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly pollService: PollService, // Inject PollService
  ) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post()
  async create(@Body() dto: CreatePostDto, @Req() req) {
    const post = await this.postService.create(req.user.id, dto);
    return new Posts(post);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePostDto, @Req() req) {
    const post = await this.postService.update(+id, req.user.id, dto);
    return new Posts(post);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get()
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
      })
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    const post = await this.postService.findById(+id, req.user.id);

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
  async remove(@Param('id') id: string, @Req() req) {
    await this.postService.remove(+id, req.user.id);
    return { message: 'Post deleted successfully' };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id/soft-delete')
  async softDelete(@Param('id') id: string, @Req() req) {
    const post = await this.postService.softDelete(+id, req.user.id);
    return new Posts(post);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id/restore')
  async restore(@Param('id') id: string, @Req() req) {
    const post = await this.postService.restore(+id, req.user.id);
    return new Posts(post);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('deleted/me')
  async getDeletedPosts(@Req() req) {
    return this.postService.getDeletedPosts(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/like')
  async like(@Param('id') id: string, @Req() req) {
    return this.postService.like(+id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/unlike')
  async unlike(@Param('id') id: string, @Req() req) {
    return this.postService.unlike(+id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('trending')
  async getTrending() {
    return this.postService.getTrending();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('drafts/me')
  async getDrafts(@Req() req) {
    return this.postService.getDrafts(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/likes')
  async getLikes(@Param('id') id: string) {
    return this.postService.getLikes(+id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/comment')
  async commentOnPost(@Param('id') id: string, @Req() req, @Body('content') content: string, @Body('parentId') parentId?: number) {
    const comment = await this.postService.commentOnPost(+id, req.user.id, content, parentId);
    return comment;
  }
  
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    return this.postService.getComments(+id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/poll')
  async createPoll(@Param('id') id: string, @Req() req, @Body() dto: CreatePollDto) {
    const poll = await this.postService.createPoll(+id, req.user.id, dto);
    return poll;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/bookmark')
  async bookmark(@Param('id') id: string, @Req() req, @Body('collectionId') collectionId?: number) {
    const bookmark = await this.postService.bookmark(+id, req.user.id, collectionId);
    return bookmark;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id/bookmark')
  async removeBookmark(@Param('id') id: string, @Req() req) {
    await this.postService.removeBookmark(+id, req.user.id);
    return { message: 'Bookmark removed successfully' };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id/publish')
  async updatePublish(@Param('id') id: string, @Req() req, @Body('isDraft') isDraft: boolean) {
    const post = await this.postService.updatePublish(+id, req.user.id, isDraft);
    return new Posts(post);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id/visibility')
  async updateVisibility(@Param('id') id: string, @Req() req, @Body('visibility') visibility: PostVisibility) {
    const post = await this.postService.updateVisibility(+id, req.user.id, visibility);
    return new Posts(post);
  }

}