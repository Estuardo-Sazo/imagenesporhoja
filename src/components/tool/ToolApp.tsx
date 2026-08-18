import { useCallback, useEffect, useState } from 'react';
import { buildDocx, downloadBlob } from '../../lib/export/docx';
import { buildPdf } from '../../lib/export/pdf';
import { Dropzone } from './Dropzone';
import { PagePreview } from './PagePreview';
import { SettingsPanel } from './SettingsPanel';
import { StepSelect } from './StepSelect';
import { ThumbnailStrip } from './ThumbnailStrip';
import { useToolState } from './useToolState';
import { MAX_IMAGES } from '../../lib/config/limits';
import './tool.css';

const STEPS = [
  { id: 'select', label: 'Elegir imágenes' },
  { id: 'arrange', label: 'Acomodar e imprimir' },
] as const;

export default function ToolApp() {
  const state = useToolState();
  const { layout, settings, view, images, step } = state;
  const [progress, setProgress] = useState<string | null>(null);

  // El tamaño de hoja al imprimir se define con @page, que no admite
  // variables CSS: se inyecta una regla al vuelo cada vez que cambia.
  useEffect(() => {
    if (!layout) return;
    const style = document.createElement('style');
    style.textContent = `@page { size: ${layout.pageWidthMm}mm ${layout.pageHeightMm}mm; margin: 0; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [layout?.pageWidthMm, layout?.pageHeightMm]);

  const handlePdf = useCallback(async () => {
    if (!layout) return;
    state.setBusy(true);
    setProgress('Preparando el PDF…');
    try {
      const blob = await buildPdf({
        layout,
        settings,
        showBorders: view.showBorders,
        showCaptions: view.showCaptions,
        showPageNumbers: view.showPageNumbers,
        dpi: view.dpi,
        onProgress: (done, total) => setProgress(`Procesando imagen ${done} de ${total}…`),
      });
      downloadBlob(blob, `imagenes-${settings.imagesPerPage}-por-hoja.pdf`);
    } catch (error) {
      state.setNotice({
        tone: 'error',
        text:
          error instanceof Error ? `No se pudo generar el PDF: ${error.message}` : 'No se pudo generar el PDF.',
      });
    } finally {
      state.setBusy(false);
      setProgress(null);
    }
  }, [layout, settings, view, state]);

  const handleDocx = useCallback(async () => {
    if (!layout) return;
    state.setBusy(true);
    setProgress('Preparando el documento…');
    try {
      const blob = await buildDocx({
        layout,
        settings,
        showBorders: view.showBorders,
        showCaptions: view.showCaptions,
        showPageNumbers: view.showPageNumbers,
        dpi: view.dpi,
        onProgress: (done, total) => setProgress(`Procesando imagen ${done} de ${total}…`),
      });
      downloadBlob(blob, `imagenes-${settings.imagesPerPage}-por-hoja.docx`);
    } catch (error) {
      state.setNotice({
        tone: 'error',
        text:
          error instanceof Error
            ? `No se pudo generar el documento: ${error.message}`
            : 'No se pudo generar el documento.',
      });
    } finally {
      state.setBusy(false);
      setProgress(null);
    }
  }, [layout, settings, view, state]);

  const ready = images.length > 0 && layout !== null;

  return (
    <div className="tool">
      <ol className="stepper">
        {STEPS.map((item, index) => {
          const active = item.id === step;
          const done = item.id === 'select' && step === 'arrange';
          return (
            <li key={item.id} className={`stepper-item${active ? ' is-active' : ''}`}>
              {done ? (
                <button type="button" onClick={() => state.setStep('select')}>
                  <span className="stepper-no">{index + 1}</span>
                  {item.label}
                </button>
              ) : (
                <span>
                  <span className="stepper-no">{index + 1}</span>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {state.notice && (
        <p className={`notice notice--${state.notice.tone}`} role="status">
          {state.notice.text}
        </p>
      )}

      {step === 'select' ? (
        <StepSelect
          images={images}
          reading={state.reading}
          onFiles={state.addFiles}
          onClear={state.clearImages}
          onRotate={state.rotateImage}
          onRemove={state.removeImage}
          onReorder={state.reorder}
          onContinue={() => state.setStep('arrange')}
        />
      ) : (
        <div className="tool-shell">
          <aside className="tool-sidebar">
            <fieldset>
              <legend>Imágenes</legend>
              <div className="sidebar-summary">
                <span className="counter">
                  <strong>{images.length}</strong> / {MAX_IMAGES}
                </span>
                <button type="button" onClick={() => state.setStep('select')}>
                  Cambiar selección
                </button>
              </div>
              <details className="sidebar-thumbs">
                <summary>Ver y reordenar</summary>
                <ThumbnailStrip
                  images={images}
                  onRotate={state.rotateImage}
                  onRemove={state.removeImage}
                  onReorder={state.reorder}
                />
              </details>
              {images.length < MAX_IMAGES && <Dropzone onFiles={state.addFiles} />}
            </fieldset>

            <SettingsPanel
              settings={settings}
              view={view}
              onSettings={state.updateSettings}
              onView={state.updateView}
            />

            <div className="actions">
              <button
                type="button"
                className="primary"
                disabled={!ready || state.busy}
                onClick={handlePdf}
              >
                {state.busy ? 'Generando…' : 'Descargar PDF'}
              </button>
              <button type="button" disabled={!ready || state.busy} onClick={() => window.print()}>
                Imprimir
              </button>
              <button type="button" disabled={!ready || state.busy} onClick={handleDocx}>
                {state.busy ? 'Generando…' : 'Descargar Word'}
              </button>
            </div>
            <p className="hint">
              Al imprimir elige <strong>Márgenes: Ninguno</strong> y desactiva los encabezados y
              pies de página para que la hoja salga exacta.
            </p>
          </aside>

          <section className="tool-main">
            <div className="tool-status" role="status">
              {state.error ? (
                <span className="error">{state.error}</span>
              ) : progress ? (
                <span>{progress}</span>
              ) : layout ? (
                <span>
                  {images.length} imágenes · {layout.pages.length} página
                  {layout.pages.length === 1 ? '' : 's'} · {settings.imagesPerPage} por hoja ·
                  aprovechamiento del área útil: {Math.round(layout.coverage)} %
                </span>
              ) : null}
            </div>

            {layout && <PagePreview layout={layout} fit={settings.fit} view={view} />}
          </section>
        </div>
      )}
    </div>
  );
}
