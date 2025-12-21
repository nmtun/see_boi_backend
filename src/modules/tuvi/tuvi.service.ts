import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
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
  MAJOR_STARS,
  NguHanhElement,
  THIEN_CAN_ARRAY,
  DIA_CHI_ARRAY,
  CUNG_NAMES_ARRAY,
} from './tuvi.interface';
import { GoogleGeminiService } from '../gemini/google-gemini.service';
import { Solar, Lunar } from 'lunar-javascript';

// --- MAPPING TỪ CHỮ HÁN SANG VIỆT ---
const CAN_MAP_CN_VN: Record<string, THIEN_CAN> = {
  '甲': 'Giáp', '乙': 'Ất', '丙': 'Bính', '丁': 'Đinh', '戊': 'Mậu',
  '己': 'Kỷ', '庚': 'Canh', '辛': 'Tân', '壬': 'Nhâm', '癸': 'Quý'
};

const CHI_MAP_CN_VN: Record<string, DIA_CHI> = {
  '子': 'Tý', '丑': 'Sửu', '寅': 'Dần', '卯': 'Mão', '辰': 'Thìn', '巳': 'Tỵ',
  '午': 'Ngọ', '未': 'Mùi', '申': 'Thân', '酉': 'Dậu', '戌': 'Tuất', '亥': 'Hợi'
};

const ELEMENT_TO_CUC: Record<NguHanhElement, number> = {
  'Thủy': 2, 'Mộc': 3, 'Kim': 4, 'Thổ': 5, 'Hỏa': 6
};

// Map Nạp Âm
const NAP_AM_MAP: Record<string, NguHanhElement> = {
  'GiápTý': 'Kim', 'ẤtSửu': 'Kim', 'BínhDần': 'Hỏa', 'ĐinhMão': 'Hỏa', 'MậuThìn': 'Mộc', 'KỷTỵ': 'Mộc',
  'CanhNgọ': 'Thổ', 'TânMùi': 'Thổ', 'NhâmThân': 'Kim', 'QuýDậu': 'Kim', 'GiápTuất': 'Hỏa', 'ẤtHợi': 'Hỏa',
  'BínhTý': 'Thủy', 'ĐinhSửu': 'Thủy', 'MậuDần': 'Thổ', 'KỷMão': 'Thổ', 'CanhThìn': 'Kim', 'TânTỵ': 'Kim',
  'NhâmNgọ': 'Mộc', 'QuýMùi': 'Mộc', 'GiápThân': 'Thủy', 'ẤtDậu': 'Thủy', 'BínhTuất': 'Thổ', 'ĐinhHợi': 'Thổ',
  'MậuTý': 'Hỏa', 'KỷSửu': 'Hỏa', 'CanhDần': 'Mộc', 'TânMão': 'Mộc', 'NhâmThìn': 'Thủy', 'QuýTỵ': 'Thủy',
  'GiápNgọ': 'Kim', 'ẤtMùi': 'Kim', 'BínhThân': 'Hỏa', 'ĐinhDậu': 'Hỏa', 'MậuTuất': 'Mộc', 'KỷHợi': 'Mộc',
  'CanhTý': 'Thổ', 'TânSửu': 'Thổ', 'NhâmDần': 'Kim', 'QuýMão': 'Kim', 'GiápThìn': 'Hỏa', 'ẤtTỵ': 'Hỏa',
  'BínhNgọ': 'Thủy', 'ĐinhMùi': 'Thủy', 'MậuThân': 'Thổ', 'KỷDậu': 'Thổ', 'CanhTuất': 'Kim', 'TânHợi': 'Kim',
  'NhâmTý': 'Mộc', 'QuýSửu': 'Mộc', 'GiápDần': 'Thủy', 'ẤtMão': 'Thủy', 'BínhThìn': 'Thổ', 'ĐinhTỵ': 'Thổ',
  'MậuNgọ': 'Hỏa', 'KỷMùi': 'Hỏa', 'CanhThân': 'Mộc', 'TânDậu': 'Mộc', 'NhâmTuất': 'Thủy', 'QuýHợi': 'Thủy',
};

