import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PhysiognomyService } from './physiognomy.service';
import { AnalyzeFaceDto } from './dto/analyze-face.dto';
import { SaveAnalysisDto } from './dto/save-analysis.dto';
import { PhysiognomyResponse } from './physiognomy.interface';

@ApiTags('Physiognomy')
@ApiBearerAuth()
@Controller('physiognomy')
export class PhysiognomyController {
  constructor(private readonly physiognomyService: PhysiognomyService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('preview')
  @ApiOperation({ 
    summary: 'Phân tích khuôn mặt (xem trước, không lưu)',
    description: 'Upload ảnh khuôn mặt để phân tích các đặc điểm nhân tướng học. Kết quả chỉ được trả về, không lưu vào database. Hỗ trợ định dạng: JPG, JPEG, PNG, WEBP. Kích thước tối đa: 5MB.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ 
    type: AnalyzeFaceDto,
    description: 'Upload file ảnh khuôn mặt cần phân tích'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Phân tích thành công',
    schema: {
      example: {
        success: true,
        data: {
          report: {
            tam_dinh: [
              { trait: 'Trán rộng', tags: ['Thông minh', 'Sáng suốt'] }
            ],
            long_may: [
              { trait: 'Lông mày thanh tú', tags: ['Tình cảm tốt'] }
            ],
            mat: [
              { trait: 'Mắt sáng', tags: ['Tinh tường'] }
            ],
            mui: [
              { trait: 'Mũi cao', tags: ['Tài vận tốt'] }
            ],
            tai: [
              { trait: 'Tai dày', tags: ['Thọ mệnh'] }
            ],
            mieng_cam: [
              { trait: 'Miệng đẹp', tags: ['Giao tiếp tốt'] }
            ]
          },
          interpret: {
            tam_dinh: {
              thuong_dinh: 'Vùng trán đại diện cho trí tuệ...',
              trung_dinh: 'Vùng từ mày đến mũi...',
              ha_dinh: 'Vùng cằm và miệng...',
              tong_quan: 'Tổng quan về tam đình...'
            },
            ngu_quan: {
              long_may: 'Lông mày thể hiện...',
              mat: 'Mắt thể hiện...',
              mui: 'Mũi thể hiện...',
              tai: 'Tai thể hiện...',
              mieng_cam: 'Miệng và hàm thể hiện...'
            },
            loi_khuyen: ['Lời khuyên 1', 'Lời khuyên 2']
          },
          landmarks: {},
          image_base64: 'base64_encoded_image_string'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Lỗi: File ảnh không hợp lệ, thiếu file, hoặc định dạng không được hỗ trợ' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Chưa đăng nhập hoặc token không hợp lệ' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Lỗi server khi xử lý ảnh hoặc gọi Python service' 
  })
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new BadRequestException('Invalid image format'), false);
        }
        cb(null, true);
      },
    }),
  )
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ): Promise<PhysiognomyResponse> {
    if (!file) throw new BadRequestException('Image file is required');
    return this.physiognomyService.preview(req.user.id, file);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('interpret')
  @ApiOperation({ 
    summary: 'Lấy giải thích AI cho các đặc điểm khuôn mặt',
    description: 'Gửi dữ liệu phân tích khuôn mặt (từ preview) cùng với thông tin cá nhân (tên, ngày sinh, giới tính) để nhận giải thích chi tiết bằng AI về ý nghĩa của các đặc điểm nhân tướng học và luận giải tổng quan mệnh cục. Kết quả không được lưu vào database.'
  })
  @ApiBody({ 
    type: SaveAnalysisDto,
    description: 'Dữ liệu phân tích khuôn mặt từ endpoint preview, bao gồm thông tin cá nhân: name, birthday, gender'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Nhận giải thích AI thành công',
    schema: {
      example: {
        success: true,
        data: {
          report: {},
          interpret: {
            'tong-quan': 'Luận giải tổng quan mệnh cục dựa trên thông tin cá nhân (tên, ngày sinh, giới tính) kết hợp với phân tích khuôn mặt. Đây là phần tổng hợp toàn diện về vận mệnh, tính cách, và triển vọng cuộc đời của người được phân tích.',
            tam_dinh: {
              thuong_dinh: 'Giải thích về thượng đình...',
              trung_dinh: 'Giải thích về trung đình...',
              ha_dinh: 'Giải thích về hạ đình...',
              tong_quan: 'Tổng quan về tam đình...'
            },
            ngu_quan: {
              long_may: 'Giải thích về lông mày...',
              mat: 'Giải thích về mắt...',
              mui: 'Giải thích về mũi...',
              tai: 'Giải thích về tai...',
              mieng_cam: 'Giải thích về miệng và hàm...'
            },
            loi_khuyen: ['Lời khuyên cụ thể 1', 'Lời khuyên cụ thể 2']
          },
          landmarks: {},
          image_base64: 'base64_encoded_image_string'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Thiếu dữ liệu phân tích (report data)' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Chưa đăng nhập hoặc token không hợp lệ' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Lỗi server khi gọi AI service' 
  })
  async interpret(@Body() dto: SaveAnalysisDto): Promise<PhysiognomyResponse> {
    if (!dto.data || !dto.data.report) throw new BadRequestException('Missing report data');
    return this.physiognomyService.interpretTraits(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('save')
  @ApiOperation({ 
    summary: 'Lưu kết quả phân tích vào database',
    description: 'Lưu toàn bộ dữ liệu phân tích khuôn mặt (bao gồm report, interpret nếu có, landmarks, và ảnh) vào database. Kết quả sẽ được lưu trong lịch sử phân tích của người dùng.'
  })
  @ApiBody({ 
    type: SaveAnalysisDto,
    description: 'Dữ liệu phân tích cần lưu. Nếu có interpret sẽ được lưu kèm theo.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lưu thành công',
    schema: {
      example: {
        success: true,
        data: {
          report: {},
          interpret: {},
          landmarks: {},
          image_base64: 'base64_encoded_image_string',
          saved_id: 1
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Thiếu dữ liệu phân tích (analysis data)' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Chưa đăng nhập hoặc token không hợp lệ' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Lỗi server khi lưu vào database' 
  })
  async save(@Body() dto: SaveAnalysisDto, @Req() req): Promise<PhysiognomyResponse> {
    if (!dto.data || !dto.data.report) throw new BadRequestException('Missing analysis data');
    return this.physiognomyService.save(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('history')
  @ApiOperation({ 
    summary: 'Lấy danh sách lịch sử phân tích',
    description: 'Lấy danh sách tất cả các lần phân tích khuôn mặt đã lưu của người dùng hiện tại. Danh sách được sắp xếp theo thời gian mới nhất trước.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lấy danh sách thành công',
    schema: {
      example: [
        {
          id: 1,
          userId: 1,
          report: {},
          interpret: {},
          landmarks: {},
          image_base64: 'base64_string',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ]
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Chưa đăng nhập hoặc token không hợp lệ' 
  })
  async getHistory(@Req() req) {
    return this.physiognomyService.getHistory(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('history/:id')
  @ApiOperation({ 
    summary: 'Lấy chi tiết một lần phân tích cụ thể',
    description: 'Lấy thông tin chi tiết đầy đủ của một lần phân tích khuôn mặt đã lưu theo ID. Chỉ có thể xem các phân tích của chính người dùng.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID của lần phân tích cần xem', 
    type: Number,
    example: 1
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lấy chi tiết thành công',
    schema: {
      example: {
        id: 1,
        userId: 1,
        report: {
          tam_dinh: [],
          long_may: [],
          mat: [],
          mui: [],
          tai: [],
          mieng_cam: []
        },
        interpret: {
          tam_dinh: {},
          ngu_quan: {},
          loi_khuyen: []
        },
        landmarks: {},
        image_base64: 'base64_encoded_image_string',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Chưa đăng nhập hoặc token không hợp lệ' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Không có quyền xem phân tích này (không phải của người dùng hiện tại)' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Không tìm thấy lần phân tích với ID này' 
  })
  async getDetail(@Req() req, @Param('id') id: string) {
    return this.physiognomyService.getDetail(req.user.id, +id);
  }
}