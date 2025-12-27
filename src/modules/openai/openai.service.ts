import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { OpenAIAPIService } from './openai-api.service';
import { LoveDeepTarotDto } from '../tarot/dto/love-deep-tarot.dto';

@Injectable()
export class OpenAIService {
  constructor(private readonly openaiApiService: OpenAIAPIService) {}

  async getLoveDeepReading(dto: LoveDeepTarotDto): Promise<any> {
    const { question, card1, card2, card3, card4, card5 } = dto;

    // Tạo prompt cho OpenAI
    const prompt = this.prepareLoveDeepPrompt(question, card1, card2, card3, card4, card5);

    try {
      // Gọi OpenAI API
      let aiText = await this.openaiApiService.generateText(prompt);
      aiText = aiText.replace(/```json|```/g, '').trim();

      // Parse JSON response
      const parsed = JSON.parse(aiText);
      
      return {
        success: true,
        data: {
          question,
          cards: {
            card1: { name: card1, question: 'Năng lượng khi bước vào mối quan hệ' },
            card2: { name: card2, question: 'Thử thách hay vấn đề trên hành trình yêu thương' },
            card3: { name: card3, question: 'Dư âm từ những mối tình đã qua' },
            card4: { name: card4, question: 'Điều cần chữa lành, hoàn thiện hoặc học hỏi' },
            card5: { name: card5, question: 'Thông điệp về yêu thương bản thân' },
          },
          reading: parsed.reading || parsed,
        },
      };
    } catch (error) {
      console.error('Error calling OpenAI for love deep tarot reading:', error);
      
      // Fallback response nếu có lỗi
      return {
        success: true,
        data: {
          question,
          cards: {
            card1: { name: card1, question: 'Năng lượng khi bước vào mối quan hệ' },
            card2: { name: card2, question: 'Thử thách hay vấn đề trên hành trình yêu thương' },
            card3: { name: card3, question: 'Dư âm từ những mối tình đã qua' },
            card4: { name: card4, question: 'Điều cần chữa lành, hoàn thiện hoặc học hỏi' },
            card5: { name: card5, question: 'Thông điệp về yêu thương bản thân' },
          },
          reading: {
            'nang-luong': `Lá bài ${card1} cho thấy năng lượng bạn mang theo khi bước vào mối quan hệ. Đây là những phẩm chất và tinh thần bạn đem đến cho tình yêu.`,
            'thu-thach': `Lá bài ${card2} chỉ ra những thử thách hoặc vấn đề có thể xuất hiện trên hành trình yêu thương của bạn. Hãy chuẩn bị và học cách vượt qua.`,
            'du-am': `Lá bài ${card3} phản ánh dư âm từ những mối tình đã qua đã để lại dấu ấn trong tâm hồn bạn. Những trải nghiệm này đã định hình cách bạn yêu.`,
            'chua-lanh': `Lá bài ${card4} cho biết điều bạn cần chữa lành, hoàn thiện hoặc học hỏi thêm để yêu bền vững hơn. Đây là cơ hội để phát triển.`,
            'yeu-thuong-ban-than': `Lá bài ${card5} mang đến thông điệp dành cho bạn về việc trân trọng và yêu thương chính bản thân mình. Hãy nhớ rằng yêu bản thân là nền tảng của mọi tình yêu.`,
          },
        },
      };
    }
  }

  private prepareLoveDeepPrompt(
    question: string,
    card1: string,
    card2: string,
    card3: string,
    card4: string,
    card5: string,
  ): string {
    return `
Bạn là chuyên gia bói bài Tarot chuyên nghiệp. Hãy luận giải sâu sắc về tình yêu dựa trên 5 lá bài tarot, mỗi lá bài trả lời một câu hỏi cụ thể về hành trình tình yêu.

Câu hỏi của người xem: "${question}"

5 lá bài tarot và câu hỏi tương ứng:
1. Lá bài thứ nhất: ${card1} - Trả lời: "Bạn mang theo những năng lượng nào khi bước vào một mối quan hệ?"
2. Lá bài thứ hai: ${card2} - Trả lời: "Thử thách hay vấn đề nào có thể xuất hiện trên hành trình yêu thương của bạn?"
3. Lá bài thứ ba: ${card3} - Trả lời: "Dư âm từ những mối tình đã qua đã để lại dấu ấn gì trong tâm hồn bạn?"
4. Lá bài thứ tư: ${card4} - Trả lời: "Điều gì bạn cần chữa lành, hoàn thiện hoặc học hỏi thêm để yêu bền vững hơn?"
5. Lá bài thứ năm: ${card5} - Trả lời: "Thông điệp dành cho bạn về việc trân trọng và yêu thương chính bản thân mình."

YÊU CẦU:
- Trả về JSON duy nhất, Tiếng Việt
- Cấu trúc JSON:
{
  "reading": {
    "nang-luong": "Luận giải chi tiết về năng lượng bạn mang theo khi bước vào mối quan hệ dựa trên lá bài ${card1}. Phân tích những phẩm chất, tinh thần, và năng lượng tích cực bạn đem đến. (khoảng 150-200 từ)",
    "thu-thach": "Luận giải chi tiết về thử thách hay vấn đề có thể xuất hiện trên hành trình yêu thương dựa trên lá bài ${card2}. Phân tích những khó khăn, thách thức, và cách đối mặt. (khoảng 150-200 từ)",
    "du-am": "Luận giải chi tiết về dư âm từ những mối tình đã qua dựa trên lá bài ${card3}. Phân tích những dấu ấn, bài học, và ảnh hưởng đến hiện tại. (khoảng 150-200 từ)",
    "chua-lanh": "Luận giải chi tiết về điều cần chữa lành, hoàn thiện hoặc học hỏi thêm để yêu bền vững hơn dựa trên lá bài ${card4}. Đưa ra lời khuyên cụ thể về sự phát triển. (khoảng 150-200 từ)",
    "yeu-thuong-ban-than": "Luận giải chi tiết về thông điệp trân trọng và yêu thương bản thân dựa trên lá bài ${card5}. Nhấn mạnh tầm quan trọng của việc yêu bản thân trong tình yêu. (khoảng 150-200 từ)"
  }
}

QUY TẮC:
1. Phần "nang-luong" phải tập trung vào những phẩm chất, năng lượng tích cực, và tinh thần bạn mang vào mối quan hệ
2. Phần "thu-thach" phải mô tả rõ ràng những thách thức, khó khăn có thể gặp phải và cách đối mặt
3. Phần "du-am" phải phân tích sâu sắc về ảnh hưởng của quá khứ lên hiện tại và tương lai
4. Phần "chua-lanh" phải đưa ra lời khuyên cụ thể về sự phát triển và hoàn thiện bản thân
5. Phần "yeu-thuong-ban-than" phải nhấn mạnh tầm quan trọng của việc yêu bản thân và đưa ra thông điệp tích cực
6. Tất cả các phần phải liên quan trực tiếp đến câu hỏi của người xem
7. Sử dụng kiến thức về tarot để đưa ra luận giải chính xác và sâu sắc
8. Ngôn ngữ tự nhiên, dễ hiểu, và mang tính tích cực nhưng chân thực
9. Tạo sự kết nối logic giữa các phần, như một hành trình tình yêu hoàn chỉnh
`;
  }
}
