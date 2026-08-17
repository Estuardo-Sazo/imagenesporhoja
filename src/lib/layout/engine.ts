/**
 * Motor de acomodo.
 *
 * Problema: colocar N imágenes de proporciones distintas en una hoja,
 * respetando márgenes, sin deformarlas y desperdiciando el menor espacio
 * posible.
 *
 * Se evalúan dos estrategias y gana la de mejor puntaje:
 *
 * 1. Filas justificadas (`arrangeJustified`)
 *    Reparte las imágenes en filas respetando su orden. Cada fila ocupa todo
 *    el ancho útil, así que su altura queda determinada por la suma de
 *    proporciones de las imágenes que contiene. Se prueban TODAS las formas
 *    de cortar la secuencia en filas y se elige la mejor. Es lo que permite
 *    mezclar, por ejemplo, una fila de 3 verticales con una de 2 horizontales.
 *
 * 2. Cuadrícula uniforme (`arrangeGrid`)
 *    Celdas idénticas r × c. Se prueban todas las combinaciones válidas.
 *    Es la única opción cuando se recorta para rellenar (`fit: 'cover'`).
 *
 * Puntaje = área total ocupada por las imágenes, penalizada cuando unas filas
 * quedan mucho más altas que otras (parámetro `balance`), porque un diseño con
 * una imagen gigante y seis diminutas aprovecha el papel pero se ve mal.
 *
 * Todas las medidas están en milímetros y todas las funciones son puras:
 * no tocan el DOM, así que se pueden probar automáticamente.
 */

import type {
  DocumentLayout,
  LayoutRow,
  LayoutSettings,
  Measurable,
  PageLayout,
  PlacedImage,
} from './types';
import { resolvePageSize } from './units';

/** Número máximo de imágenes por hoja para el que se explora la búsqueda exhaustiva. */
const MAX_EXHAUSTIVE = 20;

/** Proporción ancho/alto de una imagen, ya considerando su rotación. */
export function aspectRatio(image: Measurable): number {
  const ratio = image.naturalWidth / image.naturalHeight;
  return image.rotation % 180 === 0 ? ratio : 1 / ratio;
}

interface Area {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

interface Arrangement<T> {
  rows: LayoutRow<T>[];
  /** Área en mm² realmente cubierta por imágenes. */
  area: number;
  /** Área ya penalizada por desequilibrio; es lo que se compara. */
  score: number;
}

/* ------------------------------------------------------------------ *
 * Estrategia 1: filas justificadas
 * ------------------------------------------------------------------ */

export function arrangeJustified<T extends Measurable>(
  images: T[],
  area: Area,
  gapMm: number,
  balance: number,
): Arrangement<T> | null {
  const n = images.length;
  if (n === 0 || n > MAX_EXHAUSTIVE) return null;

  const ratios = images.map(aspectRatio);
  let best: {
    score: number;
    area: number;
    cuts: Array<[number, number]>;
    heights: number[];
    scale: number;
  } | null = null;

  // Cada bit del contador representa "cortar fila después de la imagen i",
  // así que el bucle recorre todas las particiones posibles en filas.
  const combinations = 1 << (n - 1);
  for (let mask = 0; mask < combinations; mask++) {
    const cuts: Array<[number, number]> = [];
    let start = 0;
    for (let i = 0; i < n - 1; i++) {
      if (mask & (1 << i)) {
        cuts.push([start, i]);
        start = i + 1;
      }
    }
    cuts.push([start, n - 1]);

    // Altura natural de cada fila al ocupar todo el ancho disponible.
    const heights: number[] = [];
    let naturalHeight = 0;
    let viable = true;
    for (const [from, to] of cuts) {
      let ratioSum = 0;
      for (let k = from; k <= to; k++) ratioSum += ratios[k]!;
      const usableWidth = area.widthMm - (to - from) * gapMm;
      if (usableWidth <= 0) {
        viable = false;
        break;
      }
      const rowHeight = usableWidth / ratioSum;
      heights.push(rowHeight);
      naturalHeight += rowHeight;
    }
    if (!viable) continue;

    const usableHeight = area.heightMm - (cuts.length - 1) * gapMm;
    if (usableHeight <= 0) continue;

    // Si no caben a lo alto, se reducen todas por igual (nunca se agrandan:
    // ya ocupan el ancho completo).
    const scale = Math.min(1, usableHeight / naturalHeight);

    let coveredArea = 0;
    for (let r = 0; r < cuts.length; r++) {
      const h = heights[r]! * scale;
      const [from, to] = cuts[r]!;
      for (let k = from; k <= to; k++) coveredArea += h * h * ratios[k]!;
    }

    const shortest = Math.min(...heights);
    const tallest = Math.max(...heights);
    const evenness = balance > 0 ? Math.pow(shortest / tallest, balance) : 1;
    const score = coveredArea * evenness;

    if (!best || score > best.score + 1e-9) {
      best = { score, area: coveredArea, cuts, heights, scale };
    }
  }

  if (!best) return null;

  const totalHeight =
    best.heights.reduce((a, b) => a + b, 0) * best.scale + (best.cuts.length - 1) * gapMm;
  let y = area.yMm + Math.max(0, (area.heightMm - totalHeight) / 2);

  const rows: LayoutRow<T>[] = best.cuts.map((cut, r) => {
    const height = best!.heights[r]! * best!.scale;
    const [from, to] = cut;
    const widths: number[] = [];
    for (let k = from; k <= to; k++) widths.push(height * ratios[k]!);

    const rowWidth = widths.reduce((a, b) => a + b, 0) + (widths.length - 1) * gapMm;
    let x = area.xMm + (area.widthMm - rowWidth) / 2;

    const items: PlacedImage<T>[] = widths.map((widthMm, j) => {
      const placed: PlacedImage<T> = {
        image: images[from + j]!,
        xMm: x,
        yMm: y,
        widthMm,
        heightMm: height,
      };
      x += widthMm + gapMm;
      return placed;
    });

    const row: LayoutRow<T> = { items, topMm: y, heightMm: height };
    y += height + gapMm;
    return row;
  });

  return { rows, area: best.area, score: best.score };
}

/* ------------------------------------------------------------------ *
 * Estrategia 2: cuadrícula uniforme
 * ------------------------------------------------------------------ */

export function arrangeGrid<T extends Measurable>(
  images: T[],
  area: Area,
  gapMm: number,
  fit: 'contain' | 'cover',
): Arrangement<T> | null {
  const n = images.length;
  if (n === 0) return null;
  const ratios = images.map(aspectRatio);

  let best: { area: number; rows: number; cols: number; cellW: number; cellH: number } | null = null;

  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cellW = (area.widthMm - (cols - 1) * gapMm) / cols;
    const cellH = (area.heightMm - (rows - 1) * gapMm) / rows;
    if (cellW <= 0 || cellH <= 0) continue;

    const cellRatio = cellW / cellH;
    let covered = 0;
    for (const ratio of ratios) {
      if (fit === 'cover') {
        // La celda siempre se llena; se penaliza cuánto habría que recortar.
        const kept = Math.min(ratio, cellRatio) / Math.max(ratio, cellRatio);
        covered += cellW * cellH * kept;
      } else {
        const w = Math.min(cellW, cellH * ratio);
        covered += w * (w / ratio);
      }
    }
    if (!best || covered > best.area + 1e-9) {
      best = { area: covered, rows, cols, cellW, cellH };
    }
  }
  if (!best) return null;

