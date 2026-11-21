import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { extractBearerToken } from '../common/http.util.js';
import { AdminService } from './admin.service.js';
import { AdminSessionAuthGuard } from './admin-session-auth.guard.js';

function bearer(authorization: string | undefined): string {
  return extractBearerToken(authorization);
}

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly admin: AdminService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { identifier?: string; password?: string }) {
    return this.admin.login(body.identifier ?? '', body.password ?? '');
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Headers('authorization') authorization: string | undefined) {
    return this.admin.logout(bearer(authorization));
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(
    @Body() body: { identifier?: string; recoveryKey?: string; newPassword?: string },
  ) {
    return this.admin.resetPassword(body.identifier ?? '', body.recoveryKey ?? '', body.newPassword ?? '');
  }

  @Post('change-password')
  @HttpCode(200)
  changePassword(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { currentPassword?: string; newPassword?: string },
  ) {
    return this.admin.changePassword(bearer(authorization), body.currentPassword ?? '', body.newPassword ?? '');
  }

  @Post('security-key/rotate')
  @HttpCode(200)
  rotateSecurityKey(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { currentPassword?: string; currentRecoveryKey?: string },
  ) {
    return this.admin.rotateRecoveryKey(bearer(authorization), body.currentPassword ?? '', body.currentRecoveryKey ?? '');
  }

  @Get('me')
  @UseGuards(AdminSessionAuthGuard)
  me(@Headers('authorization') authorization: string | undefined) {
    return this.admin.requireSession(bearer(authorization)).then((id) => this.admin.getMe(id));
  }
}
