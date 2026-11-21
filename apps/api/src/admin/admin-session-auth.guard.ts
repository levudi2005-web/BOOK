import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { extractBearerToken } from '../common/http.util.js';
import { AdminService } from './admin.service.js';

type RequestLike = Record<string, unknown> & { headers: Record<string, unknown> };

@Injectable()
export class AdminSessionAuthGuard implements CanActivate {
  constructor(private readonly admin: AdminService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const authorization = request.headers['authorization'];
    const token = extractBearerToken(typeof authorization === 'string' ? authorization : '');
    const adminId = await this.admin.requireSession(token);
    request['adminId'] = adminId;
    return true;
  }
}
