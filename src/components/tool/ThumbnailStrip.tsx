import { useState } from 'react';
import type { SourceImage } from '../../lib/layout/types';

interface Props {
  images: SourceImage[];
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
}

export function ThumbnailStrip({ images, onRotate, onRemove, onReorder }: Props) {
  const [dragging, setDragging] = useState<number | null>(null);

  if (images.length === 0) {
    return <p className="hint">Todavía no has cargado imágenes.</p>;
  }

  return (
    <>
      <ul className="thumbs">
        {images.map((image, index) => (
          <li
            key={image.id}
            className={`thumb${dragging === index ? ' is-dragging' : ''}`}
            draggable
            onDragStart={() => setDragging(index)}
            onDragEnd={() => setDragging(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (dragging !== null) onReorder(dragging, index);
              setDragging(null);
            }}
          >
            <img
              src={image.url}
              alt={image.name}
              style={{ transform: `rotate(${image.rotation}deg)` }}
            />
            <span className="thumb-index">{index + 1}</span>
            <span className="thumb-actions">
              <button type="button" title="Girar 90°" onClick={() => onRotate(image.id)}>
                ⟳
              </button>
              <button type="button" title="Quitar" onClick={() => onRemove(image.id)}>
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>
      <p className="hint">
        {images.length} imagen{images.length === 1 ? '' : 'es'}. Arrastra las miniaturas para
        cambiar el orden.
      </p>
    </>
  );
}
