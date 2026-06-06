import { useState } from 'react';
import type { PackedItem, UploadedImage, CanvasConfig } from '../types';
import { exportPNG, exportPDF } from '../utils/canvasExport';

interface Props {
  items: PackedItem[];
  images: UploadedImage[];
  config: CanvasConfig;
  disabled: boolean;
}

export function ExportPanel({ items, images, config, disabled }: Props) {
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null);

  const run = async (type: 'png' | 'pdf') => {
    if (disabled || exporting) return;
    setExporting(type);
    try {
      if (type === 'png') await exportPNG(items, images, config);
      else await exportPDF(items, images, config);
    } catch (e) {
      console.error(e);
      alert('导出失败，请重试。');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="export-panel">
      <button
        className={`btn-export btn-export-png${exporting === 'png' ? ' loading' : ''}`}
        onClick={() => run('png')}
        disabled={disabled || !!exporting}
      >
        {exporting === 'png' ? (
          <><span className="spinner" /> 导出中…</>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            导出 PNG
          </>
        )}
      </button>

      <button
        className={`btn-export btn-export-pdf${exporting === 'pdf' ? ' loading' : ''}`}
        onClick={() => run('pdf')}
        disabled={disabled || !!exporting}
      >
        {exporting === 'pdf' ? (
          <><span className="spinner" /> 导出中…</>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            导出 PDF
          </>
        )}
      </button>
    </div>
  );
}
