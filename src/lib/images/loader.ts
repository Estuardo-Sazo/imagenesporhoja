/** Carga de archivos de imagen y utilidades relacionadas. */

import type { Rotation, SourceImage } from '../layout/types';

/** Formatos que los navegadores saben decodificar de forma fiable. */
const SUPPORTED = /^image\/(jpeg|png|webp|gif|bmp|avif)$/i;
const UNSUPPORTED_EXTENSION = /\.(heic|heif)$/i;

export class UnsupportedImageError extends Error {}

let counter = 0;
const nextId = (): string => `img-${Date.now().toString(36)}-${(counter += 1)}`;

const byName = (a: { name: string }, b: { name: string }): number =>
  a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' });

export interface LoadResult {
  images: SourceImage[];
  /** Archivos que el navegador no pudo abrir, para avisar al usuario. */
  rejected: string[];
}

function readDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve({ width: element.naturalWidth, height: element.naturalHeight });
    element.onerror = () => reject(new Error('formato no legible'));
    element.src = url;
  });
}

/** Convierte archivos del usuario en imágenes listas para acomodar. */
export async function loadImages(files: Iterable<File>): Promise<LoadResult> {
  const candidates = Array.from(files);
  const rejected: string[] = [];

  const usable = candidates.filter((file) => {
    if (UNSUPPORTED_EXTENSION.test(file.name)) {
      rejected.push(file.name);
      return false;
    }
    return SUPPORTED.test(file.type) || file.type.startsWith('image/');
  });

  const loaded = await Promise.all(
    usable.map(async (file): Promise<SourceImage | null> => {
      const url = URL.createObjectURL(file);
      try {
        const { width, height } = await readDimensions(url);
        return {
          id: nextId(),
          name: file.name,
          url,
          naturalWidth: width,
          naturalHeight: height,
          rotation: 0,
          file,
        };
      } catch {
        URL.revokeObjectURL(url);
        rejected.push(file.name);
        return null;
      }
    }),
  );

  const images = loaded.filter((image): image is SourceImage => image !== null).sort(byName);
  return { images, rejected };
}

export const rotateClockwise = (rotation: Rotation): Rotation =>
  (((rotation + 90) % 360) as Rotation);

export function releaseImages(images: SourceImage[]): void {
  for (const image of images) URL.revokeObjectURL(image.url);
}

/** Mueve un elemento de una posición a otra (para reordenar arrastrando). */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const copy = items.slice();
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved!);
  return copy;
}
