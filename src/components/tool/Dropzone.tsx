import { useCallback, useRef, useState } from 'react';

interface Props {
  onFiles: (files: FileList | File[]) => void;
  onClear: () => void;
  count: number;
}

export function Dropzone({ onFiles, onClear, count }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setOver(false);
      if (event.dataTransfer.files?.length) onFiles(event.dataTransfer.files);
    },
    [onFiles],
  );

  return (
    <div>
      <button
        type="button"
        className={`dropzone${over ? ' is-over' : ''}`}
        onClick={() => fileInput.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={handleDrop}
      >
        Arrastra tus imágenes aquí
        <span>o haz clic para elegirlas</span>
      </button>

      <div className="button-row">
        <button type="button" onClick={() => folderInput.current?.click()}>
          Elegir carpeta
        </button>
        <button type="button" onClick={onClear} disabled={count === 0}>
          Quitar todas
        </button>
      </div>

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
        // @ts-expect-error atributos no estándar soportados por los navegadores
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
