import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../common/current-user.decorator.js';
import { SessionAuthGuard } from '../common/session-auth.guard.js';
import { StudioService } from './studio.service.js';

@Controller('studio')
@UseGuards(SessionAuthGuard)
export class StudioController {
  constructor(private readonly studio: StudioService) {}

  @Get('books')
  listBooks(@CurrentUserId() userId: number) {
    return this.studio.listBooks(userId);
  }

  @Post('books')
  createBook(
    @CurrentUserId() userId: number,
    @Body() body: { title?: string; subtitle?: string; description?: string; language?: string },
  ) {
    return this.studio.createBook(userId, body);
  }

  @Get('books/:bookUuid')
  getBook(@CurrentUserId() userId: number, @Param('bookUuid') bookUuid: string) {
    return this.studio.getBook(userId, bookUuid);
  }

  @Put('books/:bookUuid')
  updateBook(
    @CurrentUserId() userId: number,
    @Param('bookUuid') bookUuid: string,
    @Body() body: { title?: string; subtitle?: string; description?: string; language?: string },
  ) {
    return this.studio.updateBook(userId, bookUuid, body);
  }

  @Delete('books/:bookUuid')
  deleteBook(@CurrentUserId() userId: number, @Param('bookUuid') bookUuid: string) {
    return this.studio.deleteBook(userId, bookUuid);
  }

  @Post('books/:bookUuid/publish')
  publishBook(@CurrentUserId() userId: number, @Param('bookUuid') bookUuid: string) {
    return this.studio.publishBook(userId, bookUuid);
  }

  @Get('books/:bookUuid/versions')
  listVersions(@CurrentUserId() userId: number, @Param('bookUuid') bookUuid: string) {
    return this.studio.listVersions(userId, bookUuid);
  }

  @Post('books/:bookUuid/chapters')
  createChapter(
    @CurrentUserId() userId: number,
    @Param('bookUuid') bookUuid: string,
    @Body() body: { title?: string; content?: string },
  ) {
    return this.studio.createChapter(userId, bookUuid, body);
  }

  @Put('chapters/:chapterUuid')
  updateChapter(
    @CurrentUserId() userId: number,
    @Param('chapterUuid') chapterUuid: string,
    @Body() body: { title?: string; content?: string },
  ) {
    return this.studio.updateChapter(userId, chapterUuid, body);
  }

  @Delete('chapters/:chapterUuid')
  deleteChapter(@CurrentUserId() userId: number, @Param('chapterUuid') chapterUuid: string) {
    return this.studio.deleteChapter(userId, chapterUuid);
  }

  @Post('books/:bookUuid/chapters/reorder')
  reorderChapters(
    @CurrentUserId() userId: number,
    @Param('bookUuid') bookUuid: string,
    @Body() body: { orderedUuids?: string[] },
  ) {
    return this.studio.reorderChapters(userId, bookUuid, body.orderedUuids ?? []);
  }
}
