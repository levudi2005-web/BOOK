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
import { DocumentsService } from './documents.service.js';

@Controller('documents')
@UseGuards(SessionAuthGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@CurrentUserId() userId: number) {
    return this.documents.listDocuments(userId);
  }

  @Post()
  create(@CurrentUserId() userId: number, @Body() body: { title?: string; kind?: string }) {
    return this.documents.createDocument(userId, body.title ?? 'Untitled', body.kind ?? 'writer');
  }

  @Get(':documentUuid')
  get(@CurrentUserId() userId: number, @Param('documentUuid') documentUuid: string) {
    return this.documents.getDocument(userId, documentUuid);
  }

  @Put(':documentUuid')
  update(
    @CurrentUserId() userId: number,
    @Param('documentUuid') documentUuid: string,
    @Body() body: { title?: string; content?: unknown },
  ) {
    return this.documents.updateDocument(userId, documentUuid, body);
  }

  @Delete(':documentUuid')
  remove(@CurrentUserId() userId: number, @Param('documentUuid') documentUuid: string) {
    return this.documents.deleteDocument(userId, documentUuid);
  }
}
