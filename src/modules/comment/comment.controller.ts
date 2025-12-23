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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { VoteType } from '@prisma/client/wasm';
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
import { storage } from 'src/utils/cloudinary.storage';
import { File as MulterFile } from 'multer';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật bình luận',
    description: 'Chỉnh sửa nội dung bình luận',
  })
  @ApiParam({ name: 'id', description: 'ID của bình luận', type: Number })
  @ApiBody({ type: UpdateCommentDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền chỉnh sửa' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCommentDto,
    @Req() req,
  ) {
    return this.commentService.update(+id, req.user.id, updateDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa bình luận',
    description: 'Xóa bình luận. Chỉ tác giả mới có thể xóa.',
  })
  @ApiParam({ name: 'id', description: 'ID của bình luận', type: Number })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa' })
  async remove(@Param('id') id: string, @Req() req) {
    return this.commentService.remove(+id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/reply')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10, { storage }))
  @ApiOperation({
    summary: 'Trả lời bình luận với nhiều ảnh',
    description:
      'Tạo một bình luận con để trả lời bình luận hiện tại, có thể đính kèm tối đa 10 ảnh',
  })
  @ApiParam({ name: 'id', description: 'ID của bình luận cha', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Nội dung bình luận trả lời',
          example: 'Trả lời của tôi',
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
  @ApiResponse({ status: 201, description: 'Trả lời thành công' })
  async reply(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req,
    @UploadedFiles() files?: MulterFile[],
  ) {
    return this.commentService.reply(
      +id,
      req.user.id,
      {
        content: body.content,
        isAnonymous: body.isAnonymous === 'true' || body.isAnonymous === true,
      },
      files,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/upvote')
  @ApiOperation({
    summary: 'Upvote bình luận',
    description: 'Bỏ phiếu ủng hộ cho bình luận (tăng điểm)',
  })
  @ApiParam({ name: 'id', description: 'ID của bình luận', type: Number })
  @ApiResponse({ status: 201, description: 'Upvote thành công' })
  async upvote(@Param('id') id: string, @Req() req) {
    return this.commentService.vote(+id, req.user.id, VoteType.UP);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/downvote')
  @ApiOperation({
    summary: 'Downvote bình luận',
    description: 'Bỏ phiếu phản đối cho bình luận (giảm điểm)',
  })
  @ApiParam({ name: 'id', description: 'ID của bình luận', type: Number })
  @ApiResponse({ status: 201, description: 'Downvote thành công' })
  async downvote(@Param('id') id: string, @Req() req) {
    return this.commentService.vote(+id, req.user.id, VoteType.DOWN);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id/vote')
  @ApiOperation({
    summary: 'Xóa phiếu bàu',
    description: 'Hủy upvote/downvote đã bỏ trước đó',
  })
  @ApiParam({ name: 'id', description: 'ID của bình luận', type: Number })
  @ApiResponse({ status: 200, description: 'Xóa phiếu bàu thành công' })
  async removeVote(@Param('id') id: string, @Req() req) {
    return this.commentService.removeVote(+id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('reply/:id')
  @ApiOperation({
    summary: 'Chỉnh sửa reply',
    description: 'Chỉnh sửa nội dung reply',
  })
  @ApiParam({ name: 'id', description: 'ID của reply', type: Number })
  @ApiBody({ type: UpdateCommentDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền chỉnh sửa' })
  async updateReply(
    @Param('id') id: string,
    @Body() updateDto: UpdateCommentDto,
    @Req() req,
  ) {
    return this.commentService.update(+id, req.user.id, updateDto);
  }
}
