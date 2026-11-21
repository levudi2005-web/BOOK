import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { CatalogService } from './catalog.service.js';

@Module({
  imports: [DatabaseModule, StorageModule],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
