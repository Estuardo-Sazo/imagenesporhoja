import { useEffect, useRef, useState } from 'react';
import type { DocumentLayout, FitMode, SourceImage } from '../../lib/layout/types';
import { mmToPx } from '../../lib/layout/units';
import type { ViewOptions } from './useToolState';

interface Props {
  layout: DocumentLayout<SourceImage>;
  fit: FitMode;
  view: ViewOptions;
}

export function PagePreview({ layout, fit, view }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  // La hoja se dibuja a tamaño real en milímetros y se escala para que quepa
  // en pantalla; al imprimir, la escala se anula y sale exacta.
  useEffect(() => {
    const resize = () => {
      const available = (container.current?.clientWidth ?? 900) - 8;
      setZoom(Math.min(1, available / mmToPx(layout.pageWidthMm)));
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [layout.pageWidthMm]);

  const { margins } = layout;

  return (
    <div className="preview" ref={container}>
      {layout.pages.map((page) => (
        <div
          key={page.index}
          className="page-holder"
          // La hoja se dibuja a tamaño real y se reduce con transform, que no
          // afecta al espacio que ocupa: el contenedor toma las medidas ya
          // escaladas para que no aparezcan barras de desplazamiento.
          style={{
            width: `${mmToPx(layout.pageWidthMm) * zoom}px`,
            height: `${mmToPx(layout.pageHeightMm) * zoom}px`,
          }}
        >
          <div
            className="page"
            style={{
              width: `${layout.pageWidthMm}mm`,
              height: `${layout.pageHeightMm}mm`,
              transform: `scale(${zoom})`,
            }}
          >
            {view.showGuides && (
              <div
                className="margin-guide"
                style={{
                  left: `${margins.left}mm`,
                  top: `${margins.top}mm`,
                  width: `${layout.pageWidthMm - margins.left - margins.right}mm`,
                  height: `${layout.pageHeightMm - margins.top - margins.bottom}mm`,
                }}
              />
            )}

            {page.rows.flatMap((row) =>
              row.items.map((item) => {
                const upright = item.image.rotation % 180 === 0;
                return (
                  <div
                    key={item.image.id}
                    className={`slot${view.showBorders ? ' is-bordered' : ''}`}
                    style={{
                      left: `${item.xMm}mm`,
                      top: `${item.yMm}mm`,
                      width: `${item.widthMm}mm`,
                      height: `${item.heightMm}mm`,
                    }}
                  >
                    <img
                      src={item.image.url}
                      alt={item.image.name}
                      // Con muchas imágenes cargadas, esto evita que el
                      // navegador decodifique de golpe todas las hojas.
                      loading="lazy"
                      decoding="async"
                      style={{
                        width: `${upright ? item.widthMm : item.heightMm}mm`,
                        height: `${upright ? item.heightMm : item.widthMm}mm`,
                        objectFit: fit,
                        transform: `translate(-50%, -50%) rotate(${item.image.rotation}deg)`,
                      }}
                    />
                    {view.showCaptions && <span className="caption">{item.image.name}</span>}
                  </div>
                );
              }),
            )}

            {view.showPageNumbers && (
              <span className="page-number">
                {page.index + 1} / {layout.pages.length}
              </span>
            )}
          </div>
          <p className="page-label">
            Página {page.index + 1} de {layout.pages.length} ·{' '}
            {page.rows.reduce((sum, row) => sum + row.items.length, 0)} imágenes
          </p>
        </div>
      ))}
    </div>
  );
}
