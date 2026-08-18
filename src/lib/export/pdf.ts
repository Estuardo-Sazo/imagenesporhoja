/**
 * Genera un PDF con las imágenes ya acomodadas, listo para descargar.
 *
 * Cada imagen se rasteriza a JPEG al tamaño exacto que ocupa (igual que en el
 * .docx) y se incrusta directamente con `/DCTDecode`: el navegador ya hizo la
 * compresión, así que el PDF solo copia esos bytes sin volver a codificarlos.
 */

import type { DocumentLayout, LayoutSettings, SourceImage } from '../layout/types';
import { rasterizePlacement } from './raster';
import {
  escapePdfText,
  mmToPt,
  PdfWriter,
  textWidthHelvetica,
  toLatin1,
  truncateToWidth,
} from './pdfWriter';

export interface PdfOptions {
  layout: DocumentLayout<SourceImage>;
  settings: LayoutSettings;
  showBorders: boolean;
  showCaptions: boolean;
  showPageNumbers: boolean;
  /** Resolución de las imágenes incrustadas. */
  dpi: number;
  onProgress?: (done: number, total: number) => void;
}

const BORDER_COLOR = '0.604 0.639 0.690';
const CAPTION_COLOR = '0.267 0.267 0.267';
const PAGE_NUMBER_COLOR = '0.333 0.333 0.333';
const CAPTION_HEIGHT_MM = 4;

export async function buildPdf(options: PdfOptions): Promise<Blob> {
  const { layout, showBorders, showCaptions, showPageNumbers, dpi } = options;
  const writer = new PdfWriter();
  const catalogId = writer.allocateId();
  const pagesId = writer.allocateId();
  const fontId = writer.allocateId();
  writer.addObject(
    fontId,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  );

  const totalImages = layout.pages.reduce(
    (sum, page) => sum + page.rows.reduce((n, row) => n + row.items.length, 0),
    0,
  );
  let processed = 0;
  const pageIds: number[] = [];

  for (const page of layout.pages) {
    const pageWidthPt = mmToPt(layout.pageWidthMm);
    const pageHeightPt = mmToPt(layout.pageHeightMm);
    const xObjects: string[] = [];
    let content = '';

    for (const row of page.rows) {
      for (const item of row.items) {
        const raster = await rasterizePlacement(item, {
          dpi,
          fit: options.settings.fit,
          format: 'jpeg',
        });

        const imageId = writer.allocateId();
        writer.addStream(
          imageId,
          `/Type /XObject /Subtype /Image /Width ${raster.widthPx} /Height ${raster.heightPx} ` +
            '/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode',
          raster.bytes,
        );
        const name = `Im${imageId}`;
        xObjects.push(`/${name} ${imageId} 0 R`);

        // El PDF mide en puntos con el origen abajo a la izquierda; el
        // acomodo usa milímetros con el origen arriba a la izquierda.
        const xPt = mmToPt(item.xMm);
        const wPt = mmToPt(item.widthMm);
        const hPt = mmToPt(item.heightMm);
        const yPt = pageHeightPt - mmToPt(item.yMm) - hPt;

        content += `q ${wPt.toFixed(2)} 0 0 ${hPt.toFixed(2)} ${xPt.toFixed(2)} ${yPt.toFixed(2)} cm /${name} Do Q\n`;

        if (showBorders) {
          content += `q 0.75 w ${BORDER_COLOR} RG ${xPt.toFixed(2)} ${yPt.toFixed(2)} ${wPt.toFixed(2)} ${hPt.toFixed(2)} re S Q\n`;
        }

        if (showCaptions) {
          const bandHeightPt = mmToPt(CAPTION_HEIGHT_MM);
          const fontSize = 6;
          const maxTextWidth = Math.max(0, wPt - mmToPt(1));
          const text = truncateToWidth(item.image.name, fontSize, maxTextWidth);
          const textWidth = textWidthHelvetica(text, fontSize);
          const textX = xPt + (wPt - textWidth) / 2;
          const textY = yPt + bandHeightPt / 2 - fontSize * 0.35;

          content += `q 1 1 1 rg ${xPt.toFixed(2)} ${yPt.toFixed(2)} ${wPt.toFixed(2)} ${bandHeightPt.toFixed(2)} re f Q\n`;
          content +=
            `BT /F1 ${fontSize} Tf ${CAPTION_COLOR} rg ${textX.toFixed(2)} ${textY.toFixed(2)} Td ` +
            `(${escapePdfText(text)}) Tj ET\n`;
        }

        processed += 1;
        options.onProgress?.(processed, totalImages);
      }
    }

    if (showPageNumbers) {
      const label = `${page.index + 1} / ${layout.pages.length}`;
      const fontSize = 8;
      const textWidth = textWidthHelvetica(label, fontSize);
      const textX = (pageWidthPt - textWidth) / 2;
      const textY = mmToPt(2);
      content +=
        `BT /F1 ${fontSize} Tf ${PAGE_NUMBER_COLOR} rg ${textX.toFixed(2)} ${textY.toFixed(2)} Td ` +
        `(${escapePdfText(label)}) Tj ET\n`;
    }

    const contentId = writer.allocateId();
    writer.addStream(contentId, '', toLatin1(content));

    const pageId = writer.allocateId();
    pageIds.push(pageId);
    writer.addObject(
      pageId,
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(2)}] ` +
        `/Resources << /XObject << ${xObjects.join(' ')} >> /Font << /F1 ${fontId} 0 R >> >> ` +
        `/Contents ${contentId} 0 R >>`,
    );
  }

  writer.addObject(
    pagesId,
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`,
  );
  writer.addObject(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  const bytes = writer.build(catalogId);
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}
