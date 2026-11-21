import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('books')
  listBooks(@Query() query: Record<string, string>) {
    return this.catalog.listBooks(query);
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

