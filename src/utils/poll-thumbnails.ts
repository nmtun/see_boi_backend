/**
 * Default Poll Thumbnail Configuration
 * 
 * Hướng dẫn sử dụng:
 * 1. Upload ảnh poll template lên Cloudinary
 * 2. Copy URL và thay thế vào DEFAULT_POLL_THUMBNAIL
 * 3. Backend sẽ tự động dùng ảnh này cho tất cả poll không có thumbnail
 */

export const DEFAULT_POLL_THUMBNAIL = 
  // TODO: Thay thế bằng URL từ Cloudinary của bạn
  'http://res.cloudinary.com/dzvvhdqoq/image/upload/v1766866315/posts/q5jghetsycwpis1vavml.jpg';

/**
 * Lấy thumbnail mặc định cho poll
 * @returns URL của thumbnail mặc định
 */
export const getDefaultPollThumbnail = (): string => {
  return DEFAULT_POLL_THUMBNAIL;
};
