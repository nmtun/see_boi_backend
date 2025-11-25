import { ForbiddenException, Injectable } from '@nestjs/common';
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
  ) {}

  async register(dto: RegisterDto) {
    const hash = await bcrypt.hash(dto.password, 10);
    
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hash,
          fullName: dto.fullName,
        },
      });

      return this.signToken(user.id, user.email, user.role);

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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) 
      throw new ForbiddenException('Email hoặc mật khẩu không chính xác');

    const pwMatches = await bcrypt.compare(dto.password, user.password);
    
    if (!pwMatches) 
      throw new ForbiddenException('Email hoặc mật khẩu không chính xác');

    return this.signToken(user.id, user.email, user.role);
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
      access_token: token,
    };
  }
}