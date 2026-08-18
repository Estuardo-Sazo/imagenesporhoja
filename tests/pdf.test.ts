/**
 * Pruebas del escritor de PDF.
 *
 * Un PDF con offsets de `xref` incorrectos no lo abre ningún lector, así que
 * se comprueba que cada entrada apunte de verdad al objeto que dice contener.
 */

import { describe, expect, it } from 'vitest';
import {
  escapePdfText,
  PdfWriter,
  textWidthHelvetica,
  truncateToWidth,
} from '../src/lib/export/pdfWriter';

const latin1 = (bytes: Uint8Array) => String.fromCharCode(...bytes);

describe('escapePdfText', () => {
  it('escapa paréntesis y barras invertidas', () => {
    expect(escapePdfText('foto (1).jpg')).toBe('foto \\(1\\).jpg');
    expect(escapePdfText('a\\b')).toBe('a\\\\b');
  });

  it('conserva acentos y eñes como Latin-1', () => {
    expect(escapePdfText('camión-ñandú.jpg')).toBe('camión-ñandú.jpg');
  });

  it('reemplaza caracteres fuera de Latin-1 por "?"', () => {
    expect(escapePdfText('raro★.png')).toBe('raro?.png');
  });
});

describe('textWidthHelvetica / truncateToWidth', () => {
  it('un texto más ancho pesa más que uno corto', () => {
    expect(textWidthHelvetica('mmmmm', 10)).toBeGreaterThan(textWidthHelvetica('ii', 10));
  });

  it('no recorta si ya cabe', () => {
    expect(truncateToWidth('foto.jpg', 6, 1000)).toBe('foto.jpg');
  });

  it('recorta agregando "..." cuando no cabe', () => {
    const long = 'nombre-de-archivo-muy-largo-para-cualquier-columna.jpg';
    const result = truncateToWidth(long, 6, 40);
    expect(result.endsWith('...')).toBe(true);
    expect(textWidthHelvetica(result, 6)).toBeLessThanOrEqual(40);
  });
});

describe('PdfWriter', () => {
  it('produce un archivo con xref coherente y raíz correcta', () => {
    const writer = new PdfWriter();
    const catalogId = writer.allocateId();
    const pagesId = writer.allocateId();
    const pageId = writer.allocateId();

    writer.addObject(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    writer.addObject(pagesId, `<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
    writer.addObject(
      pageId,
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 100 100] /Resources << >> >>`,
    );

    const bytes = writer.build(catalogId);
    const text = latin1(bytes);

    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain(`/Root ${catalogId} 0 R`);

    const xrefStart = Number(text.match(/startxref\n(\d+)/)?.[1]);
    expect(text.slice(xrefStart, xrefStart + 4)).toBe('xref');

    // Cada offset del xref debe apuntar exactamente a "N 0 obj".
    const lines = text
      .slice(text.indexOf('0 4\n') + 4, xrefStart)
      .trim()
      .split('\n');
    lines.forEach((line, index) => {
      if (index === 0) return; // entrada libre del objeto 0
      const offset = Number(line.slice(0, 10));
      expect(text.slice(offset, offset + `${index} 0 obj`.length)).toBe(`${index} 0 obj`);
    });
  });

  it('incrusta un stream binario respetando /Length exacto', () => {
    const writer = new PdfWriter();
    const id = writer.allocateId();
    const data = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x10, 0x20]);
    writer.addStream(id, '/Type /XObject', data);

    const rootId = writer.allocateId();
    writer.addObject(rootId, `<< /Type /Catalog >>`);

    const bytes = writer.build(rootId);
    const text = latin1(bytes);
    const streamStart = text.indexOf('stream\n') + 'stream\n'.length;
    const embedded = bytes.slice(streamStart, streamStart + data.length);
    expect(Array.from(embedded)).toEqual(Array.from(data));
    expect(text).toContain(`/Length ${data.length}`);
  });
});
