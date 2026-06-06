import { useState, useEffect, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ImageCard } from './components/ImageCard';
import { CanvasSettings } from './components/CanvasSettings';
import { CanvasPreview } from './components/CanvasPreview';
import { ExportPanel } from './components/ExportPanel';
import type { UploadedImage, CanvasConfig, PackedItem } from './types';
import { trimTransparentEdges, hasTransparency, getImageDimensions } from './utils/trimTransparency';
import { removeBackground } from './utils/backgroundRemoval';
import { packRects } from './utils/maxrects';

const DEFAULT_CONFIG: CanvasConfig = {
  paperSize: 'A4',
  widthMm: 210,
  heightMm: 297,
  dpi: 300,
  paddingMm: 5,
  spacingMm: 2,
  rotateAllowed: true,
  fillMode: 'balanced',
};

function mmToPx(mm: number, dpi: number) {
  return (mm / 25.4) * dpi;
}

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Round-robin interleave: A0 B0 C0 A1 B1 C1 ...
 * preserves per-image target counts faithfully.
 * Pass to packRects with preserveOrder=true so no image type is starved.
 */
function buildRoundRobin(
  entries: { id: string; w: number; h: number; targetCopies: number }[]
): { id: string; copyIndex: number; w: number; h: number }[] {
  const result: { id: string; copyIndex: number; w: number; h: number }[] = [];
  const maxRounds = Math.max(...entries.map((e) => e.targetCopies), 0);
  for (let round = 0; round < maxRounds; round++) {
    for (const e of entries) {
      if (round < e.targetCopies) {
        result.push({ id: e.id, copyIndex: round, w: e.w, h: e.h });
      }
    }
  }
  return result;
}

/**
 * Weighted interleave for fill mode — priority = (c + 0.5) / targetCopies.
 * Maintains proportional representation; packed with area-sort.
 */
function buildWeightedItems(
  entries: { id: string; w: number; h: number; targetCopies: number }[]
): { id: string; copyIndex: number; w: number; h: number }[] {
  type Item = { id: string; copyIndex: number; w: number; h: number; priority: number };
  const all: Item[] = [];
  for (const e of entries) {
    for (let c = 0; c < e.targetCopies; c++) {
      all.push({ id: e.id, copyIndex: c, w: e.w, h: e.h, priority: (c + 0.5) / e.targetCopies });
    }
  }
  all.sort((a, b) => a.priority - b.priority);
  return all;
}

