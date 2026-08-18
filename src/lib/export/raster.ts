/**
 * Convierte cada imagen colocada a un mapa de bits del tamaño exacto que
 * ocupará en el documento, aplicando rotación y recorte.
 *
 * Rasterizar antes de exportar garantiza que el .docx se vea idéntico a la
 * vista previa: Word recibe la imagen ya lista y solo la coloca.
 */

import type { FitMode, PlacedImage, SourceImage } from '../layout/types';
import { MM_PER_INCH } from '../layout/units';

/** Lado máximo en píxeles, para no agotar la memoria con hojas llenas. */
const MAX_SIDE = 3200;

export interface RasterResult {
  bytes: Uint8Array;
  extension: 'png' | 'jpg';
  widthPx: number;
  heightPx: number;
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    element.src = url;
  });
}

export async function rasterizePlacement(
  placement: PlacedImage<SourceImage>,
  options: { dpi: number; fit: FitMode; format?: 'auto' | 'jpeg' },
): Promise<RasterResult> {
  const source = await loadImageElement(placement.image.url);

  let width = Math.round((placement.widthMm / MM_PER_INCH) * options.dpi);
  let height = Math.round((placement.heightMm / MM_PER_INCH) * options.dpi);
  const clamp = Math.min(1, MAX_SIDE / Math.max(width, height));
  width = Math.max(1, Math.round(width * clamp));
  height = Math.max(1, Math.round(height * clamp));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no permitió crear el lienzo de dibujo.');

  // El PDF solo incrusta JPEG (DCTDecode) para no tener que reimplementar el
  // predictor PNG del formato; forzarlo aquí aplana la transparencia a blanco.
  const keepPng = options.format !== 'jpeg' && /\.png$/i.test(placement.image.name);
  if (!keepPng) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const { rotation } = placement.image;
  const ratio =
    rotation % 180 === 0
      ? placement.image.naturalWidth / placement.image.naturalHeight
      : placement.image.naturalHeight / placement.image.naturalWidth;
  const boxRatio = width / height;

  let drawWidth: number;
  let drawHeight: number;
  if (options.fit === 'cover') {
    if (ratio > boxRatio) {
      drawHeight = height;
      drawWidth = height * ratio;
    } else {
      drawWidth = width;
      drawHeight = width / ratio;
    }
  } else if (ratio > boxRatio) {
    drawWidth = width;
    drawHeight = width / ratio;
  } else {
    drawHeight = height;
    drawWidth = height * ratio;
  }

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  // En el sistema girado los lados se intercambian.
  const w = rotation % 180 === 0 ? drawWidth : drawHeight;
  const h = rotation % 180 === 0 ? drawHeight : drawWidth;
  ctx.drawImage(source, -w / 2, -h / 2, w, h);
  ctx.restore();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, keepPng ? 'image/png' : 'image/jpeg', 0.92),
  );
  if (!blob) throw new Error('No se pudo convertir la imagen.');

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    extension: keepPng ? 'png' : 'jpg',
    widthPx: width,
    heightPx: height,
  };
}
