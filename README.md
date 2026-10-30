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

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run typecheck
npm test
npm run build      # outputs dist/
```

To host under a sub-path (e.g. GitHub Pages) build with `BASE_PATH=/tricking-art/ npm run build`.

MediaPipe and FFmpeg.wasm are loaded lazily from jsDelivr on first use (~20 MB for the pose model), so the first generation needs a network connection.

## Project structure

```
src/
├── main.tsx, App.tsx          # entry + top-level state wiring
├── types/                     # shared types (FrameData, RenderParams, …)
├── constants/                 # palettes, modes/tune controls, pose joints & skeleton, canvas sizes
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
