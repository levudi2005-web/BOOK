import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health.controller.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { CatalogController } from './catalog/catalog.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { GatewayModule } from './gateway/gateway.module.js';
import { StorageModule } from './storage/storage.module.js';
import { StudioModule } from './studio/studio.module.js';
import { SearchModule } from './search/search.module.js';
import { AdminModule } from './admin/admin.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { SocialModule } from './social/social.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    CatalogModule,
    GatewayModule,
    StorageModule,
    StudioModule,
    SearchModule,
    AdminModule,
    DocumentsModule,
    SocialModule,
  ],
  controllers: [HealthController, CatalogController],
})
export class AppModule {}


