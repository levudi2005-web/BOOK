import { Controller, Get, Param, Query, Res, StreamableFile } from '@nestjs/common';
import { Readable } from 'node:stream';
import { CatalogService } from './catalog.service.js';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('books')
  listBooks(@Query() query: Record<string, string>) {
    return this.catalog.listBooks(query);
  }

  @Get('books/:slug/cover')
  async getBookCover(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: { setHeader(name: string, value: string): void },
  ) {
    const { dto, stream } = await this.catalog.getPublicCover(slug);
    res.setHeader('Content-Type', dto.mimeType);
    res.setHeader('Content-Length', String(dto.sizeBytes));
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(Readable.from(stream));
  }

  @Get('books/:slug')
  getBook(@Param('slug') slug: string) {
    return this.catalog.getBook(slug);
  }

  @Get('categories')
  listCategories() {
    return this.catalog.listCategories();
  }

  @Get('authors')
  listAuthors() {
    return this.catalog.listAuthors();
  }

  @Get('publishers')
  listPublishers() {
    return this.catalog.listPublishers();
  }

  @Get('books/:slug/chapters')
  getBookChapters(@Param('slug') slug: string) {
    return this.catalog.getBookChapters(slug);
  }
}

