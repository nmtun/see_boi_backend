import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { Tag } from './entities/tag.entity';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { GetUser } from '../../auth/decorator/get-user.decorator';
import { OptionalJwtAuthGuard } from '../../auth/guard/optional-jwt.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('Tags')
@ApiBearerAuth()
@Controller('tag')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post()
  @ApiOperation({ 
    summary: 'Tạo tag mới (ADMIN)',
    description: 'Tạo một tag mới trong hệ thống. Chỉ admin mới có quyền tạo tag.' 
  })
  @ApiBody({ type: CreateTagDto })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền (chỉ admin)' })
  async create(@Body() createTagDto: CreateTagDto) {
    const tag = await this.tagService.create(createTagDto);
    return new Tag(tag);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  // @Roles('ADMIN')
  @Get()
  @ApiOperation({ 
    summary: 'Lấy danh sách tất cả tags (ADMIN)',
    description: 'Lấy danh sách tất cả tags trong hệ thống' 
  })
  @ApiResponse({ status: 200, description: 'Danh sách tags' })
  async findAll() {
    const tags = await this.tagService.findAll();
    return tags.map(tag => new Tag(tag));
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  @ApiOperation({ 
    summary: 'Cập nhật tag (ADMIN)',
    description: 'Chỉnh sửa thông tin tag. Chỉ admin mới có quyền cập nhật.' 
  })
  @ApiParam({ name: 'id', description: 'ID của tag', type: Number })
  @ApiBody({ type: UpdateTagDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền (chỉ admin)' })
  async update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    const tag = await this.tagService.update(+id, updateTagDto);
    return new Tag(tag);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Xóa tag',
    description: 'Xóa tag khỏi hệ thống' 
  })
  @ApiParam({ name: 'id', description: 'ID của tag', type: Number })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async remove(@Param('id') id: string) {
    await this.tagService.remove(+id);
    return { message: 'Tag deleted successfully' };
  }

  //////////////////////////////////////////////////
  // TAG FOLLOW SYSTEM
  //////////////////////////////////////////////////

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/follow')
  @ApiOperation({ 
    summary: 'Follow một tag',
    description: 'Theo dõi tag để nhận cập nhật bài viết mới với tag này' 
  })
  @ApiParam({ name: 'id', description: 'ID của tag cần follow', type: Number })
  @ApiResponse({ status: 201, description: 'Follow tag thành công' })
  @ApiResponse({ status: 403, description: 'Đã follow tag này rồi' })
  @ApiResponse({ status: 404, description: 'Tag không tồn tại' })
  async followTag(@Param('id') id: string, @GetUser('id') userId: number) {
    return this.tagService.followTag(userId, +id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/unfollow')
  @ApiOperation({ 
    summary: 'Unfollow một tag',
    description: 'Hủy theo dõi tag' 
  })
  @ApiParam({ name: 'id', description: 'ID của tag cần unfollow', type: Number })
  @ApiResponse({ status: 200, description: 'Unfollow tag thành công' })
  @ApiResponse({ status: 404, description: 'Chưa follow tag này' })
  async unfollowTag(@Param('id') id: string, @GetUser('id') userId: number) {
    await this.tagService.unfollowTag(userId, +id);
    return { message: 'Unfollowed tag successfully' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/is-following')
  @ApiOperation({ 
    summary: 'Kiểm tra trạng thái follow tag',
    description: 'Kiểm tra xem user có đang follow tag này không' 
  })
  @ApiParam({ name: 'id', description: 'ID của tag', type: Number })
  @ApiResponse({ status: 200, description: 'Trạng thái follow', schema: { example: { isFollowing: true } } })
  async isFollowingTag(@Param('id') id: string, @GetUser('id') userId: number) {
    const isFollowing = await this.tagService.isFollowingTag(userId, +id);
    return { isFollowing };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('following/me')
  @ApiOperation({ 
    summary: 'Lấy danh sách tags đang follow',
    description: 'Lấy tất cả tags mà user hiện tại đang theo dõi' 
  })
  @ApiResponse({ status: 200, description: 'Danh sách tags đang follow' })
  async getMyFollowingTags(@GetUser('id') userId: number) {
    return this.tagService.getUserFollowingTags(userId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/detail')
  @ApiOperation({ 
    summary: 'Lấy thông tin chi tiết tag',
    description: 'Lấy thông tin tag bao gồm số bài viết, số followers và trạng thái follow (nếu đã đăng nhập)' 
  })
  @ApiParam({ name: 'id', description: 'ID của tag', type: Number })
  @ApiResponse({ status: 200, description: 'Chi tiết tag' })
  @ApiResponse({ status: 404, description: 'Tag không tồn tại' })
  async getTagDetail(@Param('id') id: string, @GetUser('id') viewerId?: number) {
    return this.tagService.getTagWithFollowStatus(+id, viewerId);
  }

}
