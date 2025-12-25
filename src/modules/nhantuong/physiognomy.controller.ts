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
} from '@nestjs/swagger';
import { PhysiognomyService } from './physiognomy.service';
import { AnalyzeFaceDto } from './dto/analyze-face.dto';
import { SaveAnalysisDto } from './dto/save-analysis.dto';
import { PhysiognomyResponse } from './physiognomy.interface';

@ApiTags('physiognomy')
@ApiBearerAuth()
@Controller('physiognomy')
export class PhysiognomyController {
  constructor(private readonly physiognomyService: PhysiognomyService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('preview')
  @ApiOperation({ summary: 'Preview face traits (no save)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: AnalyzeFaceDto })
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
  @ApiOperation({ summary: 'Get AI interpretation for traits' })
  async interpret(@Body() dto: SaveAnalysisDto): Promise<PhysiognomyResponse> {
    if (!dto.data || !dto.data.report) throw new BadRequestException('Missing report data');
    return this.physiognomyService.interpretTraits(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('save')
  @ApiOperation({ summary: 'Save all data (including interpret if exists)' })
  async save(@Body() dto: SaveAnalysisDto, @Req() req): Promise<PhysiognomyResponse> {
    if (!dto.data || !dto.data.report) throw new BadRequestException('Missing analysis data');
    return this.physiognomyService.save(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('history')
  @ApiOperation({ summary: 'Get list of past analyses for current user' })
  async getHistory(@Req() req) {
    return this.physiognomyService.getHistory(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('history/:id')
  @ApiOperation({ summary: 'Get detail of a specific past analysis' })
  async getDetail(@Req() req, @Param('id') id: string) {
    return this.physiognomyService.getDetail(req.user.id, +id);
  }
}