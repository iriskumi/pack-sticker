import { jsPDF } from 'jspdf';
import type { PackedItem, UploadedImage, CanvasConfig } from '../types';

function mmToPx(mm: number, dpi: number) {
  return Math.round((mm / 25.4) * dpi);
}

export async function renderToCanvas(
  items: PackedItem[],
  images: UploadedImage[],
  config: CanvasConfig
): Promise<HTMLCanvasElement> {
  const W = mmToPx(config.widthMm, config.dpi);
  const H = mmToPx(config.heightMm, config.dpi);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Transparent background
  ctx.clearRect(0, 0, W, H);

  const imageMap = new Map(images.map((img) => [img.id, img]));

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = rej;
      el.src = src;
    });

  for (const item of items) {
    const imgData = imageMap.get(item.imageId);
    if (!imgData) continue;
    try {
      const el = await loadImage(imgData.processedDataUrl);
      ctx.save();
      if (item.rotated) {
        ctx.translate(item.x + item.width, item.y);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(el, 0, 0, item.height, item.width);
      } else {
        ctx.drawImage(el, item.x, item.y, item.width, item.height);
      }
      ctx.restore();
    } catch {
      // skip failed images
    }
  }

  return canvas;
}

export async function exportPNG(
  items: PackedItem[],
  images: UploadedImage[],
  config: CanvasConfig
): Promise<void> {
  const canvas = await renderToCanvas(items, images, config);
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `sticker-layout-${config.widthMm}x${config.heightMm}mm.png`;
  a.click();
}

export async function exportPDF(
  items: PackedItem[],
  images: UploadedImage[],
  config: CanvasConfig
): Promise<void> {
  const canvas = await renderToCanvas(items, images, config);
  const imgData = canvas.toDataURL('image/png');
  const orientation = config.widthMm < config.heightMm ? 'portrait' : 'landscape';
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [config.widthMm, config.heightMm],
  });
  pdf.addImage(imgData, 'PNG', 0, 0, config.widthMm, config.heightMm);
  pdf.save(`sticker-layout-${config.widthMm}x${config.heightMm}mm.pdf`);
}
