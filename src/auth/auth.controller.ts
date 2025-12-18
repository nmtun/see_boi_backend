import { Body, Controller, Post, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from './decorator/get-user.decorator';
import { Roles } from './decorator/roles.decorator';
import { RolesGuard } from './guard/roles.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ 
    summary: 'Đăng ký tài khoản mới',
    description: 'Tạo tài khoản người dùng mới trong hệ thống. Email và username phải là duy nhất.' 
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Đăng ký thành công. Trả về thông tin người dùng và access token.',
    schema: {
      example: {
        user: {
          id: 1,
          email: 'nguyenvana@example.com',
          userName: 'nguyenvana',
          fullName: 'Nguyễn Văn A',
          role: 'USER'
        },
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dữ liệu không hợp lệ (email/username đã tồn tại, password quá ngắn...)' 
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ 
    summary: 'Đăng nhập',
    description: 'Đăng nhập vào hệ thống bằng email và mật khẩu' 
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Đăng nhập thành công. Trả về thông tin người dùng và access token.',
    schema: {
      example: {
        user: {
          id: 1,
          email: 'nguyenvana@example.com',
          userName: 'nguyenvana',
          fullName: 'Nguyễn Văn A'
        },
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Email hoặc mật khẩu không đúng' 
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}