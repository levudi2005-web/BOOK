import { Module } from '@nestjs/common';
import { AdminDatabaseService } from './admin-database.service.js';

@Module({
  providers: [AdminDatabaseService],
  exports: [AdminDatabaseService],
})
export class AdminDatabaseModule {}
