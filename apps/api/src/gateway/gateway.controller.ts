import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GatewayAuthGuard } from '../common/gateway-auth.guard.js';
import { extractBearerToken } from '../common/http.util.js';
import { AuthService } from '../auth/auth.service.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { StorageService } from '../storage/storage.service.js';
import { SearchService } from '../search/search.service.js';

/**
 * VPS Data Gateway: service-to-service endpoints protected by HMAC + anti-replay.
 * The Cloudflare Workers transport layer signs every request with
 * `GATEWAY_HMAC_SECRET` and forwards it here. These endpoints are never exposed
 * without a valid signature, and no SQL is executed from the Workers side.
 */
@Controller('gateway')
@UseGuards(GatewayAuthGuard)
export class GatewayController {
  constructor(
    private readonly auth: AuthService,
    private readonly catalog: CatalogService,
    private readonly storage: StorageService,
    private readonly search: SearchService,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'data-gateway' };
  }

  // --- Internal (worker/scheduler, service-to-service only) ---

  @Post('internal/storage/cleanup')
  cleanupExpiredSessions() {
    return this.storage.cleanupExpiredSessions();
  }

  @Post('internal/storage/reconcile')
  reconcileQuota() {
    return this.storage.reconcileQuota();
  }

  @Post('internal/search/reindex')
  reindexSearch() {
    return this.search.configureIndexes().then(() => this.search.reindexAll());
  }

  // --- Catalog (read-only) ---

  @Get('books')
  listBooks(@Query() query: Record<string, string>) {
    return this.catalog.listBooks(query);
  }

  @Get('books/:slug')
  getBook(@Param('slug') slug: string) {
    return this.catalog.getBook(slug);
  }

  @Get('categories')
  listCategories() {
    return this.catalog.listCategories();
  }

  @Get('authors')
  listAuthors() {
    return this.catalog.listAuthors();
  }

  @Get('publishers')
  listPublishers() {
    return this.catalog.listPublishers();
  }

  // --- Auth (business logic stays on VPS) ---

  @Post('auth/register')
  register(@Body() body: { username?: string; email?: string; password?: string }) {
    return this.auth.register(body.username ?? '', body.email ?? '', body.password ?? '');
  }

  @Post('auth/login')
  @HttpCode(200)
  login(@Body() body: { identifier?: string; password?: string }) {
    return this.auth.login(body.identifier ?? '', body.password ?? '');
  }

  @Post('auth/logout')
  @HttpCode(200)
  logout(@Headers('authorization') authorization: string | undefined) {
    return this.auth.logout(extractBearerToken(authorization));
  }

  @Post('auth/reset-password')
  @HttpCode(200)
  resetPassword(
    @Body() body: { identifier?: string; recoveryKey?: string; newPassword?: string },
  ) {
    return this.auth.resetPassword(body.identifier ?? '', body.recoveryKey ?? '', body.newPassword ?? '');
  }

  @Post('auth/change-password')
  @HttpCode(200)
  changePassword(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { currentPassword?: string; recoveryKey?: string; newPassword?: string },
  ) {
    return this.auth.changePassword(
      extractBearerToken(authorization),
      body.currentPassword ?? '',
      body.recoveryKey ?? '',
      body.newPassword ?? '',
    );
  }

  @Post('auth/security-key/rotate')
  @HttpCode(200)
  rotateSecurityKey(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { currentPassword?: string; currentRecoveryKey?: string },
  ) {
    return this.auth.rotateRecoveryKey(
      extractBearerToken(authorization),
      body.currentPassword ?? '',
      body.currentRecoveryKey ?? '',
    );
  }
}

