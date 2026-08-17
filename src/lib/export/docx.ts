/**
 * Genera un documento de Word (.docx) con las imágenes ya acomodadas.
 *
 * Cada fila del acomodo se convierte en una tabla de una sola fila, sin
 * bordes y centrada; los rellenos laterales de cada celda reproducen las
 * separaciones exactas de la vista previa. Entre filas se intercala un
 * párrafo de altura fija.
 */

import type { DocumentLayout, LayoutSettings, PlacedImage, SourceImage } from '../layout/types';
import { mmToTwips, resolvePageSize } from '../layout/units';
import { rasterizePlacement } from './raster';
import { createZip, type ZipEntry } from './zip';
import {
  contentTypesXml,
  documentRelsXml,
  documentXml,
  emptyParagraph,
  footerRelationship,
  imageCell,
  imageParagraph,
  imageRelationship,
  imageRowTable,
  inlineImage,
  captionParagraph,
  pageBreakParagraph,
  pageNumberFooterXml,
  packageRelsXml,
  sectionProperties,
  spacerParagraph,
} from './ooxml';

/**
 * Word necesita un párrafo final después del contenido. Encogemos todo un
 * 1.5 % para que ese párrafo nunca empuje una hoja extra en blanco; a simple
 * vista la diferencia es imperceptible.
 */
const SAFETY = 0.985;

export interface DocxOptions {
  layout: DocumentLayout<SourceImage>;
  settings: LayoutSettings;
  showBorders: boolean;
  showCaptions: boolean;
  showPageNumbers: boolean;
  /** Resolución de las imágenes incrustadas. */
  dpi: number;
  onProgress?: (done: number, total: number) => void;
}

/** Rellenos laterales que reproducen la separación real entre imágenes. */
function sidePaddings(items: PlacedImage<SourceImage>[]): Array<{ left: number; right: number }> {
  return items.map((item, index) => {
    const previousRight = index > 0 ? items[index - 1]!.xMm + items[index - 1]!.widthMm : null;
    const nextLeft = index < items.length - 1 ? items[index + 1]!.xMm : null;
    return {
      left: previousRight === null ? 0 : Math.max(0, (item.xMm - previousRight) / 2),
      right: nextLeft === null ? 0 : Math.max(0, (nextLeft - (item.xMm + item.widthMm)) / 2),
    };
  });
}

export async function buildDocx(options: DocxOptions): Promise<Blob> {
  const { layout, settings, showBorders, showCaptions, showPageNumbers, dpi } = options;
  const { widthMm, heightMm } = resolvePageSize(settings.paperId, settings.orientation);

  const media: ZipEntry[] = [];
  const relationships: string[] = [];
  let relationId = 0;
  let elementId = 0;
  let body = '';

  const totalImages = layout.pages.reduce(
    (sum, page) => sum + page.rows.reduce((n, row) => n + row.items.length, 0),
    0,
  );
  let processed = 0;

  for (let p = 0; p < layout.pages.length; p++) {
    const { rows } = layout.pages[p]!;

    // Espacio superior, para que el bloque quede centrado igual que en pantalla.
    const leading = Math.max(0, rows[0]!.topMm - settings.margins.top) * SAFETY;
    if (leading > 0.4) body += spacerParagraph(leading);

    for (let r = 0; r < rows.length; r++) {
      const { items } = rows[r]!;
      const paddings = sidePaddings(items);
      const columnWidthsTwips = items.map((item, j) =>
        mmToTwips((item.widthMm + paddings[j]!.left + paddings[j]!.right) * SAFETY),
      );

      const cells: string[] = [];
      for (let j = 0; j < items.length; j++) {
        const item = items[j]!;
        const raster = await rasterizePlacement(item, { dpi, fit: settings.fit });

        relationId += 1;
        elementId += 1;
        const fileName = `image${elementId}.${raster.extension}`;
        media.push({ name: `word/media/${fileName}`, data: raster.bytes });
        relationships.push(imageRelationship(`rId${relationId}`, fileName));

        const drawing = inlineImage({
          id: elementId,
          relationId: `rId${relationId}`,
          widthMm: item.widthMm * SAFETY,
          heightMm: item.heightMm * SAFETY,
          name: item.image.name,
        });

        cells.push(
          imageCell({
            widthTwips: columnWidthsTwips[j]!,
            padLeftMm: paddings[j]!.left,
            padRightMm: paddings[j]!.right,
            borders: showBorders,
            content:
              imageParagraph(drawing) + (showCaptions ? captionParagraph(item.image.name) : ''),
          }),
        );

        processed += 1;
        options.onProgress?.(processed, totalImages);
      }

      body += imageRowTable({ columnWidthsTwips, cells });
      if (r < rows.length - 1) body += spacerParagraph(settings.gapMm * SAFETY);
    }

    body += p < layout.pages.length - 1 ? pageBreakParagraph() : emptyParagraph();
  }

  let footerRelationId: string | undefined;
  if (showPageNumbers) {
    relationId += 1;
    footerRelationId = `rId${relationId}`;
    relationships.push(footerRelationship(footerRelationId));
  }

  body += sectionProperties({
    widthMm,
    heightMm,
    landscape: settings.orientation === 'landscape',
    margins: settings.margins,
    footerRelationId,
  });

  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: encoder.encode(contentTypesXml(showPageNumbers)) },
    { name: '_rels/.rels', data: encoder.encode(packageRelsXml()) },
    { name: 'word/document.xml', data: encoder.encode(documentXml(body)) },
    { name: 'word/_rels/document.xml.rels', data: encoder.encode(documentRelsXml(relationships)) },
    ...media,
  ];
  if (showPageNumbers) {
    entries.push({ name: 'word/footer1.xml', data: encoder.encode(pageNumberFooterXml()) });
  }

  const bytes = createZip(entries);
  return new Blob([bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/** Dispara la descarga del archivo en el navegador. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 2000);
}
