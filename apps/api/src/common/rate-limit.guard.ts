import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 20;
const configuredTestLimit = Number(process.env.TEST_AUTH_RATE_LIMIT_MAX_REQUESTS);
const MAX_REQUESTS =
  process.env.NODE_ENV === 'test' && Number.isSafeInteger(configuredTestLimit) && configuredTestLimit > 0
    ? configuredTestLimit
    : DEFAULT_MAX_REQUESTS;

type Bucket = { count: number; resetAt: number };
type RequestLike = { ip?: string; headers: Record<string, unknown> };

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const forwarded = request.headers['x-forwarded-for'];
    const ip =
      request.ip ??
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : 'unknown');

    const now = Date.now();
    const bucket = this.buckets.get(ip);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }

    if (bucket.count >= MAX_REQUESTS) {
      throw new HttpException('Quá nhiều yêu cầu. Vui lòng thử lại sau.', HttpStatus.TOO_MANY_REQUESTS);
    }

    bucket.count += 1;
    return true;
  }
}
