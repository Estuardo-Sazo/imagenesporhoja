/** Tipos compartidos por el motor de acomodo y la interfaz. */

export type Rotation = 0 | 90 | 180 | 270;

/** Cómo se ajusta cada imagen dentro del espacio que le toca. */
export type FitMode = 'contain' | 'cover';

/** Estrategia de acomodo. */
export type ArrangeMode = 'auto' | 'grid';

/** Una imagen cargada por el usuario. */
export interface SourceImage {
  id: string;
  name: string;
  /** objectURL para previsualizar. */
  url: string;
  /** Dimensiones originales en píxeles. */
  naturalWidth: number;
  naturalHeight: number;
  rotation: Rotation;
  file: File;
}

/** Lo mínimo que el motor necesita saber de una imagen (facilita las pruebas). */
export interface Measurable {
  naturalWidth: number;
  naturalHeight: number;
  rotation: Rotation;
}

export interface PaperSize {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
}

export type Orientation = 'portrait' | 'landscape';

/** Márgenes en milímetros. */
export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LayoutSettings {
  paperId: string;
  orientation: Orientation;
  margins: Margins;
  /** Separación entre imágenes, en milímetros. */
  gapMm: number;
  imagesPerPage: number;
  mode: ArrangeMode;
  fit: FitMode;
  /**
   * Cuánto castigar que unas imágenes queden mucho más grandes que otras.
   * 0 = máximo aprovechamiento del papel, 0.6 = tamaños muy parejos.
   */
  balance: number;
  /**
   * Si la última hoja queda incompleta, mantener el tamaño que tendrían las
   * imágenes en una hoja llena en vez de agrandarlas para llenar el papel.
   */
  uniformSizing: boolean;
}

/** Una imagen ya colocada, en milímetros absolutos sobre la hoja. */
export interface PlacedImage<T = SourceImage> {
  image: T;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface LayoutRow<T = SourceImage> {
  items: PlacedImage<T>[];
  topMm: number;
  heightMm: number;
}

export interface PageLayout<T = SourceImage> {
  index: number;
  rows: LayoutRow<T>[];
}

export interface DocumentLayout<T = SourceImage> {
  pages: PageLayout<T>[];
  pageWidthMm: number;
  pageHeightMm: number;
  margins: Margins;
  /** Porcentaje del área útil realmente cubierto por imágenes (0-100). */
  coverage: number;
}
