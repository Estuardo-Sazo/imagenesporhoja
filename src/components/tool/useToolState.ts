/** Estado central de la herramienta: paso, imágenes, ajustes y acomodo. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeDocumentLayout, LayoutError } from '../../lib/layout/engine';
import type { DocumentLayout, LayoutSettings, SourceImage } from '../../lib/layout/types';
import { DEFAULT_PAPER_ID, uniformMargins } from '../../lib/layout/units';
import { loadImages, moveItem, releaseImages, rotateClockwise } from '../../lib/images/loader';
import { MAX_IMAGES, WARN_IMAGES, splitByCapacity } from '../../lib/config/limits';

/** La herramienta se recorre en dos pasos para no saturar la vista. */
export type ToolStep = 'select' | 'arrange';

export interface ViewOptions {
  showBorders: boolean;
  showCaptions: boolean;
  showPageNumbers: boolean;
  showGuides: boolean;
  dpi: number;
}

export interface Notice {
  tone: 'info' | 'warning' | 'error';
  text: string;
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
  uniformSizing: true,
};

export const DEFAULT_VIEW: ViewOptions = {
  showBorders: false,
  showCaptions: false,
  showPageNumbers: false,
  showGuides: true,
  dpi: 200,
};

export function useToolState() {
  const [step, setStep] = useState<ToolStep>('select');
  const [images, setImages] = useState<SourceImage[]>([]);
  const [settings, setSettings] = useState<LayoutSettings>(DEFAULT_SETTINGS);
  const [view, setView] = useState<ViewOptions>(DEFAULT_VIEW);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState<{ done: number; total: number } | null>(null);

  /** Sin imágenes no hay nada que acomodar: se vuelve al primer paso. */
  useEffect(() => {
    if (images.length === 0 && step === 'arrange') setStep('select');
  }, [images.length, step]);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      if (images.length >= MAX_IMAGES) {
        setNotice({
          tone: 'warning',
          text: `Ya tienes el máximo de ${MAX_IMAGES} imágenes. Quita algunas para poder agregar otras.`,
        });
        return;
      }

      setReading({ done: 0, total: Array.from(files).length });
      const { images: loaded, rejected } = await loadImages(files, (done, total) =>
        setReading({ done, total }),
      );
      setReading(null);

      const { accepted, discarded } = splitByCapacity(images.length, loaded);
      if (discarded.length > 0) releaseImages(discarded);

      const total = images.length + accepted.length;
      setImages((current) => [...current, ...accepted]);

      const problems: string[] = [];
      if (discarded.length > 0) {
        problems.push(
          `Se dejaron fuera ${discarded.length} imagen(es): el máximo por documento es ${MAX_IMAGES}.`,
        );
      }
      if (rejected.length > 0) {
        problems.push(
          `No se pudieron abrir ${rejected.length} archivo(s). Los HEIC del iPhone hay que convertirlos a JPG antes.`,
        );
      }

      if (problems.length > 0) {
        setNotice({ tone: 'warning', text: problems.join(' ') });
      } else if (total > WARN_IMAGES) {
        setNotice({
          tone: 'info',
          text: `Llevas ${total} imágenes. A partir de ${WARN_IMAGES} la vista previa puede ir lenta en equipos modestos; la impresión y la descarga funcionan igual.`,
        });
      } else {
        setNotice(null);
      }
    },
    [images.length],
  );

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

  const { layout, error } = useMemo<{
    layout: DocumentLayout<SourceImage> | null;
    error: string | null;
  }>(() => {
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
    step,
    setStep,
    images,
    settings,
    view,
    layout,
    error,
    notice,
    busy,
    reading,
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
