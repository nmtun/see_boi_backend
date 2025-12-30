import { SkipThrottle, Throttle } from '@nestjs/throttler';

/**
 * Decorator để bỏ qua giới hạn tốc độ cho các endpoint cụ thể
 * Sử dụng @SkipRateLimit() trên controller hoặc method
 */
export const SkipRateLimit = () => SkipThrottle(); 

/**
 * Decorator để thiết lập giới hạn tốc độ tùy chỉnh cho các endpoint cụ thể
 * @param limit - Số lượng request được phép
 * @param ttl - Cửa sổ thời gian tính bằng mili giây
 * 
 * Ví dụ:
 * @CustomRateLimit(5, 60000) // 5 requests mỗi phút
 * @CustomRateLimit(10, 300000) // 10 requests mỗi 5 phút
 */
export const CustomRateLimit = (limit: number, ttl: number) => Throttle({ default: { ttl, limit } });

/**
 * Giới hạn tốc độ nghiêm ngặt cho các endpoint nhạy cảm như login, đăng ký
 * 5 requests mỗi phút
 */
export const StrictRateLimit = () => Throttle({ default: { ttl: 60000, limit: 5 } });

/**
 * Giới hạn tốc độ vừa phải cho các endpoint quan trọng nhưng không quá nhạy cảm
 * 20 requests mỗi phút
 */
export const ModerateRateLimit = () => Throttle({ default: { ttl: 60000, limit: 20 } });

/**
 * Dùng cho các endpoint chỉ đọc dữ liệu, ít nhạy cảm
 * 200 requests mỗi phút
 */
export const RelaxedRateLimit = () => Throttle({ default: { ttl: 60000, limit: 200 } });
