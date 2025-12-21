import { Injectable, BadRequestException, NotFoundException, Logger, ForbiddenException } from '@nestjs/common'; 
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateTuViChartDto } from './dto/create-tuvi-chart.dto';
import {
  TuViChart,
  TuViInput,
  House,
  AspectScores,
  THIEN_CAN,
  DIA_CHI,
  CUNG_NAMES_ARRAY,
  MAJOR_STARS,
  INTERP_TEMPLATES,
  ASPECT_WEIGHTS,
  NguHanhElement,
  THIEN_CAN_ARRAY,
  DIA_CHI_ARRAY,
} from './tuvi.interface';
import { GoogleGeminiService } from '../gemini/google-gemini.service';

@Injectable()
export class TuViService {
  constructor(private prisma: PrismaService,
    private googleGeminiService: GoogleGeminiService,
  ) { }

  private readonly logger = new Logger(TuViService.name);
  private yearToCanChi(year: number): { can: THIEN_CAN; chi: DIA_CHI } {
    return {
      can: THIEN_CAN_ARRAY[(year + 6) % 10],
      chi: DIA_CHI_ARRAY[(year + 8) % 12],
    };
  }

  private hourToBranchIndex(hour: number): number {
    return Math.floor((hour + 1) / 2) % 12;
  }

  private napAmOfYear(can: THIEN_CAN): NguHanhElement {
    const map: Record<THIEN_CAN, NguHanhElement> = {
      Giáp: 'Mộc',
      Ất: 'Mộc',
      Bính: 'Hỏa',
      Đinh: 'Hỏa',
      Mậu: 'Thổ',
      Kỷ: 'Thổ',
      Canh: 'Kim',
      Tân: 'Kim',
      Nhâm: 'Thủy',
      Quý: 'Thủy',
    };
    return map[can];
  }

  private initHouses(menhIdx: number): House[] {
    return CUNG_NAMES_ARRAY.map((name, i) => ({
      cung_name: name,
      branch: DIA_CHI[(menhIdx + i) % 12],
      major_stars: [],
      minor_stars: [],
      analysis: '',
    }));
  }

  private sampleRulesAssign(
    houses: House[],
    can: THIEN_CAN,
    chi: DIA_CHI,
    menhElement: NguHanhElement,
  ): House[] {
    const map: Record<string, House> = {};
    houses.forEach(h => (map[h.cung_name] = h));

    const put = (cung: string, star: MAJOR_STARS) => {
      if (!map[cung].major_stars.includes(star)) {
        map[cung].major_stars.push(star);
      }
    };

    if (['Bính', 'Đinh'].includes(can)) put('Mệnh', MAJOR_STARS.TU_VI);
    if (['Thìn', 'Tỵ', 'Ngọ'].includes(chi)) put('Quan lộc', MAJOR_STARS.THIEN_PHU);
    if (menhElement === 'Thủy') put('Phu thê', MAJOR_STARS.THAI_AM);
    if (['Mậu', 'Kỷ'].includes(can)) put('Tài bạch', MAJOR_STARS.VU_KHUC);

    put('Phúc đức', MAJOR_STARS.THIEN_DONG);
    put('Huynh đệ', MAJOR_STARS.THIEN_CO);

    if (map['Mệnh'].major_stars.length === 0) {
      put('Mệnh', MAJOR_STARS.LIEM_TRINH);
    }

    return houses;
  }

  private interpretHouse(h: House): string {
    const stars = h.major_stars.length ? h.major_stars.join(', ') : 'Không có chính tinh';

    const notes: string[] = [];
    if (h.major_stars.includes(MAJOR_STARS.TU_VI)) notes.push('uy quyền, lãnh đạo');
    if (h.major_stars.includes(MAJOR_STARS.THIEN_PHU)) notes.push('ổn định, quản lý');
    if (h.major_stars.includes(MAJOR_STARS.THAI_AM)) notes.push('dịu dàng, tài sản');
    if (h.major_stars.includes(MAJOR_STARS.VU_KHUC)) notes.push('giỏi tài chính');
    if (h.major_stars.includes(MAJOR_STARS.LIEM_TRINH)) notes.push('nghiêm túc');
    if (h.major_stars.includes(MAJOR_STARS.THIEN_DONG)) notes.push('hòa nhã');

    if (!notes.length) notes.push('trung bình, cần phối hợp cung khác');

    const tpl = INTERP_TEMPLATES[h.cung_name] ?? '{stars}: {comment}';
    return tpl.replace('{stars}', stars).replace('{comment}', notes.join(', '));
  }

