import {
  Controller,
  Get,
  Query,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { TrendingService } from './trending.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Trending')
@Controller('trending')
export class TrendingController {
  constructor(private readonly trendingService: TrendingService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy top bài viết trending',
    description: `
Lấy danh sách bài viết hot nhất theo lượt xem hoặc lượt thích trong khoảng thời gian.

**Tham số:**
- type: 'views' (lượt xem) hoặc 'likes' (lượt thích)
- period: 
  - '24h': 24 giờ gần nhất
  - 'today': Hôm nay (nếu sau 7h sáng) hoặc 24h (nếu trước 7h sáng)
  - 'week': 7 ngày gần nhất
  - 'month': 30 ngày gần nhất
- limit: Số lượng bài viết (mặc định 10, tối đa 50)

**Ví dụ:**
- GET /trending?type=views&period=24h&limit=10
- GET /trending?type=likes&period=today
- GET /trending?type=views&period=week&limit=20
    `,
  })
  @ApiQuery({
    name: 'type',
    enum: ['views', 'likes'],
    required: true,
    description: 'Loại trending: views (lượt xem) hoặc likes (lượt thích)',
  })
  @ApiQuery({
    name: 'period',
    enum: ['24h', 'today', 'week', 'month'],
    required: true,
    description:
      'Khoảng thời gian: 24h, today (hôm nay), week (tuần), month (tháng)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bài viết (mặc định 10, tối đa 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách bài viết trending',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          title: { type: 'string' },
          content: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              fullName: { type: 'string' },
              userName: { type: 'string' },
              avatarUrl: { type: 'string' },
            },
          },
          viewsInPeriod: {
            type: 'number',
            description: 'Số lượt xem trong khoảng thời gian (nếu type=views)',
          },
          likesInPeriod: {
            type: 'number',
            description: 'Số lượt thích trong khoảng thời gian (nếu type=likes)',
          },
          _count: {
            type: 'object',
            properties: {
              likes: { type: 'number', description: 'Tổng lượt thích' },
              comments: { type: 'number', description: 'Tổng bình luận' },
              views: { type: 'number', description: 'Tổng lượt xem' },
            },
          },
          tags: { type: 'array' },
          images: { type: 'array' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Tham số không hợp lệ' })
  async getTrending(
    @Query('type') type?: string,
    @Query('period') period?: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    // Validate type
    if (!type || !['views', 'likes'].includes(type)) {
      throw new BadRequestException(
        'Tham số "type" phải là "views" hoặc "likes"',
      );
    }

    // Validate period
    if (!period || !['24h', 'today', 'week', 'month'].includes(period)) {
      throw new BadRequestException(
        'Tham số "period" phải là "24h", "today", "week" hoặc "month"',
      );
    }

    // Ensure limit has default value and validate
    const limitValue = limit ?? 10;
    if (limitValue < 1 || limitValue > 50) {
      throw new BadRequestException('Limit phải từ 1 đến 50');
    }

    return this.trendingService.getTopPosts(
      type as 'views' | 'likes',
      period as '24h' | 'today' | 'week' | 'month',
      limitValue,
    );
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Lấy thống kê trending',
    description:
      'Lấy thống kê tổng quan về views, likes, posts trong 24h và 7 ngày gần nhất',
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê trending',
    schema: {
      type: 'object',
      properties: {
        last24h: {
          type: 'object',
          properties: {
            totalViews: {
              type: 'number',
              description: 'Tổng lượt xem trong 24h',
            },
            totalLikes: {
              type: 'number',
              description: 'Tổng lượt thích trong 24h',
            },
            totalPosts: {
              type: 'number',
              description: 'Tổng bài viết mới trong 24h',
            },
          },
        },
        last7days: {
          type: 'object',
          properties: {
            totalViews: {
              type: 'number',
              description: 'Tổng lượt xem trong 7 ngày',
            },
          },
        },
      },
    },
  })
  async getTrendingStats() {
    return this.trendingService.getTrendingStats();
  }
}
