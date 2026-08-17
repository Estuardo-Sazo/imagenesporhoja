import { Dropzone } from './Dropzone';
import { ThumbnailStrip } from './ThumbnailStrip';
import { MAX_IMAGES } from '../../lib/config/limits';
import type { SourceImage } from '../../lib/layout/types';

interface Props {
  images: SourceImage[];
  reading: { done: number; total: number } | null;
  onFiles: (files: FileList | File[]) => void;
  onClear: () => void;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onContinue: () => void;
}

export function StepSelect({
  images,
  reading,
  onFiles,
  onClear,
  onRotate,
  onRemove,
  onReorder,
  onContinue,
}: Props) {
  const full = images.length >= MAX_IMAGES;

  return (
    <div className="step-select">
      <Dropzone
        onFiles={onFiles}
        variant="hero"
        disabled={full}
        disabledReason={`Alcanzaste el máximo de ${MAX_IMAGES} imágenes por documento.`}
      />

      {reading && (
        <p className="reading" role="status">
          Leyendo {reading.done} de {reading.total}…
        </p>
      )}

      {images.length > 0 && (
        <>
          <div className="selection-bar">
            <span className="counter">
              <strong>{images.length}</strong> / {MAX_IMAGES} imágenes
            </span>
            <span className="selection-help">
              Arrastra para cambiar el orden · ⟳ gira · ✕ quita
            </span>
            <button type="button" className="link-button" onClick={onClear}>
              Quitar todas
            </button>
          </div>

          <ThumbnailStrip
            images={images}
            variant="gallery"
            onRotate={onRotate}
            onRemove={onRemove}
            onReorder={onReorder}
          />

          <div className="step-footer">
            <button type="button" className="primary" onClick={onContinue}>
              Continuar al acomodo
            </button>
            <span className="step-footer-note">
              En el siguiente paso eliges cuántas van por hoja.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
