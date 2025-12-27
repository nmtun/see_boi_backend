import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { TarotService } from './tarot.service';
import { DailyTarotDto } from './dto/daily-tarot.dto';
import { YesNoTarotDto } from './dto/yes-no-tarot.dto';
import { OneCardTarotDto } from './dto/one-card-tarot.dto';
import { LoveSimpleTarotDto } from './dto/love-simple-tarot.dto';
import { LoveDeepTarotDto } from './dto/love-deep-tarot.dto';

@ApiTags('Tarot')
@ApiBearerAuth()
@Controller('tarot')
export class TarotController {
  constructor(private readonly tarotService: TarotService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('daily')
  @ApiOperation({
    summary: 'Bói tarot hàng ngày',
    description: 'Nhận tên, sinh nhật và 3 lá bài tarot để luận giải về Tình yêu, Tâm trạng và Tiền bạc trong ngày hôm nay. Sử dụng AI Gemini để phân tích và đưa ra luận giải chi tiết.',
  })
  @ApiBody({
    type: DailyTarotDto,
    description: 'Thông tin người xem và 3 lá bài tarot',
  })
  @ApiResponse({
    status: 200,
    description: 'Luận giải tarot thành công',
    schema: {
      example: {
        success: true,
        data: {
          name: 'Nguyễn Văn A',
          birthday: '2002-08-15',
          cards: {
            card1: { name: 'The Fool', question: 'Tình yêu' },
            card2: { name: 'The Magician', question: 'Tâm trạng' },
            card3: { name: 'The High Priestess', question: 'Tiền bạc' },
          },
          reading: {
            'tinh-yeu': 'Lá bài The Fool mang đến năng lượng mới mẻ và khởi đầu trong tình yêu. Hôm nay có thể là thời điểm tốt để bạn mở lòng với những cơ hội mới...',
            'tam-trang': 'The Magician cho thấy bạn đang có năng lượng tích cực và khả năng biến ý tưởng thành hiện thực. Tâm trạng hôm nay sẽ rất tốt...',
            'tien-bac': 'The High Priestess khuyên bạn nên lắng nghe trực giác khi đưa ra quyết định tài chính. Hãy cân nhắc kỹ trước khi đầu tư...',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ (thiếu tên, sinh nhật hoặc tên lá bài)',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc token không hợp lệ',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi server khi gọi AI service',
  })
  async daily(@Body() dto: DailyTarotDto) {
    if (!dto.name || !dto.birthday || !dto.card1 || !dto.card2 || !dto.card3) {
      throw new BadRequestException('Thiếu thông tin: tên, sinh nhật hoặc tên lá bài tarot');
    }
    return this.tarotService.getDailyReading(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('yes-no')
  @ApiOperation({
    summary: 'Bói tarot yes/no',
    description: 'Nhận câu hỏi yes/no, 2 lá bài tarot đã bốc, và lá bài đã lật. Trả về câu trả lời yes/no dựa trên lá bài đã lật, và giải thích sâu hơn về lá bài chưa lật (không tiết lộ tên lá bài chưa lật). Sử dụng AI Gemini để phân tích.',
  })
  @ApiBody({
    type: YesNoTarotDto,
    description: 'Câu hỏi, 2 lá bài tarot và lá bài đã lật',
  })
  @ApiResponse({
    status: 200,
    description: 'Luận giải yes/no tarot thành công',
    schema: {
      example: {
        success: true,
        data: {
          question: 'Tôi có nên thay đổi công việc hiện tại không?',
          revealedCard: {
            name: 'The Fool',
            position: 'card1',
          },
          answer: {
            yesNo: 'yes',
            explanation: 'Lá bài The Fool mang đến năng lượng của sự khởi đầu mới và những cuộc phiêu lưu. Đây là dấu hiệu tích cực cho việc thay đổi công việc...',
            deeperInsight: 'Lá bài thứ hai chứa đựng những thông điệp sâu sắc về hành trình phía trước của bạn. Nó nhắc nhở bạn về tầm quan trọng của việc cân nhắc kỹ lưỡng...',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ (thiếu câu hỏi, lá bài hoặc thông tin lá bài đã lật)',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc token không hợp lệ',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi server khi gọi AI service',
  })
  async yesNo(@Body() dto: YesNoTarotDto) {
    if (!dto.question || !dto.card1 || !dto.card2 || !dto.revealedCard) {
      throw new BadRequestException('Thiếu thông tin: câu hỏi, lá bài tarot hoặc thông tin lá bài đã lật');
    }
    return this.tarotService.getYesNoReading(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('one-card')
  @ApiOperation({
    summary: 'Bói tarot một lá bài',
    description: 'Nhận câu hỏi và 1 lá bài tarot để luận giải. Sử dụng AI Gemini để phân tích và đưa ra luận giải chi tiết về câu hỏi dựa trên ý nghĩa của lá bài.',
  })
  @ApiBody({
    type: OneCardTarotDto,
    description: 'Câu hỏi và lá bài tarot',
  })
  @ApiResponse({
    status: 200,
    description: 'Luận giải one-card tarot thành công',
    schema: {
      example: {
        success: true,
        data: {
          question: 'Tôi nên làm gì để cải thiện mối quan hệ hiện tại?',
          card: {
            name: 'The Lovers',
          },
          reading: {
            interpretation: 'Lá bài The Lovers mang đến thông điệp về sự kết nối và lựa chọn trong tình yêu. Lá bài này nhắc nhở bạn về tầm quan trọng của việc cân bằng giữa trái tim và lý trí...',
            guidance: 'Để cải thiện mối quan hệ, hãy tập trung vào giao tiếp chân thành và lắng nghe đối phương. Hãy đưa ra những lựa chọn dựa trên cảm xúc thật sự của bạn...',
            keyMessage: 'Hãy lắng nghe trái tim và đưa ra lựa chọn chân thành trong mối quan hệ của bạn.',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ (thiếu câu hỏi hoặc tên lá bài)',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc token không hợp lệ',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi server khi gọi AI service',
  })
  async oneCard(@Body() dto: OneCardTarotDto) {
    if (!dto.question || !dto.card) {
      throw new BadRequestException('Thiếu thông tin: câu hỏi hoặc tên lá bài tarot');
    }
    return this.tarotService.getOneCardReading(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('love/simple')
  @ApiOperation({
    summary: 'Bói tarot tình yêu đơn giản',
    description: 'Nhận câu hỏi về tình yêu và 3 lá bài tarot để luận giải theo dòng thời gian: Quá khứ, Hiện tại, Tương lai. Sử dụng AI Gemini để phân tích và đưa ra luận giải chi tiết.',
  })
  @ApiBody({
    type: LoveSimpleTarotDto,
    description: 'Câu hỏi về tình yêu và 3 lá bài tarot',
  })
  @ApiResponse({
    status: 200,
    description: 'Luận giải love simple tarot thành công',
    schema: {
      example: {
        success: true,
        data: {
          question: 'Tình yêu của tôi sẽ phát triển như thế nào?',
          cards: {
            card1: { name: 'The Lovers', period: 'Quá khứ' },
            card2: { name: 'The Two of Cups', period: 'Hiện tại' },
            card3: { name: 'The Sun', period: 'Tương lai' },
          },
          reading: {
            'qua-khu': 'Lá bài The Lovers cho thấy quá khứ tình yêu của bạn đã có những khoảnh khắc quan trọng về sự kết nối và lựa chọn. Bạn đã trải qua những quyết định quan trọng trong tình yêu...',
            'hien-tai': 'Lá bài The Two of Cups phản ánh tình hình hiện tại của bạn với sự hòa hợp và kết nối sâu sắc. Đây là thời điểm của sự cân bằng và hiểu biết lẫn nhau...',
            'tuong-lai': 'Lá bài The Sun mang đến những tín hiệu tích cực về tương lai tình yêu của bạn. Tương lai hứa hẹn những khoảnh khắc hạnh phúc và sáng sủa...',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ (thiếu câu hỏi hoặc tên lá bài)',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc token không hợp lệ',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi server khi gọi AI service',
  })
  async loveSimple(@Body() dto: LoveSimpleTarotDto) {
    if (!dto.question || !dto.card1 || !dto.card2 || !dto.card3) {
      throw new BadRequestException('Thiếu thông tin: câu hỏi hoặc tên lá bài tarot');
    }
    return this.tarotService.getLoveSimpleReading(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('love/deep')
  @ApiOperation({
    summary: 'Bói tarot tình yêu sâu sắc',
    description: 'Nhận câu hỏi về tình yêu và 5 lá bài tarot để luận giải sâu sắc về hành trình tình yêu. Mỗi lá bài trả lời một câu hỏi cụ thể: năng lượng khi bước vào mối quan hệ, thử thách, dư âm quá khứ, điều cần chữa lành, và thông điệp về yêu thương bản thân. Sử dụng AI Gemini để phân tích.',
  })
  @ApiBody({
    type: LoveDeepTarotDto,
    description: 'Câu hỏi về tình yêu và 5 lá bài tarot',
  })
  @ApiResponse({
    status: 200,
    description: 'Luận giải love deep tarot thành công',
    schema: {
      example: {
        success: true,
        data: {
          question: 'Tôi muốn hiểu sâu hơn về hành trình tình yêu của mình',
          cards: {
            card1: { name: 'The Fool', question: 'Năng lượng khi bước vào mối quan hệ' },
            card2: { name: 'The Tower', question: 'Thử thách hay vấn đề trên hành trình yêu thương' },
            card3: { name: 'The Moon', question: 'Dư âm từ những mối tình đã qua' },
            card4: { name: 'The Star', question: 'Điều cần chữa lành, hoàn thiện hoặc học hỏi' },
            card5: { name: 'The Sun', question: 'Thông điệp về yêu thương bản thân' },
          },
          reading: {
            'nang-luong': 'Lá bài The Fool cho thấy bạn mang theo năng lượng của sự khởi đầu mới, sự ngây thơ tích cực, và tinh thần phiêu lưu khi bước vào mối quan hệ...',
            'thu-thach': 'Lá bài The Tower chỉ ra những thử thách có thể xuất hiện như sự thay đổi đột ngột, những kỳ vọng không thực tế, hoặc sự sụp đổ của những niềm tin cũ...',
            'du-am': 'Lá bài The Moon phản ánh dư âm từ những mối tình đã qua với những cảm xúc chưa được giải quyết, những nỗi sợ hãi, và những ký ức mơ hồ...',
            'chua-lanh': 'Lá bài The Star cho biết bạn cần chữa lành bằng cách tin tưởng vào hy vọng, tìm kiếm sự hướng dẫn tinh thần, và học cách tha thứ cho bản thân và người khác...',
            'yeu-thuong-ban-than': 'Lá bài The Sun mang đến thông điệp tích cực về việc yêu thương bản thân. Hãy tỏa sáng, tận hưởng niềm vui, và nhận ra giá trị của chính mình...',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ (thiếu câu hỏi hoặc tên lá bài)',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc token không hợp lệ',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi server khi gọi AI service',
  })
  async loveDeep(@Body() dto: LoveDeepTarotDto) {
    if (!dto.question || !dto.card1 || !dto.card2 || !dto.card3 || !dto.card4 || !dto.card5) {
      throw new BadRequestException('Thiếu thông tin: câu hỏi hoặc tên lá bài tarot');
    }
    return this.tarotService.getLoveDeepReading(dto);
  }
}

