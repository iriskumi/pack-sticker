type RemoveBgFn = (source: Blob | string) => Promise<Blob>;

let removeFn: RemoveBgFn | null = null;
let loadPromise: Promise<void> | null = null;

async function loadLib() {
  if (removeFn) return;
  if (!loadPromise) {
    loadPromise = import('@imgly/background-removal').then((mod) => {
      // Use library's default publicPath (staticimgly.com CDN) — do NOT override it
      removeFn = (source) => mod.removeBackground(source);
    });
  }
  await loadPromise;
}

export async function removeBackground(dataUrl: string): Promise<string> {
  await loadLib();
  const resultBlob = await removeFn!(dataUrl);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(resultBlob);
  });
}
