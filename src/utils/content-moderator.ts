// Content Moderation Type Definitions
// Interface cho LLM-based content moderation

/**
 * Kết quả phân tích nội dung bằng LLM
 */
export interface ModerationResult {
  isToxic: boolean;
  toxicWords: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  category: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'TOXIC';
  confidence: number; // LLM confidence score (0-100)
  reason: string; // LLM reasoning
  suggestion: string; // LLM suggestion for admin
}

/**
 * Lấy cảnh báo cho admin
 */
export function getWarningMessage(result: ModerationResult): string | null {
  if (!result.isToxic) return null;

  switch (result.severity) {
    case 'HIGH':
      return 'CẢNH BÁO CAO: Nội dung chứa nhiều từ ngữ không phù hợp!';
    case 'MEDIUM':
      return 'Cảnh báo: Nội dung có từ ngữ không phù hợp';
    case 'LOW':
      return 'Lưu ý: Nội dung cần xem xét';
    default:
      return null;
  }
}

/**
 * Kiểm tra xem content có cần được review bởi admin không
 */
export function needsReview(result: ModerationResult): boolean {
  return result.isToxic || result.category === 'NEGATIVE';
}