  const { rows: rowCount, cols, cellW, cellH } = best;
  const gridHeight = rowCount * cellH + (rowCount - 1) * gapMm;
  const offsetY = Math.max(0, (area.heightMm - gridHeight) / 2);

  const rows: LayoutRow<T>[] = [];
  for (let r = 0; r < rowCount; r++) {
    const slice = images.slice(r * cols, r * cols + cols);
    if (slice.length === 0) break;

    const rowWidth = slice.length * cellW + (slice.length - 1) * gapMm;
    const rowX = area.xMm + (area.widthMm - rowWidth) / 2;
    const rowY = area.yMm + offsetY + r * (cellH + gapMm);

    const items: PlacedImage<T>[] = slice.map((image, j) => {
      const cellX = rowX + j * (cellW + gapMm);
      let widthMm = cellW;
      let heightMm = cellH;
      if (fit !== 'cover') {
        const ratio = aspectRatio(image);
        widthMm = Math.min(cellW, cellH * ratio);
        heightMm = widthMm / ratio;
      }
      return {
        image,
        xMm: cellX + (cellW - widthMm) / 2,
        yMm: rowY + (cellH - heightMm) / 2,
        widthMm,
        heightMm,
      };
    });

    rows.push({ items, topMm: rowY, heightMm: cellH });
  }

  return { rows, area: best.area, score: best.area };
}

/* ------------------------------------------------------------------ *
 * Orquestador
 * ------------------------------------------------------------------ */

export class LayoutError extends Error {}

/** Acomoda un grupo de imágenes en una sola hoja. */
export function arrangePage<T extends Measurable>(
  images: T[],
  area: Area,
  settings: Pick<LayoutSettings, 'gapMm' | 'mode' | 'fit' | 'balance'>,
): LayoutRow<T>[] {
  const { gapMm, mode, fit, balance } = settings;

  if (mode === 'auto' && fit === 'contain') {
    const justified = arrangeJustified(images, area, gapMm, balance);
    const grid = arrangeGrid(images, area, gapMm, fit);
    if (!justified) return grid?.rows ?? [];
    if (!grid) return justified.rows;
    return justified.score >= grid.score ? justified.rows : grid.rows;
  }

  return arrangeGrid(images, area, gapMm, fit)?.rows ?? [];
}

/** Acomoda todas las imágenes y devuelve el documento completo, página por página. */
export function computeDocumentLayout<T extends Measurable>(
  images: T[],
  settings: LayoutSettings,
): DocumentLayout<T> {
  const { widthMm, heightMm } = resolvePageSize(settings.paperId, settings.orientation);
  const { margins } = settings;

  const area: Area = {
    xMm: margins.left,
    yMm: margins.top,
    widthMm: widthMm - margins.left - margins.right,
    heightMm: heightMm - margins.top - margins.bottom,
  };

  if (area.widthMm <= 5 || area.heightMm <= 5) {
    throw new LayoutError('Los márgenes no dejan espacio útil en la hoja.');
  }

  const perPage = Math.max(1, Math.floor(settings.imagesPerPage));
  const pages: PageLayout<T>[] = [];

  for (let i = 0; i < images.length; i += perPage) {
    const rows = arrangePage(images.slice(i, i + perPage), area, settings);
    if (rows.length > 0) pages.push({ index: pages.length, rows });
  }

  const covered = pages
    .flatMap((page) => page.rows)
    .flatMap((row) => row.items)
    .reduce((sum, item) => sum + item.widthMm * item.heightMm, 0);
  const total = pages.length * area.widthMm * area.heightMm;

  return {
    pages,
    pageWidthMm: widthMm,
    pageHeightMm: heightMm,
    margins,
    coverage: total > 0 ? (covered / total) * 100 : 0,
  };
}
