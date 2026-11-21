import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Readable } from 'node:stream';
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
  publishBook(
    @CurrentUserId() userId: number,
    @Param('bookUuid') bookUuid: string,
    @Body() body: { scope?: string; authorName?: string; publisherName?: string; publicationYear?: number },
  ) {
    return this.studio.publishBook(userId, bookUuid, body);
  }

  @Get('books/:bookUuid/versions')
  listVersions(@CurrentUserId() userId: number, @Param('bookUuid') bookUuid: string) {
    return this.studio.listVersions(userId, bookUuid);
  }

  @Get('books/:bookUuid/versions/:versionNumber')
  getVersion(
    @CurrentUserId() userId: number,
    @Param('bookUuid') bookUuid: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    return this.studio.getVersion(userId, bookUuid, Number.parseInt(versionNumber, 10) || 0);
  }

  @Post('books/:bookUuid/versions/:versionNumber/restore')
  restoreVersion(
    @CurrentUserId() userId: number,
    @Param('bookUuid') bookUuid: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    return this.studio.restoreVersion(userId, bookUuid, Number.parseInt(versionNumber, 10) || 0);
  }

  @Post('books/:bookUuid/unpublish')
  unpublishBook(@CurrentUserId() userId: number, @Param('bookUuid') bookUuid: string) {
    return this.studio.unpublishBook(userId, bookUuid);
  }

  @Post('books/:bookUuid/cover')
  setCover(
    @CurrentUserId() userId: number,
    @Param('bookUuid') bookUuid: string,
    @Body() body: { objectUuid?: string },
  ) {
    return this.studio.setCover(userId, bookUuid, body.objectUuid ?? '');
  }

  @Get('books/:bookUuid/cover')
  async getCover(
    @CurrentUserId() userId: number,
    @Param('bookUuid') bookUuid: string,
    @Res({ passthrough: true })
    res: { setHeader(name: string, value: string): void },
  ) {
    const { dto, stream } = await this.studio.getOwnedCover(userId, bookUuid);
    res.setHeader('Content-Type', dto.mimeType);
    res.setHeader('Content-Length', String(dto.sizeBytes));
    res.setHeader('Cache-Control', 'private, max-age=60, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(Readable.from(stream));
  }

  @Delete('books/:bookUuid/cover')
  removeCover(@CurrentUserId() userId: number, @Param('bookUuid') bookUuid: string) {
    return this.studio.removeCover(userId, bookUuid);
  }

  @Get('categories')
  listCategories() {
    return this.studio.listAvailableCategories();
  }

  @Put('books/:bookUuid/categories')
  setCategories(
    @CurrentUserId() userId: number,
    @Param('bookUuid') bookUuid: string,
    @Body() body: { categoryIds?: number[] },
  ) {
    return this.studio.setCategories(userId, bookUuid, body.categoryIds ?? []);
  }

  @Put('books/:bookUuid/tags')
  setTags(
    @CurrentUserId() userId: number,
    @Param('bookUuid') bookUuid: string,
    @Body() body: { tags?: string[] },
  ) {
    return this.studio.setTags(userId, bookUuid, body.tags ?? []);
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
