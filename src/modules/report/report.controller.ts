import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { Roles } from '../../auth/decorator/roles.decorator';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get()
  async findAll(@Param('status') status?: string) {
    return this.reportService.findAll(status as any);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateReportStatusDto) {
    return this.reportService.updateStatus(+id, dto.status);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post()
  async create(@Body() createReportDto: CreateReportDto, @Req() req) {
    return this.reportService.create(req.user.id, createReportDto);
  }

}
