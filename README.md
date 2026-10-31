# TRICK/ART

Turn a 10–15 s tricking clip into generative motion art, sized for Instagram Reels / Stories (1080×1920).

Everything runs in the browser — no backend, nothing is uploaded.

## How it works

1. **Extract** – the clip is sampled at ≤12 fps (≤120 frames) by seeking a hidden `<video>`.
2. **Analyse** – each frame goes through [MediaPipe Pose](https://developers.google.com/mediapipe) (33 landmarks). Per frame we derive joint velocities, body energy, air time and a trick **phase** (idle → load → launch → peak → land). If pose isn't available, a block-based pixel-diff fallback is used.
3. **Render** – one of four art modes draws the whole clip onto a canvas.
4. **Export** – PNG, or a frame-by-frame recorded video (WebM, optionally re-encoded to MP4 with FFmpeg.wasm).

Videos the browser can't decode are transcoded to H.264 with FFmpeg.wasm first.

| Mode | Idea |
| --- | --- |
| Motion Trail | Skeleton limbs accumulate over time, coloured by trick phase |
| Mandala | Every bone becomes a petal, repeated radially |
| Ghost Stack | ~20 evenly spaced "echoes" of the body |
| Flow Field | Motion accumulated into a grid, traced as streamlines (PNG only) |

## Tracking body parts

With pose tracking on, the **Track** section of the Style tab restricts the art to the parts you pick: **head, torso, left/right arm, left/right foot** (or the whole body, the default). Left and right are the athlete's own sides. The art then follows only those joints, and its energy is driven by just their movement, so a still foot stays quiet while the other kicks.

Pose analysis is kept for the loaded clip, so changing parts, mode or palette and pressing Generate again re-renders without re-tracking. Parts need a detected pose: with pose tracking off, or when nobody is found in the clip, the whole body is used and the status line says so.

To add a part, add an entry to `BODY_PARTS` in `constants/bodyParts.ts` and its id to the `BodyPart` type.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run typecheck
npm test           # unit tests
npm run test:e2e   # Playwright smoke test (needs ffmpeg on PATH + `npx playwright install chromium`)
npm run build      # outputs dist/
```

To host under a sub-path (e.g. GitHub Pages) build with `BASE_PATH=/tricking-art/ npm run build`.

MediaPipe and FFmpeg.wasm are installed from npm (exact versions) and served from the app's own origin — there are no third-party requests at runtime. `scripts/vendor.mjs` copies them into `public/vendor/` (git-ignored) before `dev`/`build`. They're loaded lazily on first use (~20 MB for the pose model). A Content-Security-Policy `<meta>` in `index.html` enforces same-origin only.

## Project structure

```
src/
├── main.tsx, App.tsx          # entry + top-level state wiring
├── types/                     # shared types (FrameData, RenderParams, …)
├── constants/                 # palettes, modes/tune controls, pose joints & skeleton, body parts, canvas sizes
├── lib/                       # tiny helpers: color, loadScript, download, async
├── engine/                    # framework-free logic (no React)
│   ├── pose/                  #   MediaPipe loader + detection
│   ├── analysis/              #   velocity, phase detection, frame diff, MotionAnalyzer
│   ├── extraction/            #   video → analysed frames
│   ├── render/                #   one file per art mode + params, geometry, stats
│   └── export/                #   animated recorder, FFmpeg transcode / MP4 convert
├── hooks/                     # useGenerator, useAnimatedExport, useMediaQuery, useObjectUrl
├── components/
│   ├── layout/                #   Header
│   ├── stage/                 #   CanvasStage, UploadHero, ProgressOverlay, ExportButtons, AnimExportModal
│   ├── controls/              #   ControlSheet, ControlTabs, StylePanel, TunePanel, ModeGrid, PaletteRow, StatsRow
│   └── ui/                    #   Slider, Toggle, Tabs, FileButton
└── styles/global.css          # design tokens, reset, shared buttons
tests/                         # vitest unit tests for the engine
```

`engine/` never imports from React; `components/` and `hooks/` never contain drawing code. To add a new art mode, write a `drawXFrame(ctx, frame, index, total, params)` function in `engine/render/`, register it in `engine/render/modes.ts`, and add an entry to `constants/modes.ts`.

## Notes

- **Trail Fade** (`persistence`) is still in the UI but, as in the original single-file version, no renderer reads it yet.
- Flow Field needs the whole clip at once, so the VIDEO export reports that it isn't supported for that mode.