export default function App() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [config, setConfig] = useState<CanvasConfig>(DEFAULT_CONFIG);
  const [packedItems, setPackedItems] = useState<PackedItem[]>([]);
  const [packedCounts, setPackedCounts] = useState<Map<string, number>>(new Map());
  const [recommendedCopies, setRecommendedCopies] = useState<Map<string, number>>(new Map());
  const [coverage, setCoverage] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fullW = Math.round((config.widthMm / 25.4) * config.dpi);
  const fullH = Math.round((config.heightMm / 25.4) * config.dpi);

  useEffect(() => {
    const readyImages = images.filter((img) => !img.isProcessing && img.naturalWidth > 0);
    if (readyImages.length === 0) {
      setPackedItems([]);
      setPackedCounts(new Map());
      setRecommendedCopies(new Map());
      setCoverage(0);
      return;
    }

    const binW = mmToPx(config.widthMm - config.paddingMm * 2, config.dpi);
    const binH = mmToPx(config.heightMm - config.paddingMm * 2, config.dpi);
    const padX = mmToPx(config.paddingMm, config.dpi);
    const padY = mmToPx(config.paddingMm, config.dpi);
    const spacing = mmToPx(config.spacingMm, config.dpi);
    const binArea = binW * binH;
    const N = readyImages.length;

    const imgSizes = readyImages.map((img) => {
      const pw = mmToPx(img.targetWidthCm * 10, config.dpi);
      const aspect = img.naturalHeight / img.naturalWidth;
      const ph = pw * aspect;
      return { img, pw: Math.round(pw), ph: Math.round(ph) };
    });

    // Compute recommended balanced copies for each image
    // Each image should occupy 1/N of the bin area
    const fairShareArea = binArea / N;
    const recMap = new Map<string, number>();
    for (const { img, pw, ph } of imgSizes) {
      const imgArea = (pw + spacing) * (ph + spacing);
      const rec = imgArea > 0 ? Math.max(1, Math.round(fairShareArea / imgArea)) : 1;
      recMap.set(img.id, rec);
    }
    setRecommendedCopies(recMap);

    let inputItems: { id: string; copyIndex: number; w: number; h: number }[];
    let preserveOrder = false;

    if (config.fillMode === 'fill') {
      // Maximise quantity — area-sorted greedy packing
      const entries = imgSizes.map(({ img, pw, ph }) => {
        const imgArea = (pw + spacing) * (ph + spacing);
        const maxCopies = imgArea > 0 ? Math.ceil(binArea / imgArea) * 2 + 5 : 5;
        return { id: img.id, w: Math.round(pw + spacing), h: Math.round(ph + spacing), targetCopies: maxCopies };
      });
      inputItems = buildWeightedItems(entries);

    } else if (config.fillMode === 'balanced') {
      // Equal area share — round-robin, preserve order so no image is starved
      // If user set a per-image balancedCopies override, use that; else use auto recommendation
      preserveOrder = true;
      const entries = imgSizes.map(({ img, pw, ph }) => {
        const rec = recMap.get(img.id)!;
        const userOverride = img.balancedCopies; // 0 means "use auto"
        // User override is exact; auto gets a small buffer (+30%) for better gap-filling
        const targetCopies = userOverride > 0
          ? userOverride
          : Math.max(1, Math.round(rec * 1.3));
        return { id: img.id, w: Math.round(pw + spacing), h: Math.round(ph + spacing), targetCopies };
      });
      inputItems = buildRoundRobin(entries);

    } else {
      // Manual
      inputItems = imgSizes.flatMap(({ img, pw, ph }) =>
        Array.from({ length: img.copies }, (_, ci) => ({
          id: img.id,
          copyIndex: ci,
          w: Math.round(pw + spacing),
          h: Math.round(ph + spacing),
        }))
      );
    }

    const placed = packRects(inputItems, binW, binH, config.rotateAllowed, preserveOrder);

    const packed: PackedItem[] = placed.map((p) => ({
      imageId: p.id,
      copyIndex: p.copyIndex,
      x: Math.round(p.x + padX),
      y: Math.round(p.y + padY),
      width: Math.round(p.w - spacing),
      height: Math.round(p.h - spacing),
      rotated: p.rotated,
    }));

    const counts = new Map<string, number>();
    let packedArea = 0;
    for (const p of packed) {
      counts.set(p.imageId, (counts.get(p.imageId) || 0) + 1);
      packedArea += p.width * p.height;
    }

    setPackedItems(packed);
    setPackedCounts(counts);
    setCoverage(Math.round((packedArea / (fullW * fullH)) * 100));
  }, [images, config, fullW, fullH]);

  const handleFiles = useCallback(async (files: File[]) => {
    const newImages: UploadedImage[] = files.map((f) => ({
      id: nanoid(),
      file: f,
      originalDataUrl: '',
      processedDataUrl: '',
      naturalWidth: 0,
      naturalHeight: 0,
      targetWidthCm: 5,
      isProcessing: true,
      copies: 1,
      balancedCopies: 0,
      bgQuality: 'high',
      hasTransparency: false,
    }));

    setImages((prev) => [...prev, ...newImages]);

    for (const img of newImages) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target!.result as string;
        try {
          const transparent = await hasTransparency(dataUrl);
          let processed = dataUrl;
          if (transparent) {
            processed = await trimTransparentEdges(dataUrl);
          }
          const dims = await getImageDimensions(processed);
          setImages((prev) =>
            prev.map((im) =>
              im.id === img.id
                ? {
                    ...im,
                    originalDataUrl: dataUrl,
                    processedDataUrl: processed,
                    naturalWidth: dims.width,
                    naturalHeight: dims.height,
                    hasTransparency: transparent,
                    isProcessing: false,
                  }
                : im
            )
          );
        } catch {
          setImages((prev) => prev.filter((im) => im.id !== img.id));
        }
      };
      reader.readAsDataURL(img.file);
    }
  }, []);

  const handleUpdate = useCallback((id: string, changes: Partial<UploadedImage>) => {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...changes } : img)));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const handleRemoveBg = useCallback(async (id: string) => {
    const img = images.find((i) => i.id === id);
    if (!img) return;
    setImages((prev) => prev.map((i) => (i.id === id ? { ...i, isProcessing: true } : i)));
    try {
      const result = await removeBackground(img.originalDataUrl || img.processedDataUrl, img.bgQuality);
      const trimmed = await trimTransparentEdges(result);
      const dims = await getImageDimensions(trimmed);
      setImages((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, processedDataUrl: trimmed, naturalWidth: dims.width, naturalHeight: dims.height, hasTransparency: true, isProcessing: false }
            : i
        )
      );
    } catch {
      alert('去除背景失败，请重试。');
      setImages((prev) => prev.map((i) => (i.id === id ? { ...i, isProcessing: false } : i)));
    }
  }, [images]);

  const totalPacked = packedItems.length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle sidebar">
            <span /><span /><span />
          </button>
          <div className="logo">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="2" width="28" height="28" rx="6" fill="#7c6ef0"/>
              <rect x="7" y="7" width="8" height="8" rx="2" fill="white" opacity="0.9"/>
              <rect x="17" y="7" width="8" height="5" rx="1.5" fill="white" opacity="0.7"/>
              <rect x="7" y="17" width="5" height="8" rx="1.5" fill="white" opacity="0.7"/>
              <rect x="14" y="14" width="11" height="11" rx="2" fill="white" opacity="0.9"/>
            </svg>
            <span className="logo-text">PackSticker</span>
          </div>
        </div>
        <div className="header-right">
          {totalPacked > 0 && (
            <div className="header-stats">
              <span className="header-stat">共 {totalPacked} 张</span>
              <span className={`header-coverage coverage-${coverage >= 80 ? 'good' : coverage >= 50 ? 'ok' : 'low'}`}>
                利用率 {coverage}%
              </span>
            </div>
          )}
          <ExportPanel items={packedItems} images={images} config={config} disabled={packedItems.length === 0} />
        </div>
      </header>

      <div className="app-body">
        <aside className={`sidebar${sidebarOpen ? ' open' : ' closed'}`}>
          <div className="sidebar-inner">
            <CanvasSettings config={config} onChange={setConfig} />
            <div className="divider" />
            <div className="sidebar-section">
              <h3 className="section-title">图片列表</h3>
              <ImageUploader onFiles={handleFiles} />
              {images.length > 0 && (
                <div className="image-list">
                  {images.map((img) => (
                    <ImageCard
                      key={img.id}
                      image={img}
                      fillMode={config.fillMode}
                      packedCount={packedCounts.get(img.id) || 0}
                      recommendedCount={recommendedCopies.get(img.id) || 0}
                      onUpdate={handleUpdate}
                      onRemove={handleRemove}
                      onRemoveBg={handleRemoveBg}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="main-area">
          <CanvasPreview
            items={packedItems}
            images={images}
            config={config}
            totalPacked={totalPacked}
            coverage={coverage}
          />
        </main>
      </div>
    </div>
  );
}
