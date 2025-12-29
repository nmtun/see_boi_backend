import { Injectable, Logger } from '@nestjs/common';
import { GoogleGeminiService } from '../modules/gemini/google-gemini.service';

export interface LLMModerationResult {
  isToxic: boolean;
  category: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'TOXIC';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  confidence: number; // 0-100
  toxicWords?: string[];
  suggestion?: string; // Gợi ý xử lý cho admin
}

@Injectable()
export class LLMModerationService {
  private readonly logger = new Logger(LLMModerationService.name);
  private cache = new Map<string, { result: LLMModerationResult; timestamp: number }>();
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  constructor(private readonly geminiService: GoogleGeminiService) {}

  /**
   * Phân tích nội dung bằng LLM để phát hiện độc hại/không phù hợp
   */
  async moderateContent(content: string): Promise<LLMModerationResult> {
    try {
      // Check cache first
      const cached = this.getCachedResult(content);
      if (cached) {
        this.logger.debug(`Cache hit for content: ${content.substring(0, 50)}...`);
        return cached;
      }

      const prompt = this.buildModerationPrompt(content);
      const response = await this.geminiService.generateText(prompt);
      
      // Debug log
      this.logger.debug(`Gemini API Response: ${response.substring(0, 500)}...`);
      
      const result = this.parseGeminiResponse(response, content);
      
      // Cache the result
      this.cacheResult(content, result);
      
      this.logger.log(`LLM moderation completed for content: ${content.substring(0, 50)}... - Category: ${result.category}, Confidence: ${result.confidence}%`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error in LLM moderation: ${error.message}`, error.stack);
      // Fallback to safe response
      return {
        isToxic: false,
        category: 'NEUTRAL',
        severity: 'LOW',
        reason: 'Không thể phân tích do lỗi hệ thống',
        confidence: 0,
        suggestion: 'Vui lòng kiểm tra thủ công',
      };
    }
  }

  /**
   * Phân tích nhiều nội dung cùng lúc (batch processing)
   */
  async moderateBatch(contents: string[]): Promise<LLMModerationResult[]> {
    const results = await Promise.all(
      contents.map(content => this.moderateContent(content))
    );
    return results;
  }

  /**
   * Xây dựng prompt cho Gemini API
   */
  private buildModerationPrompt(content: string): string {
    return `
Bạn là một chuyên gia kiểm duyệt nội dung (Content Moderator) cho một mạng xã hội Việt Nam.

Nhiệm vụ: Phân tích nội dung sau và đánh giá mức độ độc hại/không phù hợp.

Nội dung cần phân tích:
"${content}"

Yêu cầu phân tích:
1. Xác định category:
   - TOXIC: Chửi bậy, lăng mạ, xúc phạm nghiêm trọng, khiêu dâm, bạo lực
   - NEGATIVE: Tiêu cực, kỳ thị, phân biệt, hate speech nhẹ
   - NEUTRAL: Bình thường, không có vấn đề
   - POSITIVE: Tích cực, khích lệ, hữu ích

2. Đánh giá severity (mức độ nghiêm trọng):
   - LOW: Nhẹ, có thể chấp nhận được
   - MEDIUM: Trung bình, cần chú ý
   - HIGH: Nghiêm trọng, cần xử lý ngay

3. Liệt kê các từ/cụm từ vi phạm (nếu có)

4. Đưa ra lý do cụ thể

5. Gợi ý xử lý cho admin

6. Confidence score (0-100): Độ tự tin về đánh giá

QUAN TRỌNG: Trả lời CHÍNH XÁC theo format JSON sau (không thêm bất kỳ text nào khác):
{
  "isToxic": true/false,
  "category": "TOXIC/NEGATIVE/NEUTRAL/POSITIVE",
  "severity": "LOW/MEDIUM/HIGH",
  "reason": "Lý do chi tiết bằng tiếng Việt",
  "confidence": 85,
  "toxicWords": ["từ1", "từ2"],
  "suggestion": "Gợi ý xử lý cho admin"
}
`.trim();
  }

  /**
   * Parse response từ Gemini API
   */
  private parseGeminiResponse(response: string, originalContent: string): LLMModerationResult {
    try {
      
      // Trích xuất JSON từ response (có thể có markdown code block)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn(`No JSON found in Gemini response. Full response: ${response}`);
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and normalize
      return {
        isToxic: Boolean(parsed.isToxic),
        category: this.normalizeCategory(parsed.category),
        severity: this.normalizeSeverity(parsed.severity),
        reason: String(parsed.reason || 'Không có lý do cụ thể'),
        confidence: Math.min(100, Math.max(0, Number(parsed.confidence || 50))),
        toxicWords: Array.isArray(parsed.toxicWords) ? parsed.toxicWords : [],
        suggestion: String(parsed.suggestion || 'Không có gợi ý'),
      };
    } catch (error) {
      this.logger.error(`Failed to parse Gemini response: ${error.message}. Response: ${response}`);
      
      // Fallback analysis based on keywords
      return this.fallbackAnalysis(originalContent);
    }
  }

  /**
   * Fallback analysis khi LLM parse fail
   */
  private fallbackAnalysis(content: string): LLMModerationResult {
    const lowerContent = content.toLowerCase();
    const toxicKeywords = ['đm', 'vl', 'cc', 'ngu', 'chó', 'lồn', 'cặc', 'đĩ', 'fuck', 'shit'];
    const negativeKeywords = ['ghét', 'tệ', 'dở', 'kém', 'tồi', 'xấu'];
    
    const foundToxic = toxicKeywords.filter(word => lowerContent.includes(word));
    const foundNegative = negativeKeywords.filter(word => lowerContent.includes(word));

    if (foundToxic.length > 0) {
      return {
        isToxic: true,
        category: 'TOXIC',
        severity: foundToxic.length > 2 ? 'HIGH' : 'MEDIUM',
        reason: `Phát hiện từ ngữ không phù hợp: ${foundToxic.join(', ')}`,
        confidence: 70,
        toxicWords: foundToxic,
        suggestion: 'Ẩn bài viết và cảnh báo người dùng',
      };
    }

    if (foundNegative.length > 0) {
      return {
        isToxic: false,
        category: 'NEGATIVE',
        severity: 'LOW',
        reason: `Nội dung tiêu cực với từ: ${foundNegative.join(', ')}`,
        confidence: 60,
        toxicWords: foundNegative,
        suggestion: 'Theo dõi người dùng này',
      };
    }

    return {
      isToxic: false,
      category: 'NEUTRAL',
      severity: 'LOW',
      reason: 'Nội dung bình thường',
      confidence: 50,
      suggestion: 'Không cần xử lý',
    };
  }

  /**
   * Normalize category value
   */
  private normalizeCategory(category: string): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'TOXIC' {
    const normalized = String(category).toUpperCase();
    if (['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'TOXIC'].includes(normalized)) {
      return normalized as any;
    }
    return 'NEUTRAL';
  }

  /**
   * Normalize severity value
   */
  private normalizeSeverity(severity: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const normalized = String(severity).toUpperCase();
    if (['LOW', 'MEDIUM', 'HIGH'].includes(normalized)) {
      return normalized as any;
    }
    return 'LOW';
  }

  /**
   * Get cached moderation result
   */
  private getCachedResult(content: string): LLMModerationResult | null {
    const cacheKey = this.generateCacheKey(content);
    const cached = this.cache.get(cacheKey);

    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache moderation result
   */
  private cacheResult(content: string, result: LLMModerationResult): void {
    const cacheKey = this.generateCacheKey(content);
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });

    // Clean old cache entries (simple LRU)
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Generate cache key from content
   */
  private generateCacheKey(content: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `llm_mod_${hash}`;
  }

  /**
   * Clear cache (có thể gọi định kỳ hoặc khi cần)
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('LLM moderation cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; ttl: number } {
    return {
      size: this.cache.size,
      ttl: this.CACHE_TTL,
    };
  }
}
