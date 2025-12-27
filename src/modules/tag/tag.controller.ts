import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { Tag } from './entities/tag.entity';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
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

}
