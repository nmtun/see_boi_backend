import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  ForbiddenException, 
} from '@nestjs/common';
import { TuViService } from './tuvi.service';
import { CreateTuViChartDto } from './dto/create-tuvi-chart.dto';
import { TuViChart, TuViChartResponse } from './tuvi.interface'; 
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard'; 
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('Tu Vi Charts')
@ApiBearerAuth()
@Controller('tuvi')
export class TuViController {
  constructor(private readonly tuviService: TuViService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('create-chart')
  @ApiOperation({
    summary: 'Tạo lá số Tử Vi mới',
    description: 'Người dùng đã đăng nhập có thể tạo một lá số Tử Vi bằng cách cung cấp thông tin ngày, giờ sinh và giới tính.',
  })
  @ApiBody({ type: CreateTuViChartDto })
  @ApiResponse({ status: 201, description: 'Lá số Tử Vi được tạo thành công.' }) 
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ (Invalid birthDate, Invalid gender, etc.).' })
  @ApiResponse({ status: 401, description: 'Không được ủy quyền. Yêu cầu JWT token hợp lệ.' })
  async createTuViChart(
    @Body() createTuViChartDto: CreateTuViChartDto,
    @Req() req,
  ): Promise<TuViChartResponse> {
    const userId = req.user.id;
    return this.tuviService.generateTuViChart(userId, createTuViChartDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':chartId')
  @ApiOperation({
    summary: 'Lấy lá số Tử Vi theo ID',
    description: 'Truy xuất thông tin chi tiết của một lá số Tử Vi. Chỉ người tạo lá số mới có quyền xem.',
  })
  @ApiParam({ name: 'chartId', description: 'ID của lá số Tử Vi', type: Number })
  @ApiResponse({ status: 200, description: 'Trả về thông tin lá số Tử Vi.' })
  @ApiResponse({ status: 400, description: 'ID lá số không hợp lệ (Invalid chartId).' })
  @ApiResponse({ status: 401, description: 'Không được ủy quyền. Yêu cầu JWT token hợp lệ.' })
  @ApiResponse({ status: 403, description: 'Bạn không có quyền truy cập lá số này.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lá số Tử Vi.' })
  async getTuViChart(
    @Param('chartId', ParseIntPipe) chartId: number, 
    @Req() req
  ): Promise<TuViChart> {
    const userId = req.user.id;
    return this.tuviService.getTuViChartById(chartId, userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':chartId/interpret-ai')
  @ApiOperation({
    summary: 'Yêu cầu AI luận giải lá số Tử Vi',
    description: 'Gửi yêu cầu đến AI để nhận bản luận giải chi tiết cho lá số. Chỉ người tạo lá số mới có quyền yêu cầu.',
  })
  @ApiParam({ name: 'chartId', description: 'ID của lá số Tử Vi', type: Number })
  @ApiResponse({ status: 201, description: 'Bản luận giải AI được tạo và lưu thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu lá số không hợp lệ để luận giải (Chart data is missing/invalid).' }) 
  @ApiResponse({ status: 401, description: 'Không được ủy quyền. Yêu cầu JWT token hợp lệ.' })
  @ApiResponse({ status: 403, description: 'Bạn không có quyền yêu cầu luận giải cho lá số này.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lá số Tử Vi.' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ khi gọi AI hoặc xử lý dữ liệu.' }) 
  async requestAIInterpretation(
    @Param('chartId', ParseIntPipe) chartId: number, 
    @Req() req,
  ): Promise<any> {
    const userId = req.user.id;
    return this.tuviService.requestAIInterpretation(userId, chartId);
  }
}