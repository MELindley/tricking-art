// Copies the runtime-loaded third-party assets (MediaPipe Pose, FFmpeg.wasm) out of
// node_modules into public/vendor so they're served from our own origin instead of a CDN.
// Versions are pinned exactly in package.json and package-lock.json holds their hashes.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const nm = (...p) => join(root, 'node_modules', ...p);
const out = (...p) => join(root, 'public', 'vendor', ...p);

rmSync(out(), { recursive: true, force: true });
mkdirSync(out('mediapipe-pose'), { recursive: true });
mkdirSync(out('ffmpeg'), { recursive: true });

// modelComplexity is 1 (full), so the lite/heavy models are never requested.
const poseFiles = [
  'pose.js',
  'pose_landmark_full.tflite',
  'pose_solution_packed_assets.data',
  'pose_solution_packed_assets_loader.js',
  'pose_solution_simd_wasm_bin.data',
  'pose_solution_simd_wasm_bin.js',
  'pose_solution_simd_wasm_bin.wasm',
  'pose_solution_wasm_bin.js',
  'pose_solution_wasm_bin.wasm',
  'pose_web.binarypb',
];
for (const f of poseFiles) cpSync(nm('@mediapipe/pose', f), out('mediapipe-pose', f));

cpSync(nm('@ffmpeg/ffmpeg/dist/umd/ffmpeg.js'), out('ffmpeg/ffmpeg.js'));
cpSync(nm('@ffmpeg/ffmpeg/dist/umd/814.ffmpeg.js'), out('ffmpeg/814.ffmpeg.js'));
cpSync(nm('@ffmpeg/util/dist/umd/index.js'), out('ffmpeg/util.js'));
cpSync(nm('@ffmpeg/core/dist/umd/ffmpeg-core.js'), out('ffmpeg/ffmpeg-core.js'));
cpSync(nm('@ffmpeg/core/dist/umd/ffmpeg-core.wasm'), out('ffmpeg/ffmpeg-core.wasm'));
console.log('vendored third-party assets -> public/vendor');
