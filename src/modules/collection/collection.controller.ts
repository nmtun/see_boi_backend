import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('Collections')
@ApiBearerAuth()
@Controller('collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post()
  @ApiOperation({ 
    summary: 'Tạo collection mới',
    description: 'Tạo một collection để lưu trữ các bài viết đã bookmark' 
  })
  @ApiBody({ type: CreateCollectionDto })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async create(@Body() dto: CreateCollectionDto, @Req() req) {
    return this.collectionService.create(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id')
  @ApiOperation({ 
    summary: 'Cập nhật collection',
    description: 'Chỉnh sửa thông tin collection. Chỉ chủ sở hữu mới có thể cập nhật.' 
  })
  @ApiParam({ name: 'id', description: 'ID của collection', type: Number })
  @ApiBody({ type: UpdateCollectionDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền cập nhật' })
  async update(@Param('id') id: string, @Body() dto: UpdateCollectionDto, @Req() req) {
    return this.collectionService.update(+id, req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('mine')
  @ApiOperation({ 
    summary: 'Lấy danh sách collection của tôi',
    description: 'Lấy tất cả collection của người dùng hiện tại' 
  })
  @ApiResponse({ status: 200, description: 'Danh sách collections' })
  async findMine(@Req() req) {
    return this.collectionService.findMine(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Xóa collection',
    description: 'Xóa collection. Chỉ chủ sở hữu mới có thể xóa.' 
  })
  @ApiParam({ name: 'id', description: 'ID của collection', type: Number })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa' })
  async remove(@Param('id') id: string, @Req() req) {
    return this.collectionService.remove(+id, req.user.id);
  }

}
