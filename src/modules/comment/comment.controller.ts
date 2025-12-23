import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { CommentService } from './comment.service';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { VoteType } from '@prisma/client/wasm';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { storage } from 'src/utils/cloudinary.storage';
import { File as MulterFile } from 'multer';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage }))
  @ApiOperation({ 
    summary: 'Cập nhật bình luận',
    description: 'Chỉnh sửa nội dung bình luận, có thể cập nhật ảnh mới. Nếu có ảnh mới thì xóa ảnh cũ.' 
  })
  @ApiParam({ name: 'id', description: 'ID của bình luận', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Nội dung bình luận mới' },
        file: { type: 'string', format: 'binary', description: 'Ảnh mới (tùy chọn)' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền chỉnh sửa' })
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req,
    @UploadedFile() file?: MulterFile
  ) {
    let imageUrl = body.imageUrl;
    // Lấy comment hiện tại
    const comment = await this.commentService.getCommentById(+id);

    // Nếu upload file mới
    if (file && (file as any).secure_url) {
      // Nếu có ảnh cũ thì xóa
      if (comment.imageUrl) {
        await this.commentService.deleteCommentImage(comment.imageUrl);
      }
      imageUrl = (file as any).secure_url;
    }

    return this.commentService.update(+id, req.user.id, {
      content: body.content,
      imageUrl,
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Xóa bình luận',
    description: 'Xóa bình luận. Chỉ tác giả mới có thể xóa.' 
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
  @UseInterceptors(FileInterceptor('file', { storage }))
  @ApiOperation({ 
    summary: 'Trả lời bình luận',
    description: 'Tạo một bình luận con để trả lời bình luận hiện tại, có thể đính kèm ảnh'
  })
  @ApiParam({ name: 'id', description: 'ID của bình luận cha', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Nội dung bình luận trả lời' },
        file: { type: 'string', format: 'binary', description: 'Ảnh đính kèm (tùy chọn)' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Trả lời thành công' })
  async reply(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req,
    @UploadedFile() file?: MulterFile,
  ) {
    const imageUrl = file && (file as any).secure_url ? (file as any).secure_url : undefined;
    return this.commentService.reply(+id, req.user.id, {
      content: body.content,
      imageUrl,
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/upvote')
  @ApiOperation({ 
    summary: 'Upvote bình luận',
    description: 'Bỏ phiếu ủng hộ cho bình luận (tăng điểm)' 
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
    description: 'Bỏ phiếu phản đối cho bình luận (giảm điểm)' 
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
    description: 'Hủy upvote/downvote đã bỏ trước đó' 
  })
  @ApiParam({ name: 'id', description: 'ID của bình luận', type: Number })
  @ApiResponse({ status: 200, description: 'Xóa phiếu bàu thành công' })
  async removeVote(@Param('id') id: string, @Req() req) {
    return this.commentService.removeVote(+id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('reply/:id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage }))
  @ApiOperation({ 
    summary: 'Chỉnh sửa reply',
    description: 'Chỉnh sửa nội dung reply, có thể cập nhật ảnh mới. Nếu có ảnh mới thì xóa ảnh cũ.' 
  })
  @ApiParam({ name: 'id', description: 'ID của reply', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Nội dung reply mới' },
        file: { type: 'string', format: 'binary', description: 'Ảnh mới (tùy chọn)' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền chỉnh sửa' })
  async updateReply(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req,
    @UploadedFile() file?: MulterFile
  ) {
    let imageUrl = body.imageUrl;
    // Lấy reply hiện tại
    const reply = await this.commentService.getCommentById(+id);

    // Nếu upload file mới
    if (file && (file as any).secure_url) {
      // Nếu có ảnh cũ thì xóa
      if (reply.imageUrl) {
        await this.commentService.deleteCommentImage(reply.imageUrl);
      }
      imageUrl = (file as any).secure_url;
    }

    return this.commentService.update(+id, req.user.id, {
      content: body.content,
      imageUrl,
    });
  }
}