import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { SecurityTokenService } from './security-token.service.js';
import { RecoveryCredentialService } from './recovery-credential.service.js';
import { SessionService } from './session.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [SecurityTokenService, RecoveryCredentialService, SessionService],
  exports: [SecurityTokenService, RecoveryCredentialService, SessionService],
})
export class SecurityModule {}
