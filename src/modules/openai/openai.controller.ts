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
import { OpenAIService } from './openai.service';
import { LoveDeepTarotDto } from '../tarot/dto/love-deep-tarot.dto';

@ApiTags('OpenAI Tarot')
@ApiBearerAuth()
@Controller('openai/tarot')
export class OpenAIController {
  constructor(private readonly openaiService: OpenAIService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('love/deep')
  @ApiOperation({
    summary: 'Bói tarot tình yêu sâu sắc (OpenAI)',
    description: 'Nhận câu hỏi về tình yêu và 5 lá bài tarot để luận giải sâu sắc về hành trình tình yêu. Mỗi lá bài trả lời một câu hỏi cụ thể: năng lượng khi bước vào mối quan hệ, thử thách, dư âm quá khứ, điều cần chữa lành, và thông điệp về yêu thương bản thân. Sử dụng AI OpenAI (GPT-4o-mini) để phân tích.',
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
    return this.openaiService.getLoveDeepReading(dto);
  }
}

