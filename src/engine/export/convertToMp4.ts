import { createFFmpeg, toBlob } from './ffmpeg';

export type ConvertProgress = (pct: number, label: string) => void;

/** Converts the recorded WebM into an Instagram/TikTok-friendly H.264 MP4. */
export async function convertWebmToMp4(webm: Blob, onProgress: ConvertProgress): Promise<Blob> {
  onProgress(5, 'LOADING FFMPEG...');
  const { ff } = await createFFmpeg();

  ff.on('log', ({ message }) => console.log('[ffmpeg]', message));
  ff.on('progress', ({ progress }) => {
    const pct = Math.round(Math.min(progress, 1) * 100);
    onProgress(Math.max(pct, 10), `ENCODING... ${pct}%`);
  });

  onProgress(15, 'WRITING VIDEO...');
  await ff.writeFile('in.webm', new Uint8Array(await webm.arrayBuffer()));

  onProgress(20, 'ENCODING MP4...');
  const code = await ff.exec([
    '-i', 'in.webm',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-movflags', '+faststart',
    'out.mp4',
  ]);
  if (code !== 0) throw new Error(`FFmpeg exited with code ${code}`);

  const data = await ff.readFile('out.mp4');
  await ff.deleteFile('in.webm').catch(() => {});
  await ff.deleteFile('out.mp4').catch(() => {});
  return toBlob(data, 'video/mp4');
}
