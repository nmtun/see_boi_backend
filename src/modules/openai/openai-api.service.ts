import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class OpenAIAPIService {
  private readonly logger = new Logger(OpenAIAPIService.name);
  private readonly httpClient: AxiosInstance;
  private readonly openaiApiKey: string;

  constructor(private configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') ?? '';
    if (!this.openaiApiKey) {
      this.logger.error('OPENAI_API_KEY is not set in environment variables.');
      throw new InternalServerErrorException('OpenAI API key is missing.');
    }
  }

  async generateText(prompt: string): Promise<string> {
    try {
      const model = (process.env.OPENAI_MODEL_NAME || 'gpt-4o-mini').trim();
      const url = 'https://api.openai.com/v1/chat/completions';

      const body = {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        // Không thêm temperature vì một số model (như gpt-4o-mini) chỉ hỗ trợ giá trị mặc định
      };

      const response = await axios.post<{
        choices: { message: { content: string } }[];
      }>(
        url,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.openaiApiKey}`,
          },
        },
      );

      return this.extractText(response.data) || 'Không có nội dung trả về.';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Axios error calling OpenAI API: ${error.message}. Response data: ${JSON.stringify(error.response?.data)}`,
          error.stack,
        );
        throw new InternalServerErrorException(
          `Failed to generate AI interpretation: ${error.response?.data?.error?.message || error.message}`,
        );
      } else {
        this.logger.error(
          `Unknown error calling OpenAI API: ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException('Failed to generate AI interpretation.');
      }
    }
  }

  private extractText(data: any): string | null {
    try {
      return data?.choices?.[0]?.message?.content?.trim() || null;
    } catch {
      return null;
    }
  }
}

