import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { extractBearerToken } from '../common/http.util.js';
import { AdminService } from './admin.service.js';
import { REQUIRED_PERMISSION } from './admin.decorators.js';

type RequestLike = Record<string, unknown> & { headers: Record<string, unknown> };

@Injectable()
export class AdminRbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly admin: AdminService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(REQUIRED_PERMISSION, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<RequestLike>();
    const authorization = request.headers['authorization'];
    const token = extractBearerToken(typeof authorization === 'string' ? authorization : '');
    const adminId = await this.admin.requireSession(token);
    request['adminId'] = adminId;

    if (!required) return true;
    if (!(await this.admin.hasPermission(adminId, required))) {
      throw new ForbiddenException('Không có quyền thực hiện thao tác này.');
    }
    return true;
  }
}
