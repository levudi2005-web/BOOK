import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../common/current-user.decorator.js';
import { SessionAuthGuard } from '../common/session-auth.guard.js';
import { ProfileService } from './profile.service.js';

@Controller('me')
@UseGuards(SessionAuthGuard)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  me(@CurrentUserId() userId: number) {
    return this.profile.getMe(userId);
  }

  @Patch()
  update(
    @CurrentUserId() userId: number,
    @Body() body: { displayName?: string; bio?: string; websiteUrl?: string; isPublic?: boolean },
  ) {
    return this.profile.updateMe(userId, body ?? {});
  }
}
