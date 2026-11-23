import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../common/current-user.decorator.js';
import { SessionAuthGuard } from '../common/session-auth.guard.js';
import { FeedbackService } from './feedback.service.js';

@Controller('feedback')
@UseGuards(SessionAuthGuard)
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  create(
    @CurrentUserId() userId: number,
    @Body() body: { kind?: string; subject?: string; message?: string; pagePath?: string },
  ) {
    return this.feedback.create(userId, body ?? {});
  }

  @Get('mine')
  mine(@CurrentUserId() userId: number) {
    return this.feedback.listMine(userId);
  }
}
