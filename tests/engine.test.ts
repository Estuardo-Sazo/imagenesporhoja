/**
 * Pruebas del motor de acomodo.
 *
 * Lo que se verifica en cada caso:
 *  - no se pierde ninguna imagen,
 *  - nada se sale de los márgenes,
 *  - ninguna imagen se deforma,
 *  - ninguna imagen se encima con otra.
 */

import { describe, expect, it } from 'vitest';
import { arrangeGrid, arrangeJustified, computeDocumentLayout, aspectRatio } from '../src/lib/layout/engine';
import type { LayoutSettings, Measurable, PlacedImage } from '../src/lib/layout/types';
import { uniformMargins } from '../src/lib/layout/units';

const image = (ratio: number): Measurable => ({
  naturalWidth: Math.round(ratio * 1000),
  naturalHeight: 1000,
  rotation: 0,
});

const settings = (patch: Partial<LayoutSettings> = {}): LayoutSettings => ({
  paperId: 'carta',
  orientation: 'portrait',
  margins: uniformMargins(10),
  gapMm: 3,
  imagesPerPage: 7,
  mode: 'auto',
  fit: 'contain',
  balance: 0.25,
  uniformSizing: true,
  ...patch,
});

const CONTENT = { xMm: 10, yMm: 10, widthMm: 195.9, heightMm: 259.4 };
const EPS = 0.02;

function flatten<T>(rows: Array<{ items: PlacedImage<T>[] }>): PlacedImage<T>[] {
  return rows.flatMap((row) => row.items);
}

function expectValid(items: PlacedImage<Measurable>[], expectedCount: number) {
  expect(items).toHaveLength(expectedCount);

  for (const item of items) {
    // dentro del área útil
    expect(item.xMm).toBeGreaterThanOrEqual(CONTENT.xMm - EPS);
    expect(item.yMm).toBeGreaterThanOrEqual(CONTENT.yMm - EPS);
    expect(item.xMm + item.widthMm).toBeLessThanOrEqual(CONTENT.xMm + CONTENT.widthMm + EPS);
    expect(item.yMm + item.heightMm).toBeLessThanOrEqual(CONTENT.yMm + CONTENT.heightMm + EPS);
    // sin deformar
    expect(item.widthMm / item.heightMm).toBeCloseTo(aspectRatio(item.image), 2);
    expect(item.widthMm).toBeGreaterThan(0);
  }

  // sin encimarse
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]!;
      const b = items[j]!;
      const overlaps =
        a.xMm < b.xMm + b.widthMm - EPS &&
        b.xMm < a.xMm + a.widthMm - EPS &&
        a.yMm < b.yMm + b.heightMm - EPS &&
        b.yMm < a.yMm + a.heightMm - EPS;
      expect(overlaps).toBe(false);
    }
  }
}

const SCENARIOS: Array<[string, number[]]> = [
  ['7 mezcladas', [0.75, 0.75, 0.75, 1.5, 1.5, 1, 1]],
  ['7 horizontales 4:3', Array(7).fill(4 / 3)],
  ['7 verticales 3:4', Array(7).fill(0.75)],
  ['7 panorámicas 16:9', Array(7).fill(16 / 9)],
  ['6 cuadradas', Array(6).fill(1)],
  ['9 cuadradas', Array(9).fill(1)],
  ['12 mezcladas', [0.75, 1.5, 1, 0.75, 1.33, 1, 1.77, 0.6, 1, 1.2, 0.9, 1.4]],
  ['1 sola', [1.4]],
  ['2 imágenes', [0.75, 1.5]],
  ['20 mezcladas', Array.from({ length: 20 }, (_, i) => [0.75, 1.33, 1, 1.6][i % 4]!)],
];

describe('arrangeJustified', () => {
  it.each(SCENARIOS)('coloca correctamente el caso "%s"', (_name, ratios) => {
    const images = ratios.map(image);
    const result = arrangeJustified(images, CONTENT, 3, 0.25);
    expect(result).not.toBeNull();
    expectValid(flatten(result!.rows), images.length);
  });

  it('devuelve null cuando hay demasiadas imágenes para la búsqueda exhaustiva', () => {
    const images = Array.from({ length: 21 }, () => image(1));
    expect(arrangeJustified(images, CONTENT, 3, 0.25)).toBeNull();
  });

  it('con equilibrio alto iguala las alturas de las filas', () => {
    const images = Array(9).fill(0).map(() => image(1));
    const balanced = arrangeJustified(images, CONTENT, 3, 0.6)!;
    const heights = balanced.rows.map((row) => row.heightMm);
    expect(Math.max(...heights) / Math.min(...heights)).toBeLessThan(1.2);
  });

  it('con equilibrio cero prioriza cubrir más superficie', () => {
    const images = Array(9).fill(0).map(() => image(1));
    const greedy = arrangeJustified(images, CONTENT, 3, 0)!;
    const balanced = arrangeJustified(images, CONTENT, 3, 0.6)!;
    expect(greedy.area).toBeGreaterThanOrEqual(balanced.area);
  });
});

describe('arrangeGrid', () => {
  it.each(SCENARIOS)('coloca correctamente el caso "%s"', (_name, ratios) => {
    const images = ratios.map(image);
    const result = arrangeGrid(images, CONTENT, 3, 'contain');
    expect(result).not.toBeNull();
    expectValid(flatten(result!.rows), images.length);
  });

  it('en modo recorte todas las celdas miden lo mismo', () => {
    const images = [0.75, 1.5, 1, 1.33].map(image);
    const rows = arrangeGrid(images, CONTENT, 3, 'cover')!.rows;
    const items = flatten(rows);
    const first = items[0]!;
    for (const item of items) {
      expect(item.widthMm).toBeCloseTo(first.widthMm, 6);
      expect(item.heightMm).toBeCloseTo(first.heightMm, 6);
    }
  });
});

