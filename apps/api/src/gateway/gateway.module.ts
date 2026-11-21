import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { SearchModule } from '../search/search.module.js';
import { GatewayController } from './gateway.controller.js';

@Module({
  imports: [AuthModule, CatalogModule, StorageModule, SearchModule],
  controllers: [GatewayController],
})
export class GatewayModule {}

