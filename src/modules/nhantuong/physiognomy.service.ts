import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { lastValueFrom } from 'rxjs';
import FormData from 'form-data';
import {
  PythonApiResponse,
  PhysiognomyResponse,
  FaceAnalysisReport,
  PHYSIOGNOMY_FALLBACK,
} from './physiognomy.interface';
import { SaveAnalysisDto } from './dto/save-analysis.dto';
import { GoogleGeminiService } from '../gemini/google-gemini.service';

@Injectable()
export class PhysiognomyService {
  private readonly pythonApiUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:6677/analyze-face';

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private googleGeminiService: GoogleGeminiService,
  ) {}

  async preview(userId: number, file: Express.Multer.File): Promise<any> {
    const pythonResult = await this.callPythonService(file);
    return {
      success: true,
      data: {
        report: pythonResult.report,
        landmarks: pythonResult.landmarks,
        image_base64: pythonResult.visualized_image_base64,
      },
    };
  }

  async interpretTraits(dto: any): Promise<any> {
    const { data } = dto;
    if (!data || !data.report) throw new BadRequestException('Dữ liệu không hợp lệ');

    const context = this.prepareAIContext(data.report);
    const interpretData = await this.callGeminiInterpret(context);

    return {
      success: true,
      data: {
        interpret: interpretData,
      },
    };
  }

  async save(userId: number, dto: SaveAnalysisDto): Promise<any> {
    const { report, interpret, landmarks, image_base64 } = dto.data;
    const tags = this.extractTags(report);

    const record = await this.prisma.userFaceLandmarks.create({
      data: {
        userId,
        report: report as any,
        metrics: interpret ? (interpret as any) : {},
        landmarks: landmarks || {},
        tags,
      },
    });

    return {
      success: true,
      data: {
        saved_id: record.id,
      },
    };
  }

  async getHistory(userId: number): Promise<any[]> {
    return this.prisma.userFaceLandmarks.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDetail(userId: number, id: number): Promise<any> {
    const record = await this.prisma.userFaceLandmarks.findFirst({
      where: { id, userId },
    });
    if (!record) throw new BadRequestException('Không tìm thấy bản ghi');
    return record;
  }

  private async callPythonService(file: Express.Multer.File): Promise<PythonApiResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const response = await lastValueFrom(
        this.httpService.post<PythonApiResponse>(this.pythonApiUrl, formData, {
          headers: formData.getHeaders(),
        }),
      );
      return response.data;
    } catch (e) {
      throw new InternalServerErrorException('Python service call failed');
    }
  }

  private async callGeminiInterpret(context: any): Promise<any> {
    const prompt = `
      Bạn là chuyên gia Nhân tướng học. Hãy viết bài luận giải dựa trên dữ liệu Ngũ Quan và Tam Đình sau:
      ${JSON.stringify(context)}
      YÊU CẦU:
      - Trả về JSON duy nhất, ngôn ngữ Tiếng Việt.
      - Cấu trúc: {"interpret": {"tam_dinh": {"thuong_dinh": "...", "trung_dinh": "...", "ha_dinh": "...", "tong_quan": "..."}, "ngu_quan": {"long_may": "...", "mat": "...", "mui": "...", "tai": "...", "mieng_cam": "..."}, "loi_khuyen": []}}
    `;

    try {
      let aiText = await this.googleGeminiService.generateText(prompt);
      aiText = aiText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(aiText);
      return parsed.interpret;
    } catch (error) {
      return PHYSIOGNOMY_FALLBACK;
    }
  }

  private prepareAIContext(report: any) {
    const r = report || {};
    const joinTraits = (arr: any[], fallback: string) =>
      arr && arr.length > 0 ? arr.map((i) => i.trait).join('. ') : fallback;

    return {
      tam_dinh: {
        thuong: joinTraits(r.tam_dinh?.filter((i: any) => i.trait.includes('Thượng')), PHYSIOGNOMY_FALLBACK.tam_dinh.thuong),
        trung: joinTraits(r.tam_dinh?.filter((i: any) => i.trait.includes('Trung')), PHYSIOGNOMY_FALLBACK.tam_dinh.trung),
        ha: joinTraits(r.tam_dinh?.filter((i: any) => i.trait.includes('Hạ')), PHYSIOGNOMY_FALLBACK.tam_dinh.ha),
      },
      ngu_quan: {
        long_may: joinTraits(r.long_may, PHYSIOGNOMY_FALLBACK.ngu_quan.long_may),
        mat: joinTraits(r.mat, PHYSIOGNOMY_FALLBACK.ngu_quan.mat),
        mui: joinTraits(r.mui, PHYSIOGNOMY_FALLBACK.ngu_quan.mui),
        tai: joinTraits(r.tai, PHYSIOGNOMY_FALLBACK.ngu_quan.tai),
        mieng_cam: joinTraits(r.mieng_cam, PHYSIOGNOMY_FALLBACK.ngu_quan.mieng_cam),
      },
    };
  }

  private extractTags(report: FaceAnalysisReport): string[] {
    const tags = new Set<string>();
    Object.keys(report).forEach((key) => {
      const items = (report as any)[key];
      if (Array.isArray(items)) {
        items.forEach((i) => {
          if (Array.isArray(i.tags)) i.tags.forEach((t: string) => tags.add(t));
        });
      }
    });
    return Array.from(tags);
  }
}