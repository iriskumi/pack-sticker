import { useEffect, useRef, useCallback } from 'react';
import type { PackedItem, UploadedImage, CanvasConfig } from '../types';

interface Props {
  items: PackedItem[];
  images: UploadedImage[];
  config: CanvasConfig;
  totalPacked: number;
  coverage: number;
}

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src)!);
  return new Promise((res, rej) => {
    const el = new Image();
    el.onload = () => { imageCache.set(src, el); res(el); };
    el.onerror = rej;
    el.src = src;
  });
}

export function CanvasPreview({ items, images, config, totalPacked, coverage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawId = useRef(0);

  const fullW = Math.round((config.widthMm / 25.4) * config.dpi);
  const fullH = Math.round((config.heightMm / 25.4) * config.dpi);

  const draw = useCallback(async () => {
    const myId = ++drawId.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || items.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const containerW = container.clientWidth - 48;
    const containerH = container.clientHeight - 48;
    const scale = Math.min(containerW / fullW, containerH / fullH, 1);
    const cssW = Math.round(fullW * scale);
    const cssH = Math.round(fullH * scale);

    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cssW, cssH);

    const imageMap = new Map(images.map((img) => [img.id, img]));
    const uniqueDataUrls = [...new Set(
      items.map((item) => imageMap.get(item.imageId)?.processedDataUrl).filter(Boolean) as string[]
    )];
    await Promise.allSettled(uniqueDataUrls.map(loadImage));

    if (myId !== drawId.current) return;

    for (const item of items) {
      const imgData = imageMap.get(item.imageId);
      if (!imgData) continue;
      const el = imageCache.get(imgData.processedDataUrl);
      if (!el) continue;
      ctx.save();
      if (item.rotated) {
        ctx.translate((item.x + item.width) * scale, item.y * scale);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(el, 0, 0, item.height * scale, item.width * scale);
      } else {
        ctx.drawImage(el, item.x * scale, item.y * scale, item.width * scale, item.height * scale);
      }
      ctx.restore();
    }
  }, [items, images, fullW, fullH]);

  useEffect(() => {
    if (items.length === 0) return;
    draw();
  }, [draw, items]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { if (items.length > 0) draw(); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [draw, items]);

  const coverageClass = coverage >= 80 ? 'good' : coverage >= 50 ? 'ok' : 'low';

  return (
    <div className="preview-wrapper">
      <div className="preview-header">
        <span className="preview-title">预览</span>
        <span className="preview-meta">{config.widthMm} × {config.heightMm} mm · {config.dpi} DPI</span>
        {totalPacked > 0 && (
          <>
            <span className="preview-count">共 {totalPacked} 张贴纸</span>
            <span className={`preview-coverage coverage-${coverageClass}`}>
              利用率 {coverage}%
            </span>
          </>
        )}
      </div>
      <div ref={containerRef} className="preview-canvas-container">
        {items.length === 0 ? (
          <div className="preview-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
            <p>上传图片后即可预览排版效果</p>
          </div>
        ) : (
          <canvas ref={canvasRef} className="preview-canvas" />
        )}
      </div>
    </div>
  );
}
