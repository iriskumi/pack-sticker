export interface UploadedImage {
  id: string;
  file: File;
  originalDataUrl: string;
  processedDataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  targetWidthCm: number;
  isProcessing: boolean;
  copies: number;
  balancedCopies: number;
  bgQuality: 'high' | 'fast';
  hasTransparency: boolean;
}

export type PaperSize = 'A4' | 'A5' | 'A6' | 'custom';

export interface CanvasConfig {
  paperSize: PaperSize;
  widthMm: number;
  heightMm: number;
  dpi: number;
  paddingMm: number;
  spacingMm: number;
  rotateAllowed: boolean;
  fillMode: 'fill' | 'balanced' | 'manual';
}

export interface PackedItem {
  imageId: string;
  copyIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
}

export const PAPER_SIZES: Record<Exclude<PaperSize, 'custom'>, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  A6: { w: 105, h: 148 },
};
