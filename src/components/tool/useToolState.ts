/** Estado central de la herramienta: imágenes, ajustes y acomodo calculado. */

import { useCallback, useMemo, useState } from 'react';
import { computeDocumentLayout, LayoutError } from '../../lib/layout/engine';
import type { DocumentLayout, LayoutSettings, SourceImage } from '../../lib/layout/types';
import { DEFAULT_PAPER_ID, uniformMargins } from '../../lib/layout/units';
import { loadImages, moveItem, releaseImages, rotateClockwise } from '../../lib/images/loader';

export interface ViewOptions {
  showBorders: boolean;
  showCaptions: boolean;
  showPageNumbers: boolean;
  showGuides: boolean;
  dpi: number;
}

export const DEFAULT_SETTINGS: LayoutSettings = {
  paperId: DEFAULT_PAPER_ID,
  orientation: 'portrait',
  margins: uniformMargins(10),
  gapMm: 3,
  imagesPerPage: 7,
  mode: 'auto',
  fit: 'contain',
  balance: 0.25,
};

export const DEFAULT_VIEW: ViewOptions = {
  showBorders: false,
  showCaptions: false,
  showPageNumbers: false,
  showGuides: true,
  dpi: 200,
};

export function useToolState() {
  const [images, setImages] = useState<SourceImage[]>([]);
  const [settings, setSettings] = useState<LayoutSettings>(DEFAULT_SETTINGS);
  const [view, setView] = useState<ViewOptions>(DEFAULT_VIEW);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const { images: loaded, rejected } = await loadImages(files);
    if (loaded.length > 0) {
      setImages((current) => [...current, ...loaded]);
    }
    setNotice(
      rejected.length > 0
        ? `No se pudieron abrir ${rejected.length} archivo(s). Los formatos HEIC del iPhone hay que convertirlos a JPG primero.`
        : null,
    );
  }, []);

  const clearImages = useCallback(() => {
    setImages((current) => {
      releaseImages(current);
      return [];
    });
    setNotice(null);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((image) => image.id !== id);
    });
  }, []);

  const rotateImage = useCallback((id: string) => {
    setImages((current) =>
      current.map((image) =>
        image.id === id ? { ...image, rotation: rotateClockwise(image.rotation) } : image,
      ),
    );
  }, []);

  const reorder = useCallback((from: number, to: number) => {
    setImages((current) => moveItem(current, from, to));
  }, []);

  const updateSettings = useCallback((patch: Partial<LayoutSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const updateView = useCallback((patch: Partial<ViewOptions>) => {
    setView((current) => ({ ...current, ...patch }));
  }, []);

  const { layout, error } = useMemo<{ layout: DocumentLayout<SourceImage> | null; error: string | null }>(() => {
    if (images.length === 0) return { layout: null, error: null };
    try {
      return { layout: computeDocumentLayout(images, settings), error: null };
    } catch (err) {
      return {
        layout: null,
        error: err instanceof LayoutError ? err.message : 'No se pudo calcular el acomodo.',
      };
    }
  }, [images, settings]);

  return {
    images,
    settings,
    view,
    layout,
    error,
    notice,
    busy,
    setBusy,
    setNotice,
    addFiles,
    clearImages,
    removeImage,
    rotateImage,
    reorder,
    updateSettings,
    updateView,
  };
}
