import { createFFmpeg, toBlob } from './ffmpeg';

export type TranscodeProgress = (pct: number, detail: string) => void;

/** Re-encodes any video the browser can't decode into H.264 MP4 (audio dropped). */
export async function transcodeToMp4(file: File, onProgress: TranscodeProgress): Promise<Blob> {
  onProgress(5, 'LOADING TRANSCODER...');
  const { ff, fetchFile } = await createFFmpeg();

  const ext = (file.name || 'file').split('.').pop()!.toLowerCase();
  const input = `input.${ext}`;
  const output = 'output.mp4';

  ff.on('progress', ({ progress }) => {
    const pct = Math.round(Math.min(progress * 100, 95));
    onProgress(pct, `TRANSCODING ${pct}%`);
  });
  onProgress(5, 'CONVERTING TO H.264...');

  await ff.writeFile(input, await fetchFile(file));
  await ff.exec([
    '-i', input,
    '-vcodec', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '28',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-an',
    '-movflags', '+faststart',
    output,
  ]);
  const data = await ff.readFile(output);
  await ff.deleteFile(input).catch(() => {});
  await ff.deleteFile(output).catch(() => {});

  onProgress(100, 'DONE');
  return toBlob(data, 'video/mp4');
}
