import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { SessionService } from '../security/session.service.js';
import { extractBearerToken } from './http.util.js';

type RequestWithUserId = Record<string, unknown> & {
  headers: Record<string, unknown>;
};

/**
 * Resolves the opaque `Authorization: Bearer <token>` session and attaches the
 * owning `user_id` as `request.userId`. Used by user-scoped resources
 * (storage, author studio, office documents, profile, ...).
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUserId>();
    const authorization = request.headers['authorization'];
    const token = extractBearerToken(typeof authorization === 'string' ? authorization : '');
    const userId = await this.sessions.resolve(token);
    if (userId === null) {
      throw new HttpException(
        'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    request['userId'] = userId;
    return true;
  }
}
