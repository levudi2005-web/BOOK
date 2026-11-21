declare module 'pdfmake/build/pdfmake.js' {
  import type { TDocumentDefinitions } from 'pdfmake/interfaces';

  interface BrowserPdfDocument {
    getBlob(callback: (blob: Blob) => void): void;
  }

  const pdfMake: {
    addVirtualFileSystem(fonts: Record<string, string>): void;
    createPdf(definition: TDocumentDefinitions): BrowserPdfDocument;
  };
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts.js' {
  const fonts: Record<string, string>;
  export default fonts;
}

declare module 'html-to-pdfmake' {
  import type { Content } from 'pdfmake/interfaces';

  export type HtmlToPdfmakeOptions = { window?: Window };
  export default function htmlToPdfmake(html: string, options?: HtmlToPdfmakeOptions): Content | Content[];
}
