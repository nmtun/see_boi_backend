import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { Tag } from './entities/tag.entity';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { Roles } from '../../auth/decorator/roles.decorator';

@Controller('tag')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post()
  async create(@Body() createTagDto: CreateTagDto) {
    const tag = await this.tagService.create(createTagDto);
    return new Tag(tag);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get()
  async findAll() {
    const tags = await this.tagService.findAll();
    return tags.map(tag => new Tag(tag));
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    const tag = await this.tagService.update(+id, updateTagDto);
    return new Tag(tag);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.tagService.remove(+id);
    return { message: 'Tag deleted successfully' };
  }

}
