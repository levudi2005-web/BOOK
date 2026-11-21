import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AdminDatabaseModule } from './admin-database.module.js';
import { AdminSessionService } from './admin-session.service.js';
import { AdminRecoveryCredentialService } from './admin-recovery.service.js';
import { AdminService } from './admin.service.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminController } from './admin.controller.js';
import { AdminRbacGuard } from './admin-rbac.guard.js';
import { AdminSessionAuthGuard } from './admin-session-auth.guard.js';

@Module({
  imports: [DatabaseModule, AdminDatabaseModule],
  controllers: [AdminAuthController, AdminController],
  providers: [
    AdminSessionService,
    AdminRecoveryCredentialService,
    AdminService,
    AdminRbacGuard,
    AdminSessionAuthGuard,
  ],
  exports: [AdminService],
})
export class AdminModule {}
