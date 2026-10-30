const cache = new Map<string, Promise<void>>();

/** Injects a <script> once and resolves when it has loaded. */
export function loadScript(src: string, crossOrigin?: 'anonymous'): Promise<void> {
  const cached = cache.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    if (crossOrigin) el.crossOrigin = crossOrigin;
    el.onload = () => resolve();
    el.onerror = () => {
      cache.delete(src);
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(el);
  });
  cache.set(src, promise);
  return promise;
}
