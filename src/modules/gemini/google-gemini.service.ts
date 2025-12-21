import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios'; 

@Injectable()
export class GoogleGeminiService {
    private readonly logger = new Logger(GoogleGeminiService.name);
    private readonly httpClient: AxiosInstance;
    private readonly geminiApiKey: string;

    constructor(private configService: ConfigService) {
        this.geminiApiKey = this.configService.get<string>('GOOGLE_GEMINI_API_KEY') ?? "";
        if (!this.geminiApiKey) {
            this.logger.error('GOOGLE_GEMINI_API_KEY is not set in environment variables.');
            throw new InternalServerErrorException('Google Gemini API key is missing.');
        }

    }
    async generateText(prompt: string): Promise<string> {
        try {
            let model = (process.env.GOOGLE_MODEL_NAME || 'gemini-2.5-flash-lite').trim();
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;

            const body = {
                contents: [
                    {
                        parts: [{ text: `"${prompt}"` }]
                    }
                ]
            };

            const response = await axios.post<{ candidates: { content: string }[] }>(url, body, {
                headers: { 'Content-Type': 'application/json' },
            });

            return this.extractText(response.data) || 'Không có nội dung trả về.';

        } catch (error) {
            if (axios.isAxiosError(error)) {
                this.logger.error(`Axios error calling Gemini API: ${error.message}. Response data: ${JSON.stringify(error.response?.data)}`, error.stack);
                throw new InternalServerErrorException(`Failed to generate AI interpretation: ${error.response?.data?.error?.message || error.message}`);
            } else {
                this.logger.error(`Unknown error calling Gemini API: ${error.message}`, error.stack);
                throw new InternalServerErrorException('Failed to generate AI interpretation.');
            }
        }
    }

    private extractText(data: any): string | null {
        try {
            return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
        } catch {
            return null;
        }
    }
}