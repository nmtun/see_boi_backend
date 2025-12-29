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
    summary: 'Bỏ phiếu/Đổi lựa chọn/Bỏ chọn trong poll',
    description: 'Vote cho poll với các hành vi: 1) Chưa vote → Vote mới, 2) Đã vote option khác → Đổi lựa chọn, 3) Vote lại option đang chọn → Bỏ chọn (unvote)' 
  })
  @ApiParam({ name: 'id', description: 'ID của poll', type: Number })
  @ApiBody({ type: VotePollDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Thành công. Response có field "action": "vote" (vote mới) | "change" (đổi lựa chọn) | "unvote" (bỏ chọn)',
    schema: {
      example: {
        id: 1,
        pollOptionId: 2,
        userId: 10,
        action: 'vote'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Option không hợp lệ hoặc poll đã hết hạn' })
  async vote(@Param('id') id: string, @Body() dto: VotePollDto, @Req() req) {
    return this.pollService.vote(+id, req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id/vote')
  @ApiOperation({ 
    summary: 'Bỏ vote trong poll',
    description: 'Xóa vote hiện tại của user trong poll (nếu có)' 
  })
  @ApiParam({ name: 'id', description: 'ID của poll', type: Number })
  @ApiResponse({ status: 200, description: 'Bỏ vote thành công' })
  @ApiResponse({ status: 400, description: 'Chưa vote trong poll này' })
  async unvote(@Param('id') id: string, @Req() req) {
    return this.pollService.unvote(+id, req.user.id);
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
