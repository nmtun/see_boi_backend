import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get()
  @ApiOperation({ 
    summary: 'Lấy danh sách báo cáo (ADMIN)',
    description: 'Lấy tất cả báo cáo trong hệ thống. Có thể lọc theo trạng thái.' 
  })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'REVIEWED', 'RESOLVED'], description: 'Lọc theo trạng thái' })
  @ApiResponse({ status: 200, description: 'Danh sách báo cáo' })
  @ApiResponse({ status: 403, description: 'Không có quyền (chỉ admin)' })
  async findAll(@Param('status') status?: string) {
    return this.reportService.findAll(status as any);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  @ApiOperation({ 
    summary: 'Cập nhật trạng thái báo cáo (ADMIN)',
    description: 'Thay đổi trạng thái xử lý báo cáo (PENDING, REVIEWED, RESOLVED)' 
  })
  @ApiParam({ name: 'id', description: 'ID của báo cáo', type: Number })
  @ApiBody({ type: UpdateReportStatusDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền (chỉ admin)' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateReportStatusDto) {
    return this.reportService.updateStatus(+id, dto.status);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post()
  @ApiOperation({ 
    summary: 'Tạo báo cáo mới',
    description: 'Báo cáo một bài viết hoặc bình luận vi phạm quy định. Phải chọn 1 trong 2: postId hoặc commentId.' 
  })
  @ApiBody({ type: CreateReportDto })
  @ApiResponse({ status: 201, description: 'Báo cáo thành công' })
  @ApiResponse({ status: 400, description: 'Phải chọn postId hoặc commentId' })
  async create(@Body() createReportDto: CreateReportDto, @Req() req) {
    return this.reportService.create(req.user.id, createReportDto);
  }

}
