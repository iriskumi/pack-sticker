import { fillAlphaHoles } from './trimTransparency';

type Model = 'isnet' | 'isnet_fp16' | 'isnet_quint8';
type RemoveBgFn = (source: string) => Promise<Blob>;

const cache = new Map<Model, { fn: RemoveBgFn; promise: Promise<void> }>();

async function loadLib(model: Model): Promise<RemoveBgFn> {
  if (!cache.has(model)) {
    let resolveFn!: RemoveBgFn;
    const promise = import('@imgly/background-removal').then((mod) => {
      resolveFn = (source: string) =>
        mod.removeBackground(source, {
          model,
          output: { format: 'image/png', quality: 1 },
        });
    });
    cache.set(model, { fn: null as unknown as RemoveBgFn, promise });
    await promise;
    cache.get(model)!.fn = resolveFn;
  }
  await cache.get(model)!.promise;
  return cache.get(model)!.fn;
}

/**
 * Remove background from a data URL.
 * @param dataUrl  Source image as data URL
 * @param quality  'high' uses isnet (~80 MB, best for cartoons/white-bg art)
 *                 'fast' uses isnet_fp16 (~40 MB, ok for photos)
 */
export async function removeBackground(
  dataUrl: string,
  quality: 'high' | 'fast' = 'high'
): Promise<string> {
  const model: Model = quality === 'high' ? 'isnet' : 'isnet_fp16';
  const fn = await loadLib(model);
  const resultBlob = await fn(dataUrl);
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(resultBlob);
  });
  // Repair interior holes (e.g. forehead, eye whites in cartoon art)
  return fillAlphaHoles(rawDataUrl);
}
