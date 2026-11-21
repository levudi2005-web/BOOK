import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../common/current-user.decorator.js';
import { SessionAuthGuard } from '../common/session-auth.guard.js';
import { SocialService } from './social.service.js';

@Controller()
export class SocialController {
  constructor(private readonly social: SocialService) {}

  // --- Library (auth) ---
  @Get('library')
  @UseGuards(SessionAuthGuard)
  library(@CurrentUserId() userId: number) {
    return this.social.listLibrary(userId);
  }

  @Post('library/:slug')
  @UseGuards(SessionAuthGuard)
  addToLibrary(@CurrentUserId() userId: number, @Param('slug') slug: string) {
    return this.social.addToLibrary(userId, slug);
  }

  @Patch('library/:slug')
  @UseGuards(SessionAuthGuard)
  updateLibrary(
    @CurrentUserId() userId: number,
    @Param('slug') slug: string,
    @Body() body: { status?: string; isFavorite?: boolean },
  ) {
    return this.social.updateLibrary(userId, slug, body);
  }

  @Delete('library/:slug')
  @UseGuards(SessionAuthGuard)
  removeFromLibrary(@CurrentUserId() userId: number, @Param('slug') slug: string) {
    return this.social.removeFromLibrary(userId, slug);
  }

  // --- Progress + history (auth) ---
  @Get('progress/:slug')
  @UseGuards(SessionAuthGuard)
  getProgress(@CurrentUserId() userId: number, @Param('slug') slug: string) {
    return this.social.getProgress(userId, slug);
  }

  @Put('progress/:slug')
  @UseGuards(SessionAuthGuard)
  saveProgress(
    @CurrentUserId() userId: number,
    @Param('slug') slug: string,
    @Body() body: { chapterId?: number; percentComplete?: number; isCompleted?: boolean },
  ) {
    return this.social.saveProgress(userId, slug, body);
  }

  @Get('history')
  @UseGuards(SessionAuthGuard)
  history(@CurrentUserId() userId: number) {
    return this.social.getHistory(userId);
  }

  // --- Comments (public read, auth write) ---
  @Get('books/:slug/comments')
  comments(@Param('slug') slug: string) {
    return this.social.listComments(slug);
  }

  @Post('books/:slug/comments')
  @UseGuards(SessionAuthGuard)
  addComment(
    @CurrentUserId() userId: number,
    @Param('slug') slug: string,
    @Body() body: { body?: string },
  ) {
    return this.social.addComment(userId, slug, body.body ?? '');
  }

  @Delete('comments/:commentUuid')
  @UseGuards(SessionAuthGuard)
  deleteComment(@CurrentUserId() userId: number, @Param('commentUuid') commentUuid: string) {
    return this.social.deleteComment(userId, commentUuid);
  }

  // --- Reviews (public read, auth write) ---
  @Get('books/:slug/reviews')
  reviews(@Param('slug') slug: string) {
    return this.social.listReviews(slug);
  }

  @Post('books/:slug/reviews')
  @UseGuards(SessionAuthGuard)
  addReview(
    @CurrentUserId() userId: number,
    @Param('slug') slug: string,
    @Body() body: { rating?: number; title?: string; body?: string },
  ) {
    return this.social.addReview(userId, slug, body);
  }
}
