/**
 * Escritor de PDF mínimo, sin dependencias.
 *
 * Un PDF es una lista de objetos indexados con una tabla `xref` que apunta a
 * su posición en bytes. Como las imágenes ya vienen rasterizadas a JPEG, se
 * incrustan tal cual con el filtro `/DCTDecode`: el lector del PDF hace la
 * decodificación, así que no hace falta reimplementar JPEG ni el predictor
 * PNG del formato.
 */

import { MM_PER_INCH } from '../layout/units';

export const mmToPt = (mm: number): number => (mm / MM_PER_INCH) * 72;

/** Todo el texto de un PDF va en Latin-1 (o WinAnsiEncoding, su superset de facto). */
export function toLatin1(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bytes[i] = code <= 0xff ? code : 0x3f; // '?' para lo que no representa Latin-1
  }
  return bytes;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let cursor = 0;
  for (const part of parts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}

/** Escapa paréntesis y barras invertidas para usar el texto como cadena literal `(...)`. */
export function escapePdfText(text: string): string {
  let escaped = '';
  const latin1 = toLatin1(text);
  for (let i = 0; i < latin1.length; i++) {
    const ch = String.fromCharCode(latin1[i]!);
    escaped += ch === '(' || ch === ')' || ch === '\\' ? `\\${ch}` : ch;
  }
  return escaped;
}

/** Anchos de Helvetica (en milésimas de em) para el rango ASCII imprimible; el resto usa un promedio. */
const HELVETICA_WIDTHS: Record<number, number> = {
  32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191,
  40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556,
  56: 556, 57: 556, 58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556,
  64: 1015, 65: 667, 66: 667, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
  72: 722, 73: 278, 74: 500, 75: 667, 76: 556, 77: 833, 78: 722, 79: 778,
  80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944,
  88: 667, 89: 667, 90: 611, 91: 278, 92: 278, 93: 278, 94: 469, 95: 556,
  96: 333, 97: 556, 98: 556, 99: 500, 100: 556, 101: 556, 102: 278, 103: 556,
  104: 556, 105: 222, 106: 222, 107: 500, 108: 222, 109: 833, 110: 556,
  111: 556, 112: 556, 113: 556, 114: 333, 115: 500, 116: 278, 117: 556,
  118: 500, 119: 722, 120: 500, 121: 500, 122: 500, 123: 334, 124: 260,
  125: 334, 126: 584,
};
const DEFAULT_WIDTH = 556;

export function textWidthHelvetica(text: string, fontSizePt: number): number {
  let units = 0;
  for (let i = 0; i < text.length; i++) {
    units += HELVETICA_WIDTHS[text.charCodeAt(i)] ?? DEFAULT_WIDTH;
  }
  return (units / 1000) * fontSizePt;
}

/** Recorta el texto para que quepa en `maxWidthPt`, agregando "..." si no cabe entero. */
export function truncateToWidth(text: string, fontSizePt: number, maxWidthPt: number): string {
  if (textWidthHelvetica(text, fontSizePt) <= maxWidthPt) return text;
  const suffix = '...';
  let result = text;
  while (result.length > 0 && textWidthHelvetica(result + suffix, fontSizePt) > maxWidthPt) {
    result = result.slice(0, -1);
  }
  return result.length > 0 ? result + suffix : suffix;
}

/**
 * Acumula objetos indexados por número y arma el archivo final con su tabla
 * `xref`. Los objetos se pueden agregar en cualquier orden siempre que cada
 * id reservado con `allocateId` termine con un `addObject`/`addStream`.
 */
export class PdfWriter {
  private objects: Uint8Array[] = [];
  private nextId = 1;

  allocateId(): number {
    return this.nextId++;
  }

  addObject(id: number, body: string): void {
    this.objects[id] = toLatin1(`${id} 0 obj\n${body}\nendobj\n`);
  }

  /** `dictBody` es el contenido del diccionario sin `<<`/`>>` ni `/Length` (se calcula solo). */
  addStream(id: number, dictBody: string, data: Uint8Array): void {
    const header = toLatin1(`${id} 0 obj\n<< ${dictBody} /Length ${data.length} >>\nstream\n`);
    const footer = toLatin1(`\nendstream\nendobj\n`);
    this.objects[id] = concatBytes([header, data, footer]);
  }

  build(rootId: number): Uint8Array {
    const header = toLatin1('%PDF-1.4\n');
    const chunks: Uint8Array[] = [header];
    const offsets: number[] = [0];
    let offset = header.length;

    for (let id = 1; id < this.nextId; id++) {
      const obj = this.objects[id]!;
      offsets[id] = offset;
      chunks.push(obj);
      offset += obj.length;
    }

    const xrefStart = offset;
    let xref = `xref\n0 ${this.nextId}\n0000000000 65535 f \n`;
    for (let id = 1; id < this.nextId; id++) {
      xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    }
    const trailer = `trailer\n<< /Size ${this.nextId} /Root ${rootId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    chunks.push(toLatin1(xref + trailer));

    return concatBytes(chunks);
  }
}
