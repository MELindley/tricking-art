/** Absolute URL for a file under the app's base path (works for './' and '/sub/path/' builds). */
export const assetUrl = (path: string): string => new URL(`${import.meta.env.BASE_URL}${path}`, document.baseURI).href;
