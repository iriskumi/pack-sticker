export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface InputItem {
  id: string;
  copyIndex: number;
  w: number;
  h: number;
}

export interface PlacedItem {
  id: string;
  copyIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
}

function intersects(a: Rect, b: Rect): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function splitFree(free: Rect, placed: Rect): Rect[] {
  const result: Rect[] = [];
  if (placed.x < free.x + free.w && placed.x + placed.w > free.x) {
    if (placed.y > free.y) {
      result.push({ x: free.x, y: free.y, w: free.w, h: placed.y - free.y });
    }
    if (placed.y + placed.h < free.y + free.h) {
      result.push({ x: free.x, y: placed.y + placed.h, w: free.w, h: free.y + free.h - (placed.y + placed.h) });
    }
  }
  if (placed.y < free.y + free.h && placed.y + placed.h > free.y) {
    if (placed.x > free.x) {
      result.push({ x: free.x, y: free.y, w: placed.x - free.x, h: free.h });
    }
    if (placed.x + placed.w < free.x + free.w) {
      result.push({ x: placed.x + placed.w, y: free.y, w: free.x + free.w - (placed.x + placed.w), h: free.h });
    }
  }
  return result;
}

function isContainedIn(a: Rect, b: Rect): boolean {
  return b.x <= a.x && b.y <= a.y && b.x + b.w >= a.x + a.w && b.y + b.h >= a.y + a.h;
}

function placeItem(
  item: InputItem,
  freeRects: Rect[],
  allowRotate: boolean
): { placed: PlacedItem; newFreeRects: Rect[] } | null {
  let bestScore = Infinity;
  let bestRect: Rect | null = null;
  let bestRotated = false;

  for (const fr of freeRects) {
    const candidates: { w: number; h: number; rotated: boolean }[] = [
      { w: item.w, h: item.h, rotated: false },
    ];
    if (allowRotate && item.w !== item.h) {
      candidates.push({ w: item.h, h: item.w, rotated: true });
    }
    for (const c of candidates) {
      if (c.w <= fr.w && c.h <= fr.h) {
        const score = Math.min(fr.w - c.w, fr.h - c.h);
        if (score < bestScore) {
          bestScore = score;
          bestRect = { x: fr.x, y: fr.y, w: c.w, h: c.h };
          bestRotated = c.rotated;
        }
      }
    }
  }

  if (!bestRect) return null;

  const newFreeRects: Rect[] = [];
  for (const fr of freeRects) {
    if (intersects(fr, bestRect)) {
      newFreeRects.push(...splitFree(fr, bestRect));
    } else {
      newFreeRects.push(fr);
    }
  }

  // Prune dominated free rects
  const pruned: Rect[] = [];
  for (let i = 0; i < newFreeRects.length; i++) {
    let dominated = false;
    for (let j = 0; j < newFreeRects.length; j++) {
      if (i !== j && isContainedIn(newFreeRects[i], newFreeRects[j])) {
        dominated = true;
        break;
      }
    }
    if (!dominated) pruned.push(newFreeRects[i]);
  }

  return {
    placed: {
      id: item.id,
      copyIndex: item.copyIndex,
      x: bestRect.x,
      y: bestRect.y,
      w: bestRect.w,
      h: bestRect.h,
      rotated: bestRotated,
    },
    newFreeRects: pruned,
  };
}

/**
 * Pack rectangles into a bin using the MaxRects Best-Short-Side-Fit heuristic.
 *
 * @param preserveOrder - When true, items are placed in the exact order given
 *   (no area-sort). Use this for balanced mode so the caller's interleaving is
 *   respected and no single image type dominates.
 *   When false (default), items are sorted largest-first for maximum density.
 */
export function packRects(
  items: InputItem[],
  binW: number,
  binH: number,
  allowRotate: boolean,
  preserveOrder = false
): PlacedItem[] {
  const ordered = preserveOrder
    ? [...items]
    : [...items].sort((a, b) => b.w * b.h - a.w * a.h);

  let freeRects: Rect[] = [{ x: 0, y: 0, w: binW, h: binH }];
  const placed: PlacedItem[] = [];

  for (const item of ordered) {
    const result = placeItem(item, freeRects, allowRotate);
    if (!result) continue;
    placed.push(result.placed);
    freeRects = result.newFreeRects;
  }

  return placed;
}
