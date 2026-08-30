import { useEffect, useRef, useState } from 'react';
import type { LayoutSettings } from '../../lib/layout/types';
import { PAPER_SIZES, mmToCm } from '../../lib/layout/units';
import type { ViewOptions } from './useToolState';

interface Props {
  settings: LayoutSettings;
  view: ViewOptions;
  onSettings: (patch: Partial<LayoutSettings>) => void;
  onView: (patch: Partial<ViewOptions>) => void;
}

const MARGIN_FIELDS = [
  { key: 'top', label: 'Superior' },
  { key: 'right', label: 'Derecho' },
  { key: 'bottom', label: 'Inferior' },
  { key: 'left', label: 'Izquierdo' },
] as const;

const MAX_IMAGES_PER_PAGE = 40;
// Cuánto se espera, sin más tecleo, antes de asumir 1 si el campo quedó vacío o inválido.
const EMPTY_IMAGES_PER_PAGE_TIMEOUT_MS = 1500;

function ImagesPerPageInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refleja cambios externos (p. ej. deshacer) sin pisar lo que la persona está tecleando.
  useEffect(() => {
    setText(String(value));
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const commitDefault = () => {
    clearTimer();
    setText('1');
    onChange(1);
  };

  return (
    <input
      id="per-page"
      type="number"
      min={1}
      max={MAX_IMAGES_PER_PAGE}
      step={1}
      value={text}
      onChange={(event) => {
        const raw = event.target.value;
        clearTimer();

        const parsed = Number(raw);
        if (raw.trim() !== '' && Number.isFinite(parsed) && parsed >= 1) {
          const clamped = Math.min(MAX_IMAGES_PER_PAGE, parsed);
          setText(clamped === parsed ? raw : String(clamped));
          onChange(clamped);
        } else {
          // Deja escribir libremente (incluido vacío); solo cae a 1 si nadie sigue tecleando.
          setText(raw);
          timerRef.current = setTimeout(commitDefault, EMPTY_IMAGES_PER_PAGE_TIMEOUT_MS);
        }
      }}
      onBlur={(event) => {
        clearTimer();
        const parsed = Number(event.target.value);
        if (event.target.value.trim() === '' || !Number.isFinite(parsed) || parsed < 1) {
          commitDefault();
        } else {
          const clamped = Math.min(MAX_IMAGES_PER_PAGE, parsed);
          setText(String(clamped));
          onChange(clamped);
        }
      }}
    />
  );
}

export function SettingsPanel({ settings, view, onSettings, onView }: Props) {
  const setMargin = (key: (typeof MARGIN_FIELDS)[number]['key'], cm: number) =>
    onSettings({ margins: { ...settings.margins, [key]: Math.max(0, cm) * 10 } });

  return (
    <>
      <fieldset>
        <legend>Distribución</legend>

        <label htmlFor="size-mode">Tamaño de las imágenes</label>
        <select
          id="size-mode"
          value={settings.sizeMode}
          onChange={(event) =>
            onSettings({ sizeMode: event.target.value as LayoutSettings['sizeMode'] })
          }
        >
          <option value="perPage">Por cantidad (yo elijo cuántas por hoja)</option>
          <option value="fixed">Por tamaño fijo (cm) — caben las que alcancen</option>
        </select>

        {settings.sizeMode === 'perPage' ? (
          <>
            <label htmlFor="per-page">Imágenes por hoja</label>
            <ImagesPerPageInput
              value={settings.imagesPerPage}
              onChange={(imagesPerPage) => onSettings({ imagesPerPage })}
            />

            <label htmlFor="mode">Acomodo</label>
            <select
              id="mode"
              value={settings.mode}
              onChange={(event) => onSettings({ mode: event.target.value as LayoutSettings['mode'] })}
            >
              <option value="auto">Automático (filas de altura variable)</option>
              <option value="grid">Cuadrícula uniforme</option>
            </select>

            <label htmlFor="balance">Equilibrio de tamaños</label>
            <select
              id="balance"
              value={String(settings.balance)}
              onChange={(event) => onSettings({ balance: Number(event.target.value) })}
              disabled={settings.mode === 'grid'}
            >
              <option value="0">Máximo aprovechamiento</option>
              <option value="0.25">Equilibrado (recomendado)</option>
              <option value="0.6">Muy parejo</option>
            </select>
          </>
        ) : (
          <>
            <span className="field-label">Tamaño de cada imagen (cm)</span>
            <div className="grid-4">
              <input
                type="number"
                min={1}
                max={100}
                step={0.5}
                title="Ancho"
                aria-label="Ancho en centímetros"
                value={Number(mmToCm(settings.fixedSize.widthMm).toFixed(2))}
                onChange={(event) =>
                  onSettings({
                    fixedSize: {
                      ...settings.fixedSize,
                      widthMm: Math.max(1, Number(event.target.value) || 1) * 10,
                    },
                  })
                }
              />
              <input
                type="number"
                min={1}
                max={100}
                step={0.5}
                title="Alto"
                aria-label="Alto en centímetros"
                value={Number(mmToCm(settings.fixedSize.heightMm).toFixed(2))}
                onChange={(event) =>
                  onSettings({
                    fixedSize: {
                      ...settings.fixedSize,
                      heightMm: Math.max(1, Number(event.target.value) || 1) * 10,
                    },
                  })
                }
              />
            </div>
            <p className="hint">Ancho · Alto. Se acomodan tantas como quepan en la hoja.</p>
          </>
        )}

        <label htmlFor="fit">Ajuste de cada imagen</label>
        <select
          id="fit"
          value={settings.fit}
          onChange={(event) => onSettings({ fit: event.target.value as LayoutSettings['fit'] })}
        >
          <option value="contain">Completa, sin recortar</option>
          <option value="cover">Rellenar celda (recorta bordes)</option>
        </select>

        <label className="check">
          <input
            type="checkbox"
            checked={settings.uniformSizing}
            onChange={(event) => onSettings({ uniformSizing: event.target.checked })}
          />
          Mismo tamaño en todas las hojas
        </label>
        <p className="hint">
          Si la última hoja queda incompleta, las imágenes conservan el tamaño que tienen en las
          hojas llenas en vez de agrandarse para ocupar el papel.
        </p>
      </fieldset>

      <fieldset>
        <legend>Hoja</legend>

        <label htmlFor="paper">Tamaño</label>
        <select
          id="paper"
          value={settings.paperId}
          onChange={(event) => onSettings({ paperId: event.target.value })}
        >
          {PAPER_SIZES.map((paper) => (
            <option key={paper.id} value={paper.id}>
              {paper.label}
            </option>
          ))}
        </select>

        <label htmlFor="orientation">Orientación</label>
        <select
          id="orientation"
          value={settings.orientation}
          onChange={(event) =>
            onSettings({ orientation: event.target.value as LayoutSettings['orientation'] })
          }
        >
          <option value="portrait">Vertical</option>
          <option value="landscape">Horizontal</option>
        </select>

        <span className="field-label">Márgenes (cm)</span>
        <div className="grid-4">
          {MARGIN_FIELDS.map((field) => (
            <input
              key={field.key}
              type="number"
              min={0}
              max={8}
              step={0.1}
              title={field.label}
              aria-label={`Margen ${field.label.toLowerCase()}`}
              value={Number(mmToCm(settings.margins[field.key]).toFixed(2))}
              onChange={(event) => setMargin(field.key, Number(event.target.value) || 0)}
            />
          ))}
        </div>
        <p className="hint">Superior · Derecho · Inferior · Izquierdo</p>

        <label htmlFor="gap">Separación entre imágenes (cm)</label>
        <input
          id="gap"
          type="number"
          min={0}
          max={5}
          step={0.05}
          value={Number(mmToCm(settings.gapMm).toFixed(2))}
          onChange={(event) => onSettings({ gapMm: Math.max(0, Number(event.target.value) || 0) * 10 })}
        />
      </fieldset>

      <fieldset>
        <legend>Extras</legend>

        <label className="check">
          <input
            type="checkbox"
            checked={view.showBorders}
            onChange={(event) => onView({ showBorders: event.target.checked })}
          />
          Borde alrededor de cada imagen
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={view.showCaptions}
            onChange={(event) => onView({ showCaptions: event.target.checked })}
          />
          Mostrar el nombre del archivo
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={view.showPageNumbers}
            onChange={(event) => onView({ showPageNumbers: event.target.checked })}
          />
          Numerar las páginas
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={view.showGuides}
            onChange={(event) => onView({ showGuides: event.target.checked })}
          />
          Ver guía de márgenes (solo en pantalla)
        </label>

        <label htmlFor="dpi">Calidad al exportar a Word</label>
        <select
          id="dpi"
          value={view.dpi}
          onChange={(event) => onView({ dpi: Number(event.target.value) })}
        >
          <option value={150}>Normal · 150 ppp</option>
          <option value={200}>Alta · 200 ppp</option>
          <option value={300}>Máxima · 300 ppp</option>
        </select>
      </fieldset>
    </>
  );
}
