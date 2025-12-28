import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { lastValueFrom } from 'rxjs';
import FormData from 'form-data';
import {
  PythonApiResponse,
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
  ) { }

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

  async interpretTraits(dto: SaveAnalysisDto): Promise<any> {
    if (!dto || !dto.data || !dto.data.report) {
      throw new BadRequestException('Dữ liệu không hợp lệ');
    }

    const { name, birthday, gender, report } = dto.data;
    const context = this.prepareAIContext(report, { name, birthday, gender });
    const interpretData = await this.callGeminiInterpret(context, { name, birthday, gender });

    return {
      success: true,
      data: { interpret: interpretData },
    };
  }

  async save(
    userId: number,
    dto: SaveAnalysisDto & { name?: string; birthday?: string; gender?: string },
  ): Promise<any> {
    if (!dto || !dto.data) throw new BadRequestException('Dữ liệu không hợp lệ');

    const { name, birthday, gender, report, interpret, landmarks, imageUrl } = dto.data;
    const tags = this.extractTags(report);
    const record = await this.prisma.userFaceLandmarks.create({
      data: {
        userId,
        report: report as any,
        metrics: interpret ? (interpret as any) : {},
        landmarks: landmarks || {},
        tags,
        name: name || '',
        dob: birthday ? new Date(birthday) : new Date(),
        gender: gender || '',
        imageUrl: imageUrl || null,
      },
    });

    return { success: true, data: { saved_id: record.id } };
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
    
    // Map metrics thành interpret để match với response format
    const { metrics, ...rest } = record;
    return {
      ...rest,
      interpret: metrics || {},
    };
  }

  private async callPythonService(file: Express.Multer.File): Promise<PythonApiResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });

      const response = await lastValueFrom(
        this.httpService.post<PythonApiResponse>(this.pythonApiUrl, formData, {
          headers: formData.getHeaders(),
          timeout: 60000,
        }),
      );

      if (!response || !response.data) {
        throw new InternalServerErrorException('Python service trả về dữ liệu không hợp lệ');
      }

      return response.data;
    } catch (e: any) {
      console.error('Python service call failed:', e);
      if (e.code === 'ECONNREFUSED') {
        throw new InternalServerErrorException('Không thể kết nối Python service.');
      }
      if (e.code === 'ETIMEDOUT' || e.message?.includes('timeout')) {
        throw new InternalServerErrorException('Python service timeout.');
      }
      throw new InternalServerErrorException(`Python service lỗi: ${e.message || 'Unknown'}`);
    }
  }

  private async callGeminiInterpret(context: any, personalInfo?: { name?: string; birthday?: string; gender?: string }): Promise<any> {
    const personalInfoText = personalInfo 
      ? `\nThông tin cá nhân:\n- Tên: ${personalInfo.name || 'Chưa cung cấp'}\n- Ngày sinh: ${personalInfo.birthday || 'Chưa cung cấp'}\n- Giới tính: ${personalInfo.gender || 'Chưa cung cấp'}`
      : '';
    
    const prompt = `
      Bạn là chuyên gia Nhân tướng học. Viết luận giải dựa trên Ngũ Quan, Tam Đình, Ấn Đường:${personalInfoText}
      ${JSON.stringify(context)}
      YÊU CẦU:
      - JSON duy nhất, Tiếng Việt.
      - QUAN TRỌNG: Trả về JSON thuần túy, KHÔNG bao gồm markdown code blocks. Chỉ trả về nội dung JSON thuần túy, không có dấu backtick hoặc markdown syntax.
      - Cấu trúc: {
          "interpret": {
            "tong-quan": "Luận giải tổng quan mệnh cục dựa trên thông tin cá nhân (tên, ngày sinh, giới tính). Đây là phần tổng hợp toàn diện về vận mệnh, tính cách, và triển vọng cuộc đời của người được phân tích.(Phần này chỉ sử dụng kiến thức về Tử vi, chưa sử dụng đến kiến thức nhân tướng học)",
            "tam_dinh": { "thuong_dinh": "...", "trung_dinh": "...", "ha_dinh": "...", "tong_quan": "..." },
            "ngu_quan": { "long_may": "...", "mat": "...", "mui": "...", "tai": "...", "mieng_cam": "..." },
            "an_duong": { "mo_ta": "...", "y_nghia": "...", "danh_gia": "..." },
            "loi_khuyen": []
          }
        }
      - Trường "tong-quan" phải là luận giải tổng quan mệnh cục, kết hợp thông tin cá nhân với phân tích khuôn mặt để đưa ra nhận định toàn diện về vận mệnh, tính cách, và triển vọng cuộc đời.
    `;
    try {
      let aiText = await this.googleGeminiService.generateText(prompt);
      aiText = aiText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(aiText);
      const result = parsed.interpret;
      
      // Đảm bảo có trường tong-quan, nếu không có thì thêm fallback
      if (!result['tong-quan']) {
        result['tong-quan'] = PHYSIOGNOMY_FALLBACK['tong-quan'] || 'Dựa trên phân tích khuôn mặt và thông tin cá nhân, đây là một mệnh cục có nhiều tiềm năng phát triển.';
      }
      
      return result;
    } catch {
      const fallback = { ...PHYSIOGNOMY_FALLBACK };
      if (!fallback['tong-quan']) {
        fallback['tong-quan'] = 'Dựa trên phân tích khuôn mặt và thông tin cá nhân, đây là một mệnh cục có nhiều tiềm năng phát triển.';
      }
      return fallback;
    }
  }

  private prepareAIContext(report: any, personalInfo?: { name?: string; birthday?: string; gender?: string }) {
    const r = report || {};
    const joinTraits = (arr: any[], fallback: string) => (arr?.length ? arr.map((i) => i.trait).join('. ') : fallback);

    return {
      personalInfo: personalInfo || {},
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
      an_duong: r.an_duong || {
        mo_ta: 'Ấn đường nằm giữa hai lông mày, thuộc trung đình.',
        y_nghia: 'Phản ánh tinh thần, khí vận và sự thông suốt.',
        danh_gia: 'Sáng và rộng là dấu hiệu tốt.',
      },
    };
  }

  private extractTags(report: FaceAnalysisReport): string[] {
    const tags = new Set<string>();
    Object.values(report).forEach((items: any) => {
      if (Array.isArray(items)) {
        items.forEach((i) => Array.isArray(i.tags) && i.tags.forEach((t: string) => tags.add(t)));
      }
    });
    return Array.from(tags);
  }
}
