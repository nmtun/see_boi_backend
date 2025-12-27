import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { GoogleGeminiService } from '../gemini/google-gemini.service';
import { DailyTarotDto } from './dto/daily-tarot.dto';
import { YesNoTarotDto } from './dto/yes-no-tarot.dto';
import { OneCardTarotDto } from './dto/one-card-tarot.dto';
import { LoveSimpleTarotDto } from './dto/love-simple-tarot.dto';
import { LoveDeepTarotDto } from './dto/love-deep-tarot.dto';

@Injectable()
export class TarotService {
  constructor(private readonly googleGeminiService: GoogleGeminiService) {}

  async getDailyReading(dto: DailyTarotDto): Promise<any> {
    const { name, birthday, card1, card2, card3 } = dto;

    // Tạo prompt cho Gemini
    const prompt = this.prepareTarotPrompt(name, birthday, card1, card2, card3);

    try {
      // Gọi Gemini API
      let aiText = await this.googleGeminiService.generateText(prompt);
      aiText = aiText.replace(/```json|```/g, '').trim();

      // Parse JSON response
      const parsed = JSON.parse(aiText);
      
      return {
        success: true,
        data: {
          name,
          birthday,
          cards: {
            card1: { name: card1, question: 'Tình yêu' },
            card2: { name: card2, question: 'Tâm trạng' },
            card3: { name: card3, question: 'Tiền bạc' },
          },
          reading: parsed.reading || parsed,
        },
      };
    } catch (error) {
      console.error('Error calling Gemini for tarot reading:', error);
      
      // Fallback response nếu có lỗi
      return {
        success: true,
        data: {
          name,
          birthday,
          cards: {
            card1: { name: card1, question: 'Tình yêu' },
            card2: { name: card2, question: 'Tâm trạng' },
            card3: { name: card3, question: 'Tiền bạc' },
          },
          reading: {
            'tinh-yeu': 'Dựa trên lá bài ' + card1 + ', hôm nay bạn có thể gặp những điều tích cực trong tình yêu. Hãy mở lòng và tin tưởng vào cảm xúc của mình.',
            'tam-trang': 'Lá bài ' + card2 + ' cho thấy tâm trạng của bạn hôm nay sẽ ổn định và tích cực. Hãy giữ tinh thần lạc quan.',
            'tien-bac': 'Về mặt tài chính, lá bài ' + card3 + ' mang đến những tín hiệu tích cực. Hãy cân nhắc kỹ các quyết định tài chính.',
          },
        },
      };
    }
  }

