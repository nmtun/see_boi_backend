import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { CommentService } from './comment.service';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { VoteType } from '@prisma/client/wasm';
import { ReplyCommentDto } from './dto/reply-comment.dto';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCommentDto, @Req() req) {
    return this.commentService.update(+id, req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    return this.commentService.remove(+id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/reply')
  async reply(@Param('id') id: string, @Body() dto: ReplyCommentDto, @Req() req) {
    return this.commentService.reply(+id, req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/upvote')
  async upvote(@Param('id') id: string, @Req() req) {
    return this.commentService.vote(+id, req.user.id, VoteType.UP);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/downvote')
  async downvote(@Param('id') id: string, @Req() req) {
    return this.commentService.vote(+id, req.user.id, VoteType.DOWN);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id/vote')
  async removeVote(@Param('id') id: string, @Req() req) {
    return this.commentService.removeVote(+id, req.user.id);
  }
}