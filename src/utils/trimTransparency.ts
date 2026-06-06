/**
 * Detects if an image has meaningful transparency.
 * Returns true if any pixel has alpha < 250.
 */
export async function hasTransparency(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(img.width, 200);
      canvas.height = Math.min(img.height, 200);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 250) {
          resolve(true);
          return;
        }
      }
      resolve(false);
    };
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}

/**
 * Trims transparent edges from a PNG image.
 * Returns a new data URL with transparent borders removed.
 */
export async function trimTransparentEdges(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);

      let top = height, left = width, bottom = 0, right = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alpha = data[(y * width + x) * 4 + 3];
          if (alpha > 10) {
            if (y < top) top = y;
            if (y > bottom) bottom = y;
            if (x < left) left = x;
            if (x > right) right = x;
          }
        }
      }

      if (top > bottom || left > right) {
        resolve(dataUrl);
        return;
      }

      const trimWidth = right - left + 1;
      const trimHeight = bottom - top + 1;
      const out = document.createElement('canvas');
      out.width = trimWidth;
      out.height = trimHeight;
      const outCtx = out.getContext('2d')!;
      outCtx.drawImage(img, left, top, trimWidth, trimHeight, 0, 0, trimWidth, trimHeight);
      resolve(out.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Fill interior transparent "holes" left behind by background removal.
 *
 * Algorithm: BFS from all border-transparent pixels to mark the true
 * exterior background. Any transparent pixel that cannot be reached from
 * the border is an interior hole (e.g. forehead, eye whites in cartoon art)
 * and is restored to fully opaque — keeping its original RGB colour.
 */
export async function fillAlphaHoles(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const { data, width, height } = imageData;

      // BFS only floods through near-fully-transparent pixels (true background).
      // Semi-transparent anti-aliasing pixels at hair/face edges are NOT traversed,
      // so they cannot form a "bridge" from the exterior into interior holes.
      const BFS_THRESHOLD = 15;   // pixels that count as exterior background
      const FILL_THRESHOLD = 200; // interior pixels to restore (transparent + semi-transparent)

      const visited = new Uint8Array(width * height);
      const queue = new Int32Array(width * height);
      let head = 0;
      let tail = 0;

      const enqueue = (idx: number) => {
        if (!visited[idx] && data[idx * 4 + 3] < BFS_THRESHOLD) {
          visited[idx] = 1;
          queue[tail++] = idx;
        }
      };

      // Seed from all four borders
      for (let x = 0; x < width; x++) {
        enqueue(x);                           // top row
        enqueue((height - 1) * width + x);    // bottom row
      }
      for (let y = 1; y < height - 1; y++) {
        enqueue(y * width);                   // left column
        enqueue(y * width + (width - 1));     // right column
      }

      // BFS — flood-fill exterior transparent region
      while (head < tail) {
        const idx = queue[head++];
        const x = idx % width;
        const y = (idx - x) / width;
        if (x > 0)          enqueue(idx - 1);
        if (x < width - 1)  enqueue(idx + 1);
        if (y > 0)          enqueue(idx - width);
        if (y < height - 1) enqueue(idx + width);
      }

      // Any pixel with low-enough alpha that was NOT reachable from the border
      // is an interior hole → restore to fully opaque (keep original RGB)
      let filled = 0;
      for (let i = 0; i < width * height; i++) {
        if (!visited[i] && data[i * 4 + 3] < FILL_THRESHOLD) {
          data[i * 4 + 3] = 255;
          filled++;
        }
      }

      if (filled === 0) {
        resolve(dataUrl);
        return;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Gets natural dimensions of an image from a data URL.
 */
export async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}
