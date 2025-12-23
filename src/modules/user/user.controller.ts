import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { User } from './entities/user.entity';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { storage } from '../../utils/cloudinary.storage';
import { File as MulterFile } from 'multer';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('me')
  @ApiOperation({ 
    summary: 'Lấy thông tin người dùng hiện tại',
    description: 'Lấy thông tin chi tiết của người dùng đang đăng nhập (dựa vào JWT token)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Thành công',
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        userName: 'username',
        fullName: 'Full Name',
        bio: 'User bio',
        avatar: 'https://example.com/avatar.jpg'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập hoặc token không hợp lệ' })
  async getMe(@Req() req) {
    const user = await this.userService.findMe(req.user.id);
    return new User(user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('me')
  @UseInterceptors(FileInterceptor('avatarUrl', { storage }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Cập nhật thông tin người dùng hiện tại',
    description: 'Cập nhật thông tin cá nhân. Upload file ảnh ở trường "avatarUrl" (file). Các trường khác nhập text.' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string', example: 'Nguyễn Văn A' },
        userName: { type: 'string', example: 'nguyenvana' },
        email: { type: 'string', example: 'nguyenvana@example.com' },
        birthday: { type: 'string', format: 'date', example: '1990-01-01' },
        gender: { type: 'string', example: 'Nam' },
        bio: { type: 'string', example: 'Developer at ABC Company' },
        avatarUrl: { 
          type: 'string', 
          format: 'binary',
          description: 'File ảnh đại diện (upload từ máy tính)' 
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cập nhật thành công',
  })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập hoặc token không hợp lệ' })
  async updateMe(
    @Req() req, 
    @Body() dto: UpdateUserDto, 
    @UploadedFile() file?: MulterFile
  ) {
    let data: any = { ...dto };
    
    if (data.birthday && typeof data.birthday === 'string') {
      data.birthday = new Date(data.birthday);
    }

    // lấy thông tin user để lấy avatar cũ
    const currentUser = await this.userService.findMe(req.user.id);
    
    // Xử lý avatar: Hỗ trợ cả file upload và URL string
    // Ưu tiên file upload nếu có cả 2
    if (file && (file as any).secure_url) {
      // Trường hợp 1: Upload file ảnh lên Cloudinary
      if (currentUser.avatarUrl) {
        // Xoá ảnh cũ trên Cloudinary (chỉ xóa nếu avatar cũ cũng từ Cloudinary)
        await this.userService.deleteAvatarIfCloudinary(currentUser.avatarUrl);
      }
      // Lưu URL string từ Cloudinary response
      data.avatarUrl = (file as any).secure_url;
    } else if (dto.avatarUrl && typeof dto.avatarUrl === 'string') {
      // Trường hợp 2: Gửi URL ảnh trực tiếp (không upload file)
      // Validate URL hợp lệ
      if (this.isValidUrl(dto.avatarUrl)) {
        data.avatarUrl = dto.avatarUrl;
        // Không xóa avatar cũ vì có thể là URL từ nguồn khác
      } else {
        throw new BadRequestException('URL ảnh không hợp lệ. URL phải bắt đầu bằng http:// hoặc https://');
      }
    }
    // Nếu không có file và không có URL, avatarUrl sẽ không được cập nhật
    
    // Update database với avatarUrl là string (không phải object)
    const updatedUser = await this.userService.updateMe(req.user.id, data);
    return new User(updatedUser);
  }

  // Helper method để validate URL
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id')
  @ApiOperation({ 
    summary: 'Lấy thông tin người dùng theo ID',
    description: 'Lấy thông tin chi tiết của một người dùng bất kỳ thông qua ID' 
  })
  @ApiParam({ name: 'id', description: 'ID của người dùng', type: Number })
  @ApiResponse({ status: 200, description: 'Thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  async getById(@Param('id') id: string) {
    const user = await this.userService.findById(+id);
    return new User(user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/posts')
  @ApiOperation({ 
    summary: 'Lấy danh sách bài viết của người dùng',
    description: 'Lấy tất cả bài viết do người dùng tạo' 
  })
  @ApiParam({ name: 'id', description: 'ID của người dùng', type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách bài viết' })
  async getUserPosts(@Param('id') id: string) {
    const posts = await this.userService.getUserPosts(+id);
    return posts;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/followers')
  @ApiOperation({ 
    summary: 'Lấy danh sách người theo dõi',
    description: 'Lấy danh sách những người đang theo dõi người dùng này' 
  })
  @ApiParam({ name: 'id', description: 'ID của người dùng', type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách followers' })
  async getUserFollowers(@Param('id') id: string) {
    const followers = await this.userService.getUserFollowers(+id);
    return followers.map(f => new User(f));
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/following')
  @ApiOperation({ 
    summary: 'Lấy danh sách đang theo dõi',
    description: 'Lấy danh sách những người mà người dùng này đang theo dõi' 
  })
  @ApiParam({ name: 'id', description: 'ID của người dùng', type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách following' })
  async getUserFollowing(@Param('id') id: string) {
    const following = await this.userService.getUserFollowing(+id);
    return following.map(f => new User(f));
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/follow')
  @ApiOperation({ 
    summary: 'Theo dõi người dùng',
    description: 'Người dùng hiện tại theo dõi người dùng khác' 
  })
  @ApiParam({ name: 'id', description: 'ID của người dùng muốn theo dõi', type: Number })
  @ApiResponse({ status: 201, description: 'Theo dõi thành công' })
  @ApiResponse({ status: 400, description: 'Không thể tự theo dõi chính mình hoặc đã theo dõi trước đó' })
  async followUser(@Req() req, @Param('id') id: string) {
    const result = await this.userService.followUser(req.user.id, +id);
    return result;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/is-following')
  @ApiOperation({ 
    summary: 'Kiểm tra trạng thái follow',
    description: 'Kiểm tra xem người dùng hiện tại có đang theo dõi người dùng khác không' 
  })
  @ApiParam({ name: 'id', description: 'ID của người dùng cần kiểm tra', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'Trạng thái follow',
    schema: {
      type: 'object',
      properties: {
        isFollowing: { type: 'boolean', example: true },
        userId: { type: 'number', example: 2 }
      }
    }
  })
  async checkFollowing(@Req() req, @Param('id') id: string) {
    const isFollowing = await this.userService.isFollowing(req.user.id, +id);
    return {
      isFollowing,
      userId: +id,
    };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/unfollow')
  @ApiOperation({ 
    summary: 'Hủy theo dõi người dùng',
    description: 'Người dùng hiện tại hủy theo dõi người dùng khác' 
  })
  @ApiParam({ name: 'id', description: 'ID của người dùng muốn hủy theo dõi', type: Number })
  @ApiResponse({ status: 200, description: 'Hủy theo dõi thành công' })
  async unfollowUser(@Req() req, @Param('id') id: string) {
    const result = await this.userService.unfollowUser(req.user.id, +id);
    return result;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/remove-follower')
  @ApiOperation({ 
    summary: 'Xóa người theo dõi',
    description: 'Xóa một người đang theo dõi bạn khỏi danh sách followers' 
  })
  @ApiParam({ name: 'id', description: 'ID của người muốn xóa khỏi followers', type: Number })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async removeFollower(@Req() req, @Param('id') id: string) {
    const result = await this.userService.removeFollower(+id, req.user.id);
    return result;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('me/xp')
  @ApiOperation({ 
    summary: 'Lấy thông tin điểm kinh nghiệm (XP)',
    description: 'Lấy thông tin XP hiện tại của người dùng đang đăng nhập' 
  })
  @ApiResponse({ status: 200, description: 'Thông tin XP' })
  getMyXp(@Req() req) {
    return this.userService.getMyXp(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('me/xp-logs')
  @ApiOperation({ 
    summary: 'Lấy lịch sử XP',
    description: 'Lấy lịch sử thay đổi điểm kinh nghiệm của người dùng' 
  })
  @ApiResponse({ status: 200, description: 'Danh sách lịch sử XP' })
  getMyXpLogs(@Req() req) {
    return this.userService.getMyXpLogs(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/badges')
  @ApiOperation({ 
    summary: 'Lấy danh sách huy hiệu',
    description: 'Lấy tất cả huy hiệu mà người dùng đã đạt được' 
  })
  @ApiParam({ name: 'id', description: 'ID của người dùng', type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách badges' })
  async getUserBadges(@Param('id') id: string) {
    const badges = await this.userService.getUserBadges(+id);
    return badges;
  }
  
}