  private prepareTarotPrompt(
    name: string,
    birthday: string,
    card1: string,
    card2: string,
    card3: string,
  ): string {
    const today = new Date().toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
Bạn là chuyên gia bói bài Tarot chuyên nghiệp. Hãy luận giải 3 lá bài tarot cho ngày hôm nay (${today}).

Thông tin người xem:
- Tên: ${name}
- Ngày sinh: ${birthday}

3 lá bài tarot:
1. Lá bài thứ nhất: ${card1} - Dùng để trả lời câu hỏi về TÌNH YÊU trong ngày hôm nay
2. Lá bài thứ hai: ${card2} - Dùng để trả lời câu hỏi về TÂM TRẠNG trong ngày hôm nay
3. Lá bài thứ ba: ${card3} - Dùng để trả lời câu hỏi về TIỀN BẠC trong ngày hôm nay

YÊU CẦU:
- Trả về JSON duy nhất, Tiếng Việt
- Cấu trúc JSON:
{
  "reading": {
    "tinh-yeu": "Luận giải chi tiết về tình yêu trong ngày hôm nay dựa trên lá bài ${card1}. Bao gồm: tình hình tình cảm, các cơ hội, lời khuyên cụ thể (khoảng 100-150 từ)",
    "tam-trang": "Luận giải chi tiết về tâm trạng trong ngày hôm nay dựa trên lá bài ${card2}. Bao gồm: cảm xúc, tinh thần, năng lượng, lời khuyên (khoảng 100-150 từ)",
    "tien-bac": "Luận giải chi tiết về tiền bạc trong ngày hôm nay dựa trên lá bài ${card3}. Bao gồm: tài chính, cơ hội đầu tư, chi tiêu, lời khuyên (khoảng 100-150 từ)"
  }
}

- Mỗi phần luận giải phải chi tiết, có ý nghĩa, và liên quan đến ý nghĩa của lá bài tarot tương ứng
- Sử dụng kiến thức về tarot để đưa ra luận giải chính xác và hữu ích
- Ngôn ngữ phải tự nhiên, dễ hiểu, và mang tính tích cực nhưng chân thực
`;
  }

  async getYesNoReading(dto: YesNoTarotDto): Promise<any> {
    const { question, card1, card2, revealedCard } = dto;

    // Xác định lá bài đã lật và chưa lật
    const revealedCardName = revealedCard === 'card1' ? card1 : card2;
    const hiddenCardName = revealedCard === 'card1' ? card2 : card1;

    // Tạo prompt cho Gemini
    const prompt = this.prepareYesNoPrompt(question, revealedCardName, hiddenCardName);

    try {
      // Gọi Gemini API
      let aiText = await this.googleGeminiService.generateText(prompt);
      aiText = aiText.replace(/```json|```/g, '').trim();

      // Parse JSON response
      const parsed = JSON.parse(aiText);
      
      return {
        success: true,
        data: {
          question,
          revealedCard: {
            name: revealedCardName,
            position: revealedCard,
          },
          answer: parsed.answer || parsed,
        },
      };
    } catch (error) {
      console.error('Error calling Gemini for yes-no tarot reading:', error);
      
      // Fallback response nếu có lỗi
      const isYes = this.determineYesNoFallback(revealedCardName);
      return {
        success: true,
        data: {
          question,
          revealedCard: {
            name: revealedCardName,
            position: revealedCard,
          },
          answer: {
            yesNo: isYes ? 'yes' : 'no',
            explanation: `Dựa trên lá bài ${revealedCardName}, câu trả lời cho câu hỏi của bạn là ${isYes ? 'CÓ' : 'KHÔNG'}. Lá bài này mang đến những thông điệp quan trọng về tình huống bạn đang hỏi.`,
            deeperInsight: 'Lá bài thứ hai chứa đựng những thông điệp sâu sắc hơn về tình huống này, nhưng bạn cần tự khám phá khi sẵn sàng.',
          },
        },
      };
    }
  }

  private prepareYesNoPrompt(
    question: string,
    revealedCardName: string,
    hiddenCardName: string,
  ): string {
    return `
Bạn là chuyên gia bói bài Tarot chuyên nghiệp. Hãy luận giải câu hỏi yes/no dựa trên 2 lá bài tarot.

Câu hỏi của người xem: "${question}"

Tình huống:
- Người xem đã bốc 2 lá bài tarot
- Lá bài đã được lật: ${revealedCardName} (dùng để trả lời yes/no và giải thích)
- Lá bài chưa được lật: ${hiddenCardName} (BẠN BIẾT TÊN LÁ BÀI NÀY NHƯNG KHÔNG ĐƯỢC TIẾT LỘ TÊN TRONG RESPONSE, chỉ giải thích sâu hơn dựa trên năng lượng/ý nghĩa của nó)

YÊU CẦU QUAN TRỌNG:
- Trả về JSON duy nhất, Tiếng Việt
- Cấu trúc JSON:
{
  "answer": {
    "yesNo": "yes" hoặc "no",
    "explanation": "Giải thích chi tiết câu trả lời yes/no dựa trên lá bài ${revealedCardName} đã lật. Phải rõ ràng, cụ thể và liên quan trực tiếp đến câu hỏi. (khoảng 150-200 từ)",
    "deeperInsight": "Giải thích sâu hơn về tình huống dựa trên lá bài CHƯA LẬT. QUAN TRỌNG: Tuyệt đối KHÔNG được tiết lộ tên lá bài chưa lật (${hiddenCardName}). Chỉ giải thích về năng lượng, ý nghĩa, thông điệp ẩn sâu mà lá bài này mang lại, như thể bạn đang nói về một lá bài bí ẩn. (khoảng 100-150 từ)"
  }
}

QUY TẮC BẮT BUỘC:
1. Phần "yesNo" phải là "yes" hoặc "no" dựa trên ý nghĩa của lá bài ${revealedCardName}
2. Phần "explanation" phải giải thích rõ tại sao là yes hoặc no dựa trên lá bài đã lật
3. Phần "deeperInsight" TUYỆT ĐỐI KHÔNG được nhắc đến tên lá bài ${hiddenCardName}. Chỉ nói về "lá bài thứ hai", "lá bài chưa lật", "lá bài bí ẩn" hoặc tương tự. Giải thích về năng lượng và thông điệp mà lá bài này mang lại mà không tiết lộ tên.
4. Sử dụng kiến thức về tarot để đưa ra luận giải chính xác
5. Ngôn ngữ tự nhiên, dễ hiểu, và mang tính tích cực nhưng chân thực
`;
  }

  private determineYesNoFallback(cardName: string): boolean {
    // Fallback logic đơn giản dựa trên tên lá bài
    const positiveCards = ['The Sun', 'The Star', 'The World', 'The Wheel of Fortune', 'The Magician', 'The Fool'];
    return positiveCards.some(card => cardName.toLowerCase().includes(card.toLowerCase()));
  }

  async getOneCardReading(dto: OneCardTarotDto): Promise<any> {
    const { question, card } = dto;

    // Tạo prompt cho Gemini
    const prompt = this.prepareOneCardPrompt(question, card);

    try {
      // Gọi Gemini API
      let aiText = await this.googleGeminiService.generateText(prompt);
      aiText = aiText.replace(/```json|```/g, '').trim();

      // Parse JSON response
      const parsed = JSON.parse(aiText);
      
      return {
        success: true,
        data: {
          question,
          card: {
            name: card,
          },
          reading: parsed.reading || parsed,
        },
      };
    } catch (error) {
      console.error('Error calling Gemini for one-card tarot reading:', error);
      
      // Fallback response nếu có lỗi
      return {
        success: true,
        data: {
          question,
          card: {
            name: card,
          },
          reading: {
            interpretation: `Lá bài ${card} mang đến thông điệp quan trọng cho câu hỏi của bạn. Hãy lắng nghe trực giác và tin tưởng vào hành trình của mình.`,
            guidance: 'Hãy suy ngẫm về câu hỏi của bạn và để năng lượng của lá bài này hướng dẫn bạn.',
          },
        },
      };
    }
  }

  private prepareOneCardPrompt(
    question: string,
    cardName: string,
  ): string {
    return `
Bạn là chuyên gia bói bài Tarot chuyên nghiệp. Hãy luận giải câu hỏi dựa trên 1 lá bài tarot.

Câu hỏi của người xem: "${question}"

Lá bài tarot: ${cardName}

YÊU CẦU:
- Trả về JSON duy nhất, Tiếng Việt
- Cấu trúc JSON:
{
  "reading": {
    "interpretation": "Luận giải chi tiết về câu hỏi dựa trên lá bài ${cardName}. Phân tích ý nghĩa của lá bài trong bối cảnh câu hỏi, đưa ra thông điệp rõ ràng và cụ thể. (khoảng 200-250 từ)",
    "guidance": "Lời khuyên và hướng dẫn cụ thể dựa trên thông điệp của lá bài ${cardName}. Đưa ra các bước hành động hoặc điều cần lưu ý. (khoảng 100-150 từ)",
    "keyMessage": "Thông điệp chính ngắn gọn từ lá bài (1-2 câu)"
  }
}

QUY TẮC:
1. Phần "interpretation" phải giải thích chi tiết ý nghĩa của lá bài trong bối cảnh câu hỏi
2. Phần "guidance" phải đưa ra lời khuyên thực tế và hữu ích
3. Phần "keyMessage" là tóm tắt ngắn gọn thông điệp chính
4. Sử dụng kiến thức về tarot để đưa ra luận giải chính xác
5. Ngôn ngữ tự nhiên, dễ hiểu, và mang tính tích cực nhưng chân thực
6. Luận giải phải liên quan trực tiếp đến câu hỏi của người xem
`;
  }

  async getLoveSimpleReading(dto: LoveSimpleTarotDto): Promise<any> {
    const { question, card1, card2, card3 } = dto;

    // Tạo prompt cho Gemini
    const prompt = this.prepareLoveSimplePrompt(question, card1, card2, card3);

    try {
      // Gọi Gemini API
      let aiText = await this.googleGeminiService.generateText(prompt);
      aiText = aiText.replace(/```json|```/g, '').trim();

      // Parse JSON response
      const parsed = JSON.parse(aiText);
      
      return {
        success: true,
        data: {
          question,
          cards: {
            card1: { name: card1, period: 'Quá khứ' },
            card2: { name: card2, period: 'Hiện tại' },
            card3: { name: card3, period: 'Tương lai' },
          },
          reading: parsed.reading || parsed,
        },
      };
    } catch (error) {
      console.error('Error calling Gemini for love simple tarot reading:', error);
      
      // Fallback response nếu có lỗi
      return {
        success: true,
        data: {
          question,
          cards: {
            card1: { name: card1, period: 'Quá khứ' },
            card2: { name: card2, period: 'Hiện tại' },
            card3: { name: card3, period: 'Tương lai' },
          },
          reading: {
            'qua-khu': `Lá bài ${card1} cho thấy quá khứ tình yêu của bạn đã có những dấu ấn quan trọng. Những trải nghiệm này đã định hình con đường tình yêu của bạn.`,
            'hien-tai': `Lá bài ${card2} phản ánh tình hình tình yêu hiện tại của bạn. Đây là thời điểm quan trọng để bạn nhận thức và hành động.`,
            'tuong-lai': `Lá bài ${card3} mang đến những tín hiệu về tương lai tình yêu của bạn. Hãy chuẩn bị cho những điều tích cực phía trước.`,
          },
        },
      };
    }
  }

  private prepareLoveSimplePrompt(
    question: string,
    card1: string,
    card2: string,
    card3: string,
  ): string {
    return `
Bạn là chuyên gia bói bài Tarot chuyên nghiệp. Hãy luận giải về tình yêu dựa trên 3 lá bài tarot theo dòng thời gian: Quá khứ, Hiện tại, Tương lai.

Câu hỏi của người xem: "${question}"

3 lá bài tarot:
1. Lá bài thứ nhất: ${card1} - Dùng để luận giải về QUÁ KHỨ trong tình yêu
2. Lá bài thứ hai: ${card2} - Dùng để luận giải về HIỆN TẠI trong tình yêu
3. Lá bài thứ ba: ${card3} - Dùng để luận giải về TƯƠNG LAI trong tình yêu

YÊU CẦU:
- Trả về JSON duy nhất, Tiếng Việt
- Cấu trúc JSON:
{
  "reading": {
    "qua-khu": "Luận giải chi tiết về quá khứ trong tình yêu dựa trên lá bài ${card1}. Phân tích những sự kiện, cảm xúc, hoặc bài học từ quá khứ đã ảnh hưởng đến tình yêu hiện tại. (khoảng 150-200 từ)",
    "hien-tai": "Luận giải chi tiết về hiện tại trong tình yêu dựa trên lá bài ${card2}. Phân tích tình hình hiện tại, những thách thức, cơ hội, và điều đang diễn ra trong tình yêu. (khoảng 150-200 từ)",
    "tuong-lai": "Luận giải chi tiết về tương lai trong tình yêu dựa trên lá bài ${card3}. Dự đoán những khả năng, xu hướng, và triển vọng tình yêu phía trước. (khoảng 150-200 từ)"
  }
}

QUY TẮC:
1. Phần "qua-khu" phải tập trung vào những gì đã xảy ra, những bài học, và ảnh hưởng đến hiện tại
2. Phần "hien-tai" phải mô tả tình hình hiện tại một cách rõ ràng và cụ thể
3. Phần "tuong-lai" phải đưa ra dự đoán và triển vọng, nhưng không quá chắc chắn (vì tương lai có thể thay đổi)
4. Tất cả các phần phải liên quan trực tiếp đến câu hỏi của người xem
5. Sử dụng kiến thức về tarot để đưa ra luận giải chính xác
6. Ngôn ngữ tự nhiên, dễ hiểu, và mang tính tích cực nhưng chân thực
7. Tạo sự kết nối logic giữa quá khứ, hiện tại và tương lai
`;
  }

  async getLoveDeepReading(dto: LoveDeepTarotDto): Promise<any> {
    const { question, card1, card2, card3, card4, card5 } = dto;

    // Tạo prompt cho Gemini
    const prompt = this.prepareLoveDeepPrompt(question, card1, card2, card3, card4, card5);

    try {
      // Gọi Gemini API
      let aiText = await this.googleGeminiService.generateText(prompt);
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
      console.error('Error calling Gemini for love deep tarot reading:', error);
      
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

