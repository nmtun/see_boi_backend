import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { LLMModerationService } from '../../utils/llm-moderation.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';

class TestModerationDto {
  content: string;
}

@ApiTags('Content Moderation (LLM)')
@ApiBearerAuth()
@Controller('moderation')
export class ModerationController {
  constructor(
    private readonly llmModerationService: LLMModerationService,
  ) {}

  @Post('test')
  @ApiOperation({
    summary: 'Test LLM Moderation',
    description: 'Kiểm tra nội dung bằng LLM (Google Gemini) - Chính xác, hiểu ngữ cảnh',
  })
  @ApiBody({ type: TestModerationDto })
  async testModeration(@Body() dto: TestModerationDto) {
    const startTime = Date.now();
    const result = await this.llmModerationService.moderateContent(dto.content);
    const duration = Date.now() - startTime;

    return {
      method: 'LLM (Google Gemini)',
      input: dto.content,
      result,
      performance: `${duration}ms`,
    };
  }

  @Post('batch')
  @ApiOperation({
    summary: 'Test Batch Moderation',
    description: 'Kiểm tra nhiều nội dung cùng lúc',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        contents: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async testBatchModeration(@Body() body: { contents: string[] }) {
    const startTime = Date.now();
    const results = await this.llmModerationService.moderateBatch(body.contents);
    const duration = Date.now() - startTime;

    return {
      method: 'LLM Batch Processing',
      totalItems: body.contents.length,
      results,
      performance: `${duration}ms`,
      avgPerItem: `${(duration / body.contents.length).toFixed(2)}ms`,
    };
  }

  @Get('cache/stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Xem thống kê cache của LLM moderation',
    description: 'Chỉ admin mới có thể xem',
  })
  getCacheStats() {
    return this.llmModerationService.getCacheStats();
  }

  @Post('cache/clear')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Xóa cache của LLM moderation',
    description: 'Chỉ admin mới có thể xóa',
  })
  clearCache() {
    this.llmModerationService.clearCache();
    return { message: 'Cache cleared successfully' };
  }
}
