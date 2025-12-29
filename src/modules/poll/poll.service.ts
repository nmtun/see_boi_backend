import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VotePollDto } from './dto/vote-poll.dto';


@Injectable()
export class PollService {
  constructor(private readonly prisma: PrismaService) { }

  async vote(pollId: number, userId: number, dto: VotePollDto) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });

    if (!poll) throw new BadRequestException('Poll not found');

    if (poll.expiresAt && poll.expiresAt < new Date()) {
      throw new ForbiddenException('Poll has expired');
    }

    const option = poll.options.find(o => o.id === dto.optionId);
    if (!option) throw new BadRequestException('Invalid option');

    // Không cho vote nhiều option trong cùng poll
    const existingVote = await this.prisma.pollVote.findFirst({
      where: {
        userId,
        option: {
          pollId,
        },
      },
    });

    if (existingVote) {
      throw new BadRequestException('You already voted in this poll');
    }

    return this.prisma.pollVote.create({
      data: {
        pollOptionId: dto.optionId,
        userId,
      },
    });
  }

  async getResult(pollId: number) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
      },
    });

    if (!poll) throw new BadRequestException('Poll not found');

    const totalVotes = poll.options.reduce(
      (sum, o) => sum + o._count.votes,
      0,
    );

    return {
      pollId: poll.id,
      totalVotes,
      options: poll.options.map(o => ({
        id: o.id,
        text: o.text,
        votes: o._count.votes,
        percentage:
          totalVotes === 0
            ? 0
            : Math.round((o._count.votes / totalVotes) * 100),
      })),
    };
  }

  /**
   * Lấy thông tin vote của user trong poll
   * @param pollId - ID của poll
   * @param userId - ID của user (optional)
   * @returns ID của option mà user đã vote, hoặc null nếu chưa vote
   */
  async getUserVote(pollId: number, userId?: number): Promise<number | null> {
    if (!userId) return null;

    const vote = await this.prisma.pollVote.findFirst({
      where: {
        userId,
        option: {
          pollId,
        },
      },
      select: {
        pollOptionId: true,
      },
    });

    return vote?.pollOptionId ?? null;
  }
}
