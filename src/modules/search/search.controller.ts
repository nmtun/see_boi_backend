import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('users')
  @ApiOperation({ 
    summary: 'Tìm kiếm người dùng',
    description: 'Tìm kiếm người dùng theo tên, username hoặc email' 
  })
  @ApiQuery({ 
    name: 'q', 
    required: true, 
    description: 'Từ khóa tìm kiếm',
    example: 'nguyen'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách người dùng tìm thấy',
    schema: {
      example: [
        {
          id: 1,
          fullName: 'Nguyen Van A',
          userName: 'nguyenvana',
          email: 'nguyen@example.com',
          avatarUrl: 'https://example.com/avatar.jpg'
        }
      ]
    }
  })
  async searchUsers(@Query('q') query: string) {
    return this.searchService.searchUsers(query);
  }

  @Get('posts')
  @ApiOperation({ 
    summary: 'Tìm kiếm bài viết nâng cao',
    description: 'Tìm kiếm bài viết theo tiêu đề và nội dung với ranking thông minh. Sử dụng full-text search và trigram similarity để tìm từ gần giống.' 
  })
  @ApiQuery({ 
    name: 'q', 
    required: true, 
    description: 'Từ khóa tìm kiếm',
    example: 'phong thủy'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: 'Số lượng kết quả tối đa',
    example: 20,
    type: Number
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách bài viết được sắp xếp theo mức độ phù hợp',
    schema: {
      example: [
        {
          id: 1,
          title: 'Hướng dẫn xem phong thủy',
          contentText: 'Nội dung về phong thủy...',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          createdAt: '2025-12-30T00:00:00.000Z',
          likeCount: 10,
          commentCount: 5,
          relevance: 0.95,
          user: {
            id: 1,
            fullName: 'Nguyen Van A',
            userName: 'nguyenvana',
            avatarUrl: 'https://example.com/avatar.jpg'
          }
        }
      ]
    }
  })
  async searchPosts(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.searchPosts(query, limit ? Number(limit) : 50);
  }
}