@Injectable()
export class TuViService {
  constructor(
    private prisma: PrismaService,
    private googleGeminiService: GoogleGeminiService,
  ) {}

  private readonly logger = new Logger(TuViService.name);


  private getLunarDate(dateStr: string, isLunarInput: boolean) {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();

    let lunar: Lunar;
    let solar: Solar;

    if (isLunarInput) {
      lunar = Lunar.fromYmd(y, m, day);
      solar = lunar.getSolar();
    } else {
      solar = Solar.fromYmd(y, m, day);
      lunar = solar.getLunar();
    }

    const canYear = CAN_MAP_CN_VN[lunar.getYearGan()] || 'Giáp';
    const chiYear = CHI_MAP_CN_VN[lunar.getYearZhi()] || 'Tý';
    
    return {
      day: lunar.getDay(),
      month: lunar.getMonth(),
      year: lunar.getYear(),
      canYear,
      chiYear,
      solarDate: new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay())
    };
  }

  private hourToBranchIndex(hour: number): number {
    if (hour >= 23 || hour < 1) return 0;
    return Math.floor((hour + 1) / 2) % 12;
  }

  private calcMenhIndex(lunarMonth: number, hourIdx: number): number {
    const m = Math.abs(lunarMonth);
    let idx = (2 + (m - 1) - hourIdx);
    while (idx < 0) idx += 12;
    return idx % 12;
  }

  private getCuc(canYear: THIEN_CAN, menhBranchIdx: number): number {
    const canIdx = THIEN_CAN_ARRAY.indexOf(canYear);
    const startCanMap = [2, 4, 6, 8, 0];
    const startCanOfTiger = startCanMap[canIdx % 5];
    let steps = menhBranchIdx - 2; 
    if (steps < 0) steps += 12;
    const menhCan = THIEN_CAN_ARRAY[(startCanOfTiger + steps) % 10];
    const menhChi = DIA_CHI_ARRAY[menhBranchIdx];
    const key = `${menhCan}${menhChi}`;
    const element = NAP_AM_MAP[key] || 'Thủy';
    return ELEMENT_TO_CUC[element];
  }

  private getTuViPosition(cuc: number, lunarDay: number): number {
    const quotient = Math.floor(lunarDay / cuc);
    const remainder = lunarDay % cuc;
    let posFromTiger = 0;
    if (remainder === 0) {
      posFromTiger = quotient - 1;
    } else {
      posFromTiger = quotient + (cuc - remainder);
    }
    return (2 + posFromTiger) % 12;
  }


  async generateTuViChart(userId: number, dto: CreateTuViChartDto): Promise<TuViChart> {
    try {
      const isLunarInput = dto.isLunar ?? false;

      const { day, month, canYear, chiYear, solarDate } = this.getLunarDate(dto.birthDate, isLunarInput);
      const menhElement = NAP_AM_MAP[`${canYear}${chiYear}`] || 'Kim';

      const hourIdx = this.hourToBranchIndex(dto.birthHour);
      const menhIdx = this.calcMenhIndex(month, hourIdx);
      const cuc = this.getCuc(canYear, menhIdx);
      const tuViPos = this.getTuViPosition(cuc, day);

      const houses: House[] = DIA_CHI_ARRAY.map(branch => ({
        cung_name: 'Mệnh',
        branch,
        major_stars: [],
        minor_stars: [],
        analysis: '',
      }));

      CUNG_NAMES_ARRAY.forEach((name, i) => {
        let pos = (menhIdx - i);
        while (pos < 0) pos += 12;
        houses[pos % 12].cung_name = name;
      });

      const tuViGroup = [
        { star: MAJOR_STARS.TU_VI, offset: 0 }, { star: MAJOR_STARS.THIEN_CO, offset: 1 },
        { star: MAJOR_STARS.THAI_DUONG, offset: 3 }, { star: MAJOR_STARS.VU_KHUC, offset: 4 },
        { star: MAJOR_STARS.THIEN_DONG, offset: 5 }, { star: MAJOR_STARS.LIEM_TRINH, offset: 8 },
      ];
      tuViGroup.forEach(s => {
        let pos = tuViPos - s.offset;
        while (pos < 0) pos += 12;
        houses[pos % 12].major_stars.push(s.star);
      });

      const thienPhuPos = (16 - tuViPos) % 12;
      const thienPhuGroup = [
        { star: MAJOR_STARS.THIEN_PHU, offset: 0 }, { star: MAJOR_STARS.THAI_AM, offset: 1 },
        { star: MAJOR_STARS.THAM_LANG, offset: 2 }, { star: MAJOR_STARS.CU_MON, offset: 3 },
        { star: MAJOR_STARS.THIEN_TUONG, offset: 4 }, { star: MAJOR_STARS.THIEN_LUONG, offset: 5 },
        { star: MAJOR_STARS.THAT_SAT, offset: 6 }, { star: MAJOR_STARS.PHA_QUAN, offset: 10 },
      ];
      thienPhuGroup.forEach(s => {
        const pos = (thienPhuPos + s.offset) % 12;
        houses[pos % 12].major_stars.push(s.star);
      });

      houses.forEach(h => {
        const starStr = h.major_stars.length ? h.major_stars.join(', ') : 'Vô chính diệu';
        h.analysis = `${h.cung_name} có ${starStr}`;
      });

      const aspects: AspectScores = { personality: 5, career: 5, love: 5, wealth: 5, health: 5 };

      const chart: TuViChart = {
        input: {
          birthDate: dto.birthDate,
          birthHour: dto.birthHour,
          gender: dto.gender,
          birthPlace: dto.birthPlace,
          isLunar: isLunarInput, 
          can: canYear,
          chi: chiYear,
          menh: menhElement
        },
        houses,
        aspects,
        interpretationAI: null
      };

      await this.prisma.userTuViChart.create({
        data: {
          userId,
          birthDate: solarDate,
          birthHour: dto.birthHour,
          gender: dto.gender as 'nam' | 'nữ',
          birthPlace: dto.birthPlace,
          isLunar: isLunarInput, 
          can: canYear,
          chi: chiYear,
          menhElement,
          chartData: chart as unknown as Prisma.InputJsonValue,
          status: 'GENERATED',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      return chart;

    } catch (error) {
      this.logger.error(`Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Lỗi tính toán tử vi');
    }
  }

  async getTuViChartById(chartId: string | number, requestingUserId: number): Promise<TuViChart> {
    const id = Number(chartId);
    if (isNaN(id)) throw new BadRequestException('ID không hợp lệ');

    const record = await this.prisma.userTuViChart.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Không tìm thấy');
    if (record.userId !== requestingUserId) throw new ForbiddenException('Không có quyền');

    return (typeof record.chartData === 'string' ? JSON.parse(record.chartData) : record.chartData) as TuViChart;
  }

  async requestAIInterpretation(userId: number, chartId: number): Promise<any> {
    const record = await this.prisma.userTuViChart.findUnique({ where: { id: chartId } });
    if (!record || record.userId !== userId) throw new ForbiddenException('Lỗi quyền truy cập');

    const chart = (typeof record.chartData === 'string' ? JSON.parse(record.chartData) : record.chartData) as TuViChart;
    const summary = chart.houses.map(h => 
      `- ${h.cung_name} (${h.branch}): ${h.major_stars.join(', ') || 'Vô chính diệu'}`
    ).join('\n');

    const prompt = `Luận giải tử vi ngắn gọn:\n${summary}`;
    const aiResp = await this.googleGeminiService.generateText(prompt);
    
    chart.interpretationAI = aiResp;
    await this.prisma.userTuViChart.update({
      where: { id: chartId },
      data: { chartData: chart as unknown as Prisma.InputJsonValue, updatedAt: new Date() }
    });
    return { "aiResponse" :aiResp};
  }
}