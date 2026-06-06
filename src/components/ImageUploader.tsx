import { useRef, useState } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
}

export function ImageUploader({ onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter((f) =>
      ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(f.type)
    );
    if (valid.length) onFiles(valid);
  };

  return (
    <div className="uploader-wrapper">
      <div
        className={`uploader${dragging ? ' dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handle(e.target.files)}
        />
        <div className="uploader-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <p className="uploader-label">拖拽图片到此处，或点击上传</p>
        <p className="uploader-hint">PNG · JPG · WebP</p>
      </div>

      <button
        className="uploader-folder-btn"
        onClick={() => folderRef.current?.click()}
        title="选择整个文件夹"
      >
        <input
          ref={folderRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          // @ts-ignore – webkitdirectory is not in TS types but works in all modern browsers
          webkitdirectory=""
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handle(e.target.files)}
        />
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        上传文件夹
      </button>
    </div>
  );
}
