import { useCallback, useEffect, useState } from 'react';
import { buildDocx, downloadBlob } from '../../lib/export/docx';
import { Dropzone } from './Dropzone';
import { PagePreview } from './PagePreview';
import { SettingsPanel } from './SettingsPanel';
import { ThumbnailStrip } from './ThumbnailStrip';
import { useToolState } from './useToolState';
import './tool.css';

export default function ToolApp() {
  const state = useToolState();
  const { layout, settings, view, images } = state;
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
      state.setNotice(
        error instanceof Error
          ? `No se pudo generar el documento: ${error.message}`
          : 'No se pudo generar el documento.',
      );
    } finally {
      state.setBusy(false);
      setProgress(null);
    }
  }, [layout, settings, view, state]);

  const ready = images.length > 0 && layout !== null;

  return (
    <div className="tool-shell">
      <aside className="tool-sidebar">
        <fieldset>
          <legend>Imágenes</legend>
          <Dropzone onFiles={state.addFiles} onClear={state.clearImages} count={images.length} />
          <ThumbnailStrip
            images={images}
            onRotate={state.rotateImage}
            onRemove={state.removeImage}
            onReorder={state.reorder}
          />
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
            onClick={() => window.print()}
          >
            Imprimir / PDF
          </button>
          <button type="button" disabled={!ready || state.busy} onClick={handleDocx}>
            {state.busy ? 'Generando…' : 'Descargar Word'}
          </button>
        </div>
        <p className="hint">
          Al imprimir elige <strong>Márgenes: Ninguno</strong> y desactiva los encabezados y pies de
          página para que la hoja salga exacta.
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
          ) : (
            <span>Carga tus imágenes para ver la vista previa.</span>
          )}
          {state.notice && <span className="warning">{state.notice}</span>}
        </div>

        {layout ? (
          <PagePreview layout={layout} fit={settings.fit} view={view} />
        ) : (
          <div className="empty-state">
            <p>
              Aquí aparecerá el pliego: la hoja tal como se va a imprimir, con los márgenes marcados y
              las imágenes ya acomodadas.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
