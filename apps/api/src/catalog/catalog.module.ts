import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { CatalogService } from './catalog.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
