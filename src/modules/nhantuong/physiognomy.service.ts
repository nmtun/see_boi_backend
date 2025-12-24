import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { lastValueFrom } from 'rxjs';
import FormData from 'form-data';
import {
  PythonApiResponse,
  PhysiognomyResponse,
  FaceAnalysisReport,
} from './physiognomy.interface';
import { SaveAnalysisDto } from './dto/save-analysis.dto';

@Injectable()
export class PhysiognomyService {
  private readonly pythonApiUrl =
    process.env.AI_SERVICE_URL || 'http://127.0.0.1:6677/analyze-face';

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async preview(
    userId: number,
    file: Express.Multer.File,
  ): Promise<PhysiognomyResponse> {
    const result = await this.callPythonService(file);

    return {
      success: true,
      data: {
        report: result.report,
        metrics: result.metrics,
        landmarks: result.landmarks,
        image_base64: result.visualized_image_base64,
      },
    };
  }

  async save(
    userId: number,
    dto: SaveAnalysisDto,
  ): Promise<PhysiognomyResponse> {
    const { report, metrics, landmarks, image_base64 } = dto.data;

    const tags = this.extractTags(report);

    const record = await this.prisma.userFaceLandmarks.create({
      data: {
        userId,
        report: report as any,
        metrics: metrics || {},
        landmarks: landmarks || {},
        tags,
      },
    });

    return {
      success: true,
      data: {
        report,
        metrics,
        landmarks,
        image_base64,
        saved_id: record.id,
      },
    };
  }

  private async callPythonService(
    file: Express.Multer.File,
  ): Promise<PythonApiResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const response = await lastValueFrom(
        this.httpService.post<PythonApiResponse>(
          this.pythonApiUrl,
          formData,
          { headers: formData.getHeaders() },
        ),
      );

      return response.data;
    } catch (e) {
      throw new InternalServerErrorException('Python service call failed');
    }
  }

  private extractTags(report: FaceAnalysisReport): string[] {
    const tags = new Set<string>();
    const keys: (keyof FaceAnalysisReport)[] = [
      'tamdinh',
      'eyes',
      'nose',
      'mouth',
      'jaw',
    ];

    keys.forEach((key) => {
      const items = report[key];
      if (Array.isArray(items)) {
        items.forEach((i) => {
          if (Array.isArray(i.tags)) {
            i.tags.forEach((t) => tags.add(t));
          }
        });
      }
    });

    return Array.from(tags);
  }
}
