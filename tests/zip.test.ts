/**
 * Pruebas del escritor de ZIP.
 *
 * Un .docx mal empaquetado no lo abre Word, así que se comprueba la
 * estructura binaria: firmas, checksums y directorio central.
 */

import { describe, expect, it } from 'vitest';
import { createZip, crc32 } from '../src/lib/export/zip';

const bytes = (text: string) => new TextEncoder().encode(text);

const readU32 = (data: Uint8Array, offset: number) =>
  new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(offset, true);
const readU16 = (data: Uint8Array, offset: number) =>
  new DataView(data.buffer, data.byteOffset, data.byteLength).getUint16(offset, true);

describe('crc32', () => {
  it('coincide con los valores de referencia conocidos', () => {
    expect(crc32(bytes(''))).toBe(0);
    expect(crc32(bytes('a'))).toBe(0xe8b7be43);
    expect(crc32(bytes('123456789'))).toBe(0xcbf43926);
  });
});

describe('createZip', () => {
  const zip = createZip([
    { name: '[Content_Types].xml', data: bytes('<Types/>') },
    { name: 'word/document.xml', data: bytes('<w:document/>') },
    { name: 'word/media/image1.jpg', data: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]) },
  ]);

  it('empieza con la firma de encabezado local', () => {
    expect(readU32(zip, 0)).toBe(0x04034b50);
  });

  it('termina con el registro de fin de directorio central', () => {
    const end = zip.length - 22;
    expect(readU32(end === 0 ? zip : zip, end)).toBe(0x06054b50);
    expect(readU16(zip, end + 8)).toBe(3); // entradas en este disco
    expect(readU16(zip, end + 10)).toBe(3); // entradas totales
  });

  it('apunta a un directorio central coherente', () => {
    const end = zip.length - 22;
    const size = readU32(zip, end + 12);
    const offset = readU32(zip, end + 16);
    expect(offset + size).toBe(end);
    expect(readU32(zip, offset)).toBe(0x02014b50);
  });

  it('guarda sin comprimir y con el tamaño correcto', () => {
    const data = bytes('<Types/>');
    expect(readU16(zip, 8)).toBe(0); // método 0 = store
    expect(readU32(zip, 18)).toBe(data.length); // tamaño comprimido
    expect(readU32(zip, 22)).toBe(data.length); // tamaño original
    expect(readU32(zip, 14)).toBe(crc32(data));
  });

  it('marca los nombres como UTF-8', () => {
    expect(readU16(zip, 6) & 0x0800).toBe(0x0800);
  });

  it('soporta nombres con acentos', () => {
    const withAccents = createZip([{ name: 'imágenes/ñandú.txt', data: bytes('hola') }]);
    const nameLength = readU16(withAccents, 26);
    const name = new TextDecoder().decode(withAccents.slice(30, 30 + nameLength));
    expect(name).toBe('imágenes/ñandú.txt');
  });

  it('produce un archivo vacío pero válido sin entradas', () => {
    const empty = createZip([]);
    expect(empty.length).toBe(22);
    expect(readU32(empty, 0)).toBe(0x06054b50);
  });
});
