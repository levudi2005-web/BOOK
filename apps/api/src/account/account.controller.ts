import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../common/current-user.decorator.js';
import { SessionAuthGuard } from '../common/session-auth.guard.js';
import { AccountService } from './account.service.js';

@Controller('auth')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Post('email/verification/request')
  @UseGuards(SessionAuthGuard)
  @HttpCode(202)
  requestEmailVerification(@CurrentUserId() userId: number) {
    return this.account.requestEmailVerification(userId);
  }

  @Post('email/verification/confirm')
  @HttpCode(200)
  confirmEmailVerification(@Body() body: { token?: string }) {
    return this.account.confirmEmailVerification(body.token ?? '');
  }

  /** Luôn 202 + cùng body, bất kể tài khoản có tồn tại hay không. */
  @Post('password/forgot')
  @HttpCode(202)
  forgotPassword(@Body() body: { identifier?: string }) {
    return this.account.requestPasswordReset(body.identifier ?? '');
  }

  @Post('password/reset')
  @HttpCode(200)
  resetPassword(@Body() body: { token?: string; password?: string }) {
    return this.account.resetPassword(body.token ?? '', body.password ?? '');
  }
}
