import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
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
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const userId = req.user.id;
    return this.physiognomyService.preview(userId, file);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('save')
  @ApiOperation({ summary: 'Save analyzed traits to database' })
  async save(
    @Body() dto: SaveAnalysisDto,
    @Req() req,
  ): Promise<PhysiognomyResponse> {
    if (!dto.data || !dto.data.report) {
      throw new BadRequestException('Missing analysis data');
    }

    const userId = req.user.id;
    return this.physiognomyService.save(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('interpret')
  @ApiOperation({ summary: 'Interpret traits (temporary: echo analyzed data)' })
  async interpret(
    @Body() dto: SaveAnalysisDto,
  ): Promise<PhysiognomyResponse> {
    if (!dto.data || !dto.data.report) {
      throw new BadRequestException('Missing data for interpretation');
    }

    return {
      success: true,
      data: {
        report: dto.data.report,
        metrics: dto.data.metrics,
        landmarks: dto.data.landmarks,
        image_base64: dto.data.image_base64,
      },
    };
  }
}
