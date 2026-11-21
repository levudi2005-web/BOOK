import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import { CurrentUserId } from '../common/current-user.decorator.js';
import { SessionAuthGuard } from '../common/session-auth.guard.js';
import { StorageService } from './storage.service.js';

@Controller('storage')
@UseGuards(SessionAuthGuard)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Get('quota')
  getQuota(@CurrentUserId() userId: number) {
    return this.storage.getQuota(userId);
  }

  @Post('objects')
  initUpload(
    @CurrentUserId() userId: number,
    @Body() body: { filename?: string; mimeType?: string; totalBytes?: number },
  ) {
    return this.storage.initUpload(
      userId,
      body.filename ?? '',
      body.mimeType ?? 'application/octet-stream',
      Number(body.totalBytes ?? 0),
    );
  }

  @Post('objects/:sessionUuid/chunks')
  uploadChunk(
    @CurrentUserId() userId: number,
    @Param('sessionUuid') sessionUuid: string,
    @Body() body: { chunkIndex?: number; data?: string },
  ) {
    return this.storage.uploadChunk(userId, sessionUuid, Number(body.chunkIndex ?? 0), body.data ?? '');
  }

  @Post('objects/:sessionUuid/complete')
  completeUpload(@CurrentUserId() userId: number, @Param('sessionUuid') sessionUuid: string) {
    return this.storage.completeUpload(userId, sessionUuid);
  }

  @Post('objects/:sessionUuid/cancel')
  cancelUpload(@CurrentUserId() userId: number, @Param('sessionUuid') sessionUuid: string) {
    return this.storage.cancelUpload(userId, sessionUuid);
  }

  @Get('objects')
  listObjects(@CurrentUserId() userId: number) {
    return this.storage.listObjects(userId);
  }

  @Get('objects/:objectUuid')
  getObject(@CurrentUserId() userId: number, @Param('objectUuid') objectUuid: string) {
    return this.storage.getObject(userId, objectUuid);
  }

  @Delete('objects/:objectUuid')
  deleteObject(@CurrentUserId() userId: number, @Param('objectUuid') objectUuid: string) {
    return this.storage.deleteObject(userId, objectUuid);
  }

  @Get('trash')
  listTrash(@CurrentUserId() userId: number) {
    return this.storage.listTrash(userId);
  }

  @Post('objects/:objectUuid/restore')
  restoreObject(@CurrentUserId() userId: number, @Param('objectUuid') objectUuid: string) {
    return this.storage.restoreObject(userId, objectUuid);
  }

  @Delete('objects/:objectUuid/permanent')
  permanentDelete(@CurrentUserId() userId: number, @Param('objectUuid') objectUuid: string) {
    return this.storage.permanentDelete(userId, objectUuid);
  }

  @Get('objects/:objectUuid/download')
  async download(@CurrentUserId() userId: number, @Param('objectUuid') objectUuid: string) {
    const { dto, stream } = await this.storage.downloadStream(userId, objectUuid);
    return new StreamableFile(Readable.from(stream), {
      type: dto.mimeType,
      disposition: `attachment; filename="${dto.filename.replaceAll('"', '')}"`,
      length: dto.sizeBytes,
    });
  }
}
