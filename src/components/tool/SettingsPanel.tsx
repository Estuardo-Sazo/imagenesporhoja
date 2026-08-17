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

export function SettingsPanel({ settings, view, onSettings, onView }: Props) {
  const setMargin = (key: (typeof MARGIN_FIELDS)[number]['key'], cm: number) =>
    onSettings({ margins: { ...settings.margins, [key]: Math.max(0, cm) * 10 } });

  return (
    <>
      <fieldset>
        <legend>Distribución</legend>

        <label htmlFor="per-page">Imágenes por hoja</label>
        <input
          id="per-page"
          type="number"
          min={1}
          max={40}
          step={1}
          value={settings.imagesPerPage}
          onChange={(event) =>
            onSettings({
              imagesPerPage: Math.min(40, Math.max(1, Number(event.target.value) || 1)),
            })
          }
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

        <label htmlFor="fit">Ajuste de cada imagen</label>
        <select
          id="fit"
          value={settings.fit}
          onChange={(event) => onSettings({ fit: event.target.value as LayoutSettings['fit'] })}
        >
          <option value="contain">Completa, sin recortar</option>
          <option value="cover">Rellenar celda (recorta bordes)</option>
        </select>
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
