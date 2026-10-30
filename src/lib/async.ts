export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
