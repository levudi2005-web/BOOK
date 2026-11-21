import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { verifyGatewaySignature } from './gateway-sign.util.js';

const WINDOW_SECONDS = 300;

type RequestLike = {
  method: string;
  originalUrl?: string;
  url?: string;
  headers: Record<string, unknown>;
};

@Injectable()
export class GatewayAuthGuard implements CanActivate {
  private readonly seenNonces = new Map<string, number>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const secret = process.env.GATEWAY_HMAC_SECRET ?? '';
    const timestamp = String(request.headers['x-gateway-timestamp'] ?? '');
    const nonce = String(request.headers['x-gateway-nonce'] ?? '');
    const signature = String(request.headers['x-gateway-signature'] ?? '');
    const path = request.originalUrl ?? request.url ?? '/';

    if (!secret || !timestamp || !nonce || !signature) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const timestampSeconds = Number(timestamp);
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(timestampSeconds) || Math.abs(now - timestampSeconds) > WINDOW_SECONDS) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const valid = verifyGatewaySignature(
      { secret, timestamp, nonce, method: request.method, path },
      signature,
    );
    if (!valid) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    // Anti-replay: reject a reused nonce within the allowed window.
    const nonceKey = `${nonce}:${signature}`;
    const nowMs = Date.now();
    if (this.seenNonces.has(nonceKey)) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    this.seenNonces.set(nonceKey, nowMs);

    if (this.seenNonces.size > 10_000) {
      for (const [key, seenAt] of this.seenNonces) {
        if (nowMs - seenAt > WINDOW_SECONDS * 1000) {
          this.seenNonces.delete(key);
        }
      }
    }

    return true;
  }
}
