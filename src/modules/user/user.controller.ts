import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { User } from './entities/user.entity';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';


@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('me')
  async getMe(@Req() req) {
    const user = await this.userService.findMe(req.user.id);
    return new User(user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('me')
  async updateMe(@Req() req, @Body() dto: UpdateUserDto) {
    let data: any = { ...dto };
    if (data.birthday && typeof data.birthday === 'string') {
      data.birthday = new Date(data.birthday);
    }
    const updatedUser = await this.userService.updateMe(req.user.id, data);
    return new User(updatedUser);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id')
  async getById(@Param('id') id: string) {
    const user = await this.userService.findById(+id);
    return new User(user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/posts')
  async getUserPosts(@Param('id') id: string) {
    const posts = await this.userService.getUserPosts(+id);
    return posts;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/followers')
  async getUserFollowers(@Param('id') id: string) {
    const followers = await this.userService.getUserFollowers(+id);
    return followers.map(f => new User(f));
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/following')
  async getUserFollowing(@Param('id') id: string) {
    const following = await this.userService.getUserFollowing(+id);
    return following.map(f => new User(f));
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/follow')
  async followUser(@Req() req, @Param('id') id: string) {
    const result = await this.userService.followUser(req.user.id, +id);
    return result;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/unfollow')
  async unfollowUser(@Req() req, @Param('id') id: string) {
    const result = await this.userService.unfollowUser(req.user.id, +id);
    return result;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/remove-follower')
  async removeFollower(@Req() req, @Param('id') id: string) {
    const result = await this.userService.removeFollower(+id, req.user.id);
    return result;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('me/xp')
  getMyXp(@Req() req) {
    return this.userService.getMyXp(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('me/xp-logs')
  getMyXpLogs(@Req() req) {
    return this.userService.getMyXpLogs(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/badges')
  async getUserBadges(@Param('id') id: string) {
    const badges = await this.userService.getUserBadges(+id);
    return badges;
  }
  
}  