  private aggregateAspects(houses: House[]): AspectScores {
    const s: AspectScores = {
      personality: 0,
      career: 0,
      love: 0,
      wealth: 0,
      health: 0,
    };

    houses.forEach(h => {
      const w = ASPECT_WEIGHTS[h.cung_name] ?? [0, 0, 0, 0, 0];
      const n = Math.max(1, h.major_stars.length);
      s.personality += w[0] * n;
      s.career += w[1] * n;
      s.love += w[2] * n;
      s.wealth += w[3] * n;
      s.health += w[4] * n;
    });

    const max = Math.max(...Object.values(s), 1);
    const scale = 9 / max;

    (Object.keys(s) as (keyof AspectScores)[]).forEach(k => {
      s[k] = Math.min(10, Math.max(1, Math.round(s[k] * scale) + 1));
    });

    return s;
  }

  async generateTuViChart(userId: number, dto: CreateTuViChartDto): Promise<TuViChart> {
    const birthDate = new Date(dto.birthDate);
    if (isNaN(birthDate.getTime())) {
      throw new BadRequestException('Invalid birthDate');
    }

    const { can, chi } = this.yearToCanChi(birthDate.getFullYear());
    const menhElement = this.napAmOfYear(can);
    const menhIdx = this.hourToBranchIndex(dto.birthHour);

    let houses = this.initHouses(menhIdx);
    houses = this.sampleRulesAssign(houses, can, chi, menhElement);
    houses.forEach(h => (h.analysis = this.interpretHouse(h)));

    const aspects = this.aggregateAspects(houses);

    const input: TuViInput = {
      birthDate: dto.birthDate,
      birthHour: dto.birthHour,
      gender: dto.gender,
      birthPlace: dto.birthPlace,
      isLunar: dto.isLunar ?? false,
      can,
      chi,
      menh: menhElement,
    };

    const chart: TuViChart = {
      input,
      houses,
      aspects,
      interpretationAI: null,
    };
    console.log(can)
    await this.prisma.userTuViChart.create({
      data: {
        userId,
        birthDate,
        birthHour: dto.birthHour,
        gender: dto.gender,
        birthPlace: dto.birthPlace,
        isLunar: dto.isLunar ?? false,
        can,
        chi,
        menhElement,
        chartData: chart as unknown as Prisma.InputJsonValue,
        status: 'GENERATED',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return chart;
  }

  async getTuViChartById(chartId: string | number, requestingUserId: number): Promise<TuViChart> { 
    const id = Number(chartId);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid chartId');
    }

    const record = await this.prisma.userTuViChart.findUnique({
      where: { id },
    });

    if (!record) {
      this.logger.warn(`Chart ${id} not found for user ${requestingUserId}.`); 
      throw new NotFoundException(`Chart ${chartId} not found.`);
    }

    if (record.userId !== requestingUserId) {
      this.logger.warn(`User ${requestingUserId} attempted to access chart ${id} owned by ${record.userId}. Forbidden.`); // Log vi phạm
      throw new ForbiddenException('Bạn không có quyền truy cập lá số này.'); // Trả mã 403
    }

    let tuviChartData: TuViChart;
    if (record.chartData === null) {
      this.logger.error(`Chart data is null for chart ID: ${id}.`);
      throw new BadRequestException('Chart data is missing for this Tu Vi chart.');
    }
    if (typeof record.chartData === 'string') {
      try {
        tuviChartData = JSON.parse(record.chartData) as unknown as TuViChart;
      } catch (e) {
        this.logger.error(`Failed to parse string chart data for chart ID: ${id}. Error: ${e.message}`);
        throw new BadRequestException('Failed to parse chart data from database.');
      }
    } else if (typeof record.chartData === 'object') {
      tuviChartData = record.chartData as unknown as TuViChart;
    } else {
      this.logger.error(`Invalid chart data type for chart ID: ${id}. Type: ${typeof record.chartData}`);
      throw new BadRequestException('Invalid chart data format in database.');
    }

    return tuviChartData; 
  }


  async requestAIInterpretation(userId: number, chartId: number): Promise<any> {
    this.logger.debug(`Requesting AI interpretation for chart ID: ${chartId} by user ID: ${userId}`);
    const record = await this.prisma.userTuViChart.findUnique({
      where: { id: chartId },
      include: { user: true },
    });

    if (!record) {
      this.logger.warn(`Chart ${chartId} not found for AI interpretation by user ${userId}.`);
      throw new NotFoundException(`Chart ${chartId} not found.`);
    }

    if (record.userId !== userId) {
      this.logger.warn(`User ${userId} attempted to request AI interpretation for chart ${chartId} owned by ${record.userId}. Forbidden.`); // Log vi phạm
      throw new ForbiddenException('Bạn không có quyền yêu cầu luận giải cho lá số này.');
    }

    let tuviChartData: TuViChart;

    if (record.chartData === null) {
      this.logger.error(`Chart data is null for chart ID: ${chartId}.`);
      throw new BadRequestException('Chart data is missing for this Tu Vi chart.');
    }

    if (typeof record.chartData === 'string') {
      try {
        tuviChartData = JSON.parse(record.chartData) as unknown as TuViChart;
      } catch (e) {
        this.logger.error(`Failed to parse string chart data for chart ID: ${chartId}. Error: ${e.message}`);
        throw new BadRequestException('Failed to parse chart data from database.');
      }
    } else if (typeof record.chartData === 'object') {
      tuviChartData = record.chartData as unknown as TuViChart;
    } else {
      this.logger.error(`Invalid chart data type for chart ID: ${chartId}. Type: ${typeof record.chartData}`);
      throw new BadRequestException('Invalid chart data format in database.');
    }
    const userName = record.user?.fullName || record.user?.userName || 'bạn';

    const generalInfoSummary = `
        - Can năm: ${record.can}
        - Chi năm: ${record.chi}
        - Mệnh Ngũ hành: ${record.menhElement}
      `;

    const housesSummary = tuviChartData.houses.map(house => {
      const stars = house.major_stars.length > 0 ? house.major_stars.join(', ') : 'không có sao chính';
      return `- Cung ${house.cung_name} tại chi ${house.branch}: các sao chính: ${stars}.`;
    }).join('\n');

    const aspectsSummary = `
        - Tính cách: ${tuviChartData.aspects.personality}/10
        - Sự nghiệp: ${tuviChartData.aspects.career}/10
        - Tình cảm: ${tuviChartData.aspects.love}/10
        - Tài lộc: ${tuviChartData.aspects.wealth}/10
        - Sức khỏe: ${tuviChartData.aspects.health}/10
      `;

    const prompt = `
      Chào bạn ${userName}, tôi là trợ lý AI chuyên về Tử Vi phương Đông. Tôi sẽ luận giải lá số của bạn dựa trên các thông tin đã được tính toán dưới đây.

      Hãy tổng hợp, phân tích và diễn giải lá số này một cách chi tiết, dễ hiểu, tích cực và mang tính định hướng.

      **Thông tin cơ bản lá số:**
      ${generalInfoSummary}

      **Chi tiết 12 cung và các sao chính:**
      ${housesSummary}

      **Đánh giá tổng quan các khía cạnh:**
      ${aspectsSummary}

      Bản luận giải cần tập trung vào:
      1.  **Tính cách và tố chất:** Phân tích bản mệnh.
      2.  **Sự nghiệp và công danh:** Cơ hội, thách thức trong công việc.
      3.  **Tài lộc và tiền bạc:** Khả năng tài chính, cách quản lý.
      4.  **Tình duyên và gia đạo:** Đường tình cảm, hôn nhân, gia đình.
      5.  **Sức khỏe và thể chất:** Các vấn đề cần lưu ý.
      6.  **Lời khuyên tổng quát:** Định hướng phát triển bản thân và tận dụng vận may.

      Viết bằng tiếng Việt, có cấu trúc rõ ràng (dùng tiêu đề phụ hoặc gạch đầu dòng), giọng văn thân thiện, chuyên nghiệp, không dài quá 800 từ và không dưới 400 từ. TUYỆT ĐỐI không yêu cầu thêm bất kỳ thông tin cá nhân nào của người dùng.
      `;

    this.logger.verbose(`Sending prompt for chart ID ${chartId} to Gemini. Prompt length: ${prompt.length} characters.`);
    const aiInterpretation = await this.googleGeminiService.generateText(prompt);
    this.logger.debug(`Received AI interpretation for chart ID ${chartId}. Interpretation length: ${aiInterpretation.length} characters.`);


    await this.prisma.userTuViChart.update({
      where: { id: chartId },
      data: {
        interpretationAI: aiInterpretation,
        status: 'AI_INTERPRETED',
        updatedAt: new Date(),
      },
    });

    this.logger.debug(`AI interpretation saved for chart ID ${chartId}.`);

    return {
      message: 'AI interpretation generated successfully.',
      interpretation: aiInterpretation,
    };
  }
}