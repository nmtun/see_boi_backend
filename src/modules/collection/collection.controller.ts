import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';

@Controller('collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post()
  async create(@Body() dto: CreateCollectionDto, @Req() req) {
    return this.collectionService.create(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCollectionDto, @Req() req) {
    return this.collectionService.update(+id, req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('mine')
  async findMine(@Req() req) {
    return this.collectionService.findMine(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    return this.collectionService.remove(+id, req.user.id);
  }

}
