import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { PollService } from './poll.service';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { VotePollDto } from './dto/vote-poll.dto';


@Controller('poll')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/vote')
  async vote(@Param('id') id: string, @Body() dto: VotePollDto, @Req() req) {
    return this.pollService.vote(+id, req.user.id, dto);
  }

  @Get(':id/result')
  async getResult(@Param('id') id: string) {
    return this.pollService.getResult(+id);
  }

}
