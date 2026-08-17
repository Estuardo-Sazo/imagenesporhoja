import { useCallback, useRef, useState } from 'react';

interface Props {
  onFiles: (files: FileList | File[]) => void;
  /** `hero` para el paso de selección, `inline` para el panel lateral. */
  variant?: 'hero' | 'inline';
  disabled?: boolean;
  disabledReason?: string;
}

export function Dropzone({ onFiles, variant = 'inline', disabled = false, disabledReason }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setOver(false);
      if (disabled) return;
      if (event.dataTransfer.files?.length) onFiles(event.dataTransfer.files);
    },
    [onFiles, disabled],
  );

  return (
    <div className={`picker picker--${variant}`}>
      <button
        type="button"
        className={`dropzone${over ? ' is-over' : ''}`}
        onClick={() => fileInput.current?.click()}
        disabled={disabled}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={handleDrop}
      >
        {variant === 'hero' && (
          <span className="dropzone-mark" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </span>
        )}
        Arrastra tus imágenes
        <span className="dropzone-action">o haz clic para elegirlas</span>
      </button>

      <div className="picker-actions">
        <button
          type="button"
          className="folder-picker-button"
          onClick={() => folderInput.current?.click()}
          disabled={disabled}
        >
          Elegir una carpeta
        </button>
      </div>

      {disabled && disabledReason && <p className="hint">{disabledReason}</p>}

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files) onFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <input
        ref={folderInput}
        type="file"
        multiple
        hidden
        // @ts-expect-error atributos no estándar admitidos por los navegadores
        webkitdirectory=""
        directory=""
        onChange={(event) => {
          if (event.target.files) onFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
