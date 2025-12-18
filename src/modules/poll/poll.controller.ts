import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { PollService } from './poll.service';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { VotePollDto } from './dto/vote-poll.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('Polls')
@ApiBearerAuth()
@Controller('poll')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/vote')
  @ApiOperation({ 
    summary: 'Bỏ phiếu cho poll',
    description: 'Bỏ phiếu cho một lựa chọn trong poll. Mỗi người dùng chỉ có thể bỏ phiếu một lần.' 
  })
  @ApiParam({ name: 'id', description: 'ID của poll', type: Number })
  @ApiBody({ type: VotePollDto })
  @ApiResponse({ status: 201, description: 'Bỏ phiếu thành công' })
  @ApiResponse({ status: 400, description: 'Đã bỏ phiếu trước đó hoặc poll đã hết hạn' })
  async vote(@Param('id') id: string, @Body() dto: VotePollDto, @Req() req) {
    return this.pollService.vote(+id, req.user.id, dto);
  }

  @Get(':id/result')
  @ApiOperation({ 
    summary: 'Lấy kết quả poll',
    description: 'Lấy kết quả bỏ phiếu của poll (số phiếu cho từng lựa chọn)' 
  })
  @ApiParam({ name: 'id', description: 'ID của poll', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'Kết quả poll',
    schema: {
      example: {
        pollId: 1,
        totalVotes: 10,
        options: [
          { id: 1, text: 'Lựa chọn 1', votes: 6 },
          { id: 2, text: 'Lựa chọn 2', votes: 4 }
        ]
      }
    }
  })
  async getResult(@Param('id') id: string) {
    return this.pollService.getResult(+id);
  }

}
