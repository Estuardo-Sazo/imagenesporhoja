/**
 * Escritor de archivos ZIP mínimo, sin dependencias.
 *
 * Un .docx no es más que un ZIP con XML adentro. Como las imágenes que
 * guardamos ya vienen comprimidas (JPEG/PNG), usamos el método "store"
 * (sin compresión): el archivo pesa prácticamente lo mismo y evitamos
 * arrastrar una librería de compresión al navegador.
 */

export interface ZipEntry {
  /** Ruta dentro del ZIP, por ejemplo `word/document.xml`. */
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const SIGNATURE_LOCAL = 0x04034b50;
const SIGNATURE_CENTRAL = 0x02014b50;
const SIGNATURE_END = 0x06054b50;
/** Marca "nombre en UTF-8". */
const FLAG_UTF8 = 0x0800;

/** Empaqueta las entradas en un ZIP válido y devuelve sus bytes. */
export function createZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const { data } = entry;
    const checksum = crc32(data);

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, SIGNATURE_LOCAL, true);
    lv.setUint16(4, 20, true); // versión necesaria
    lv.setUint16(6, FLAG_UTF8, true);
    lv.setUint16(8, 0, true); // método: store
    lv.setUint16(10, 0, true); // hora
    lv.setUint16(12, 0x2100, true); // fecha
    lv.setUint32(14, checksum, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);

    chunks.push(local, data);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, SIGNATURE_CENTRAL, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, FLAG_UTF8, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x2100, true);
    cv.setUint32(16, checksum, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(38, 0, true); // atributos externos
    cv.setUint32(42, offset, true);
    central.set(name, 46);

    directory.push(central);
    offset += local.length + data.length;
  }

  const directorySize = directory.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, SIGNATURE_END, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, directorySize, true);
  ev.setUint32(16, offset, true);

  const all = [...chunks, ...directory, end];
  const total = all.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let cursor = 0;
  for (const part of all) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}
