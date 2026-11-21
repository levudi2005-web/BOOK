import { Body, Controller, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RateLimitGuard } from '../common/rate-limit.guard.js';

function bearerToken(authorization: string | undefined): string {
  if (!authorization) return '';
  const [scheme, token] = authorization.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? (token ?? '') : '';
}

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: { username?: string; email?: string; password?: string }) {
    return this.auth.register(body.username ?? '', body.email ?? '', body.password ?? '');
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { identifier?: string; password?: string }) {
    return this.auth.login(body.identifier ?? '', body.password ?? '');
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Headers('authorization') authorization: string | undefined) {
    return this.auth.logout(bearerToken(authorization));
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(
    @Body() body: { identifier?: string; recoveryKey?: string; newPassword?: string },
  ) {
    return this.auth.resetPassword(body.identifier ?? '', body.recoveryKey ?? '', body.newPassword ?? '');
  }

  @Post('change-password')
  @HttpCode(200)
  changePassword(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { currentPassword?: string; recoveryKey?: string; newPassword?: string },
  ) {
    return this.auth.changePassword(
      bearerToken(authorization),
      body.currentPassword ?? '',
      body.recoveryKey ?? '',
      body.newPassword ?? '',
    );
  }

  @Post('security-key/rotate')
  @HttpCode(200)
  rotateSecurityKey(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { currentPassword?: string; currentRecoveryKey?: string },
  ) {
    return this.auth.rotateRecoveryKey(
      bearerToken(authorization),
      body.currentPassword ?? '',
      body.currentRecoveryKey ?? '',
    );
  }
}