describe('computeDocumentLayout', () => {
  it('reparte las imágenes en páginas según el número pedido', () => {
    const images = Array.from({ length: 15 }, () => image(0.75));
    const layout = computeDocumentLayout(images, settings({ imagesPerPage: 7 }));
    expect(layout.pages).toHaveLength(3);
    expect(layout.pages[0]!.rows.flatMap((r) => r.items)).toHaveLength(7);
    expect(layout.pages[2]!.rows.flatMap((r) => r.items)).toHaveLength(1);
  });

  it('respeta los márgenes indicados en todas las páginas', () => {
    const images = Array.from({ length: 14 }, (_, i) => image([0.75, 1.5, 1][i % 3]!));
    const layout = computeDocumentLayout(images, settings());
    for (const page of layout.pages) {
      expectValid(flatten(page.rows), 7);
    }
  });

  it('aplica la orientación horizontal', () => {
    const layout = computeDocumentLayout([image(1)], settings({ orientation: 'landscape' }));
    expect(layout.pageWidthMm).toBeGreaterThan(layout.pageHeightMm);
  });

  it('informa un aprovechamiento razonable del área útil', () => {
    const images = [0.75, 0.75, 0.75, 1.5, 1.5, 1, 1].map(image);
    const layout = computeDocumentLayout(images, settings({ balance: 0 }));
    expect(layout.coverage).toBeGreaterThan(80);
    expect(layout.coverage).toBeLessThanOrEqual(100);
  });

  it('falla con un mensaje claro si los márgenes se comen la hoja', () => {
    expect(() =>
      computeDocumentLayout([image(1)], settings({ margins: uniformMargins(120) })),
    ).toThrow(/márgenes/i);
  });

  it('tiene en cuenta la rotación al calcular la proporción', () => {
    const rotated: Measurable = { naturalWidth: 1000, naturalHeight: 2000, rotation: 90 };
    expect(aspectRatio(rotated)).toBeCloseTo(2, 6);
  });
});

describe('última hoja incompleta', () => {
  // El caso reportado: 5 imágenes a 4 por hoja. La quinta se quedaba sola en
  // la segunda hoja y se agrandaba hasta llenar el papel.
  const cinco = [0.75, 1.5, 1, 1.33, 0.75].map(image);

  it('mantiene el tamaño de una hoja llena', () => {
    const layout = computeDocumentLayout(cinco, settings({ imagesPerPage: 4 }));
    expect(layout.pages).toHaveLength(2);

    const primera = flatten(layout.pages[0]!.rows);
    const ultima = flatten(layout.pages[1]!.rows);
    expect(ultima).toHaveLength(1);

    // La imagen suelta no puede ser más grande que la mayor de la hoja llena.
    const mayorEnHojaLlena = Math.max(...primera.map((i) => i.widthMm * i.heightMm));
    const areaSuelta = ultima[0]!.widthMm * ultima[0]!.heightMm;
    expect(areaSuelta).toBeLessThanOrEqual(mayorEnHojaLlena + 1);
  });

  it('coloca la imagen suelta donde le tocaría en una hoja llena', () => {
    const layout = computeDocumentLayout(cinco, settings({ imagesPerPage: 4 }));
    const suelta = flatten(layout.pages[1]!.rows)[0]!;
    // Arriba a la izquierda, en línea con el resto del documento.
    expect(suelta.xMm).toBeCloseTo(10, 0);
    expect(suelta.yMm).toBeLessThan(100);
  });

  it('al desactivar la opción, la última hoja vuelve a llenarse', () => {
    const conUniforme = computeDocumentLayout(cinco, settings({ imagesPerPage: 4 }));
    const sinUniforme = computeDocumentLayout(
      cinco,
      settings({ imagesPerPage: 4, uniformSizing: false }),
    );
    const a = flatten(conUniforme.pages[1]!.rows)[0]!;
    const b = flatten(sinUniforme.pages[1]!.rows)[0]!;
    expect(b.widthMm).toBeGreaterThan(a.widthMm * 1.5);
  });

  it('una hoja única sí aprovecha todo el papel', () => {
    // Con 3 imágenes y 4 por hoja no hay con qué comparar: debe llenarse.
    const tres = [0.75, 1.5, 1].map(image);
    const layout = computeDocumentLayout(tres, settings({ imagesPerPage: 4 }));
    expect(layout.pages).toHaveLength(1);
    expect(layout.coverage).toBeGreaterThan(60);
  });

  it('no pierde ni duplica imágenes al completar la hoja', () => {
    const doce = Array.from({ length: 11 }, (_, i) => image([0.75, 1.33, 1][i % 3]!));
    const layout = computeDocumentLayout(doce, settings({ imagesPerPage: 4 }));
    const colocadas = layout.pages.flatMap((p) => flatten(p.rows));
    expect(colocadas).toHaveLength(11);
    expect(new Set(colocadas.map((c) => c.image)).size).toBe(11);
  });

  it('también funciona en cuadrícula uniforme', () => {
    const layout = computeDocumentLayout(
      cinco,
      settings({ imagesPerPage: 4, mode: 'grid' }),
    );
    const primera = flatten(layout.pages[0]!.rows);
    const ultima = flatten(layout.pages[1]!.rows);
    expect(ultima).toHaveLength(1);
    expect(ultima[0]!.heightMm).toBeLessThanOrEqual(
      Math.max(...primera.map((i) => i.heightMm)) + 1,
    );
  });

  it('respeta los márgenes también en la hoja incompleta', () => {
    const layout = computeDocumentLayout(cinco, settings({ imagesPerPage: 4 }));
    expectValid(flatten(layout.pages[1]!.rows), 1);
  });
});
