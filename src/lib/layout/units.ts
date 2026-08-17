/** Conversiones de unidades y catálogo de tamaños de papel. */

import type { Margins, Orientation, PaperSize } from './types';

export const MM_PER_INCH = 25.4;
/** Milímetros a píxeles CSS (los navegadores asumen 96 ppp). */
export const PX_PER_MM = 96 / MM_PER_INCH;
/** Milímetros a twips (1/1440 de pulgada), la unidad de medida de Word. */
export const TWIPS_PER_MM = 1440 / MM_PER_INCH;
/** Milímetros a EMU (English Metric Units), la unidad de las imágenes en Word. */
export const EMU_PER_MM = 36000;

export const mmToPx = (mm: number): number => mm * PX_PER_MM;
export const mmToTwips = (mm: number): number => Math.max(1, Math.round(mm * TWIPS_PER_MM));
export const mmToEmu = (mm: number): number => Math.max(1, Math.round(mm * EMU_PER_MM));
export const cmToMm = (cm: number): number => cm * 10;
export const mmToCm = (mm: number): number => mm / 10;

export const PAPER_SIZES: PaperSize[] = [
  { id: 'carta', label: 'Carta · 21.59 × 27.94 cm', widthMm: 215.9, heightMm: 279.4 },
  { id: 'a4', label: 'A4 · 21 × 29.7 cm', widthMm: 210, heightMm: 297 },
  { id: 'oficio', label: 'Oficio · 21.59 × 35.56 cm', widthMm: 215.9, heightMm: 355.6 },
  { id: 'f4', label: 'Oficio F4 · 21.6 × 33 cm', widthMm: 216, heightMm: 330 },
  { id: 'a5', label: 'A5 · 14.8 × 21 cm', widthMm: 148, heightMm: 210 },
  { id: 'tabloide', label: 'Tabloide · 27.94 × 43.18 cm', widthMm: 279.4, heightMm: 431.8 },
];

export const DEFAULT_PAPER_ID = 'carta';

export function getPaper(id: string): PaperSize {
  return PAPER_SIZES.find((p) => p.id === id) ?? PAPER_SIZES[0]!;
}

/** Dimensiones finales de la hoja ya considerando la orientación. */
export function resolvePageSize(
  paperId: string,
  orientation: Orientation,
): { widthMm: number; heightMm: number } {
  const paper = getPaper(paperId);
  return orientation === 'landscape'
    ? { widthMm: paper.heightMm, heightMm: paper.widthMm }
    : { widthMm: paper.widthMm, heightMm: paper.heightMm };
}

export const uniformMargins = (mm: number): Margins => ({
  top: mm,
  right: mm,
  bottom: mm,
  left: mm,
});
