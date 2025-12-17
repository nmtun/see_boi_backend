import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'; // 1. Import cái này để bắt lỗi Prisma

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) { }

  async register(dto: RegisterDto) {
    const hash = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hash,
          fullName: dto.fullName,
          userName: dto.userName,
          role: dto.role ?? 'USER',
          birthday: dto.birthday,
          gender: dto.gender,
        },
      });

      const token = await this.signToken(user.id, user.email, user.role);

      // Chỉ trả về các field cần thiết, loại bỏ sensitive data
      const { 
        password,           // ❌ Không trả về
        googleId,          // ❌ Không trả về (sensitive)
        facebookId,        // ❌ Không trả về (sensitive)
        createdAt,        // ⚠️ Không cần cho register response
        updatedAt,         // ⚠️ Không cần cho register response
        ...safeUserData    // ✅ Các field còn lại
      } = user;

      return {
        access_token: token.access_token,
        user: safeUserData
      };

    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Email này đã được sử dụng');
        }
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    // Tìm user bằng email hoặc username
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { userName: dto.email },
        ],
      },
    });
  
    // Kiểm tra tài khoản có tồn tại không
    if (!user) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }
  
    // Kiểm tra user có password không (có thể là OAuth user)
    if (!user.password) {
      throw new ForbiddenException('Tài khoản này đăng nhập bằng phương thức khác (Google/Facebook)');
    }
  
    // Kiểm tra mật khẩu
    const pwMatches = await bcrypt.compare(dto.password, user.password);
  
    if (!pwMatches) {
      throw new UnauthorizedException('Mật khẩu không chính xác');
    }
  
    const token = await this.signToken(user.id, user.email, user.role);
  
    // Chỉ trả về các field cần thiết, loại bỏ sensitive data
    const { 
      password,           // ❌ Không trả về
      googleId,          // ❌ Không trả về (sensitive)
      facebookId,        // ❌ Không trả về (sensitive)
      createdAt,        // ⚠️ Không cần cho login response
      updatedAt,         // ⚠️ Không cần cho login response
      ...safeUserData    // ✅ Các field còn lại
    } = user;
  
    return {
      access_token: token.access_token,
      user: safeUserData
    };
  }
  
  async signToken(userId: number, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const secret = this.config.get('JWT_SECRET');
    const expiresIn = this.config.get('JWT_EXPIRATION');
  
    const token = await this.jwt.signAsync(payload, {
      expiresIn: expiresIn,
      secret: secret,
    });
  
    return {
      access_token: token
    };
  }
}