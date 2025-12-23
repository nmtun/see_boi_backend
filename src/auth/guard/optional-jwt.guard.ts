import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest để không throw error khi không có token
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Nếu không có token hoặc token invalid, trả về undefined thay vì throw error
    // Điều này cho phép endpoint hoạt động cả khi không có authentication
    if (err || !user) {
      // Không throw error, chỉ return undefined
      return undefined;
    }
    return user;
  }

  // Override canActivate để luôn cho phép request đi qua
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Kiểm tra xem có Authorization header không
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    
    // Nếu không có token, cho phép request đi qua (req.user sẽ là undefined)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    // Nếu có token, thử validate
    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch (error) {
      // Nếu token invalid, vẫn cho phép request đi qua
      // req.user sẽ là undefined
      return true;
    }
  }
}

