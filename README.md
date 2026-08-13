<div align="center">

# PackSticker

**Smart sticker & transfer sheet layout tool**

Upload images, remove backgrounds, pack them onto a print sheet, and export print-ready transparent PNG or PDF files, all in your browser.

[Try it online](https://pack-sticker.pages.dev) · [中文 README](README.zh-CN.md) · [Features](#features) · [Local Development](#local-development) · [Technical Notes](#technical-notes)

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## Features

### Image Management

- Drag and drop images, use the file picker, or upload an entire folder.
- Supports PNG, JPG, and WebP files.
- Detects transparency automatically.
- Trims empty transparent edges from transparent PNGs before layout.
- Lets each image keep its own target print width.

### Background Removal

| Mode | How it works | Best for |
|---|---|---|
| AI Background Removal - High Quality | ISNet model, about 80 MB on first load | Photos, people, complex backgrounds, detailed artwork |
| AI Background Removal - Fast | ISNet FP16 model, about 40 MB on first load | General photos and faster browser-side processing |
| Remove White Background | Border flood-fill based color removal, no AI model download | Line art, logos, illustrations, and designs with white interior details |

AI background removal runs in the browser through `@imgly/background-removal`. After removal, PackSticker repairs interior alpha holes with a BFS pass so transparent gaps inside an illustration are restored instead of accidentally exported as cut-outs.

The white-background remover samples the four corners, flood-fills only connected border pixels within the color tolerance, and preserves matching colors inside the artwork.

### Layout Modes

| Mode | Description |
|---|---|
| Balanced | Gives each uploaded design roughly equal print area, so small stickers get more copies and large stickers get fewer copies. |
| Fill Sheet | Maximizes the total number of stickers that fit on the page. |
| Manual | Uses the exact copy count you set for each image. |

Balanced mode also supports per-image copy adjustments. When you override the recommendation, the app shows the actual packed count and lets you return to the automatic recommendation.

### Paper And Print Settings

- Built-in A4, A5, and A6 presets.
- Custom paper width and height in millimeters.
- DPI options: 72, 150, 300, and 600.
- Independent margin and spacing controls in millimeters.
- Optional rotation to improve packing density.
- Pixel-size readout for the selected paper and DPI.

### Canvas Preview

- Live Canvas preview of the current print sheet.
- Sharp HiDPI / Retina rendering in the browser.
- Total sticker count and utilisation percentage.
- Utilisation color states: green at 80% or above, orange at 50% or above, red below 50%.
- White-background and transparent-checkerboard preview modes before export.

### Export

- Export PNG with a transparent background, useful for transfer sheets and sticker workflows.
- Export PDF at the selected physical page size with a white page background, ready to send to a print shop.

---

## Screenshot

No real screenshot is committed yet. Add one here when the app has a current, representative screenshot.

---

## Local Development

Requirements: Node.js 18 or newer.

```bash
git clone https://github.com/iriskumi/pack-sticker.git
cd pack-sticker
npm install
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173`.

```bash
npm run build
npm run preview
```

---

## Deployment

PackSticker is a Vite app and can be deployed to Cloudflare Pages, Vercel, or Netlify.

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

The AI background removal modes download ONNX model files from `staticimgly.com` on first use. The white-background removal mode runs locally without downloading an AI model.

---

## Technical Notes

### Packing Algorithm - MaxRects

PackSticker includes a local implementation of the MaxRects Best-Short-Side-Fit rectangle packing heuristic:

- Maintains a list of free rectangles.
- Splits free space after each placed item.
- Prunes free rectangles that are fully contained by another free rectangle.
- Supports rotation when enabled.
- Supports a `preserveOrder` mode used by Balanced layout, so round-robin input order is respected and one image type does not dominate the sheet.

### Balanced And Fill Layout Logic

- Balanced mode calculates each image's fair share of the available printable area, builds a round-robin item list, and packs it with order preservation.
- Fill Sheet mode builds a weighted item list and lets MaxRects sort by area for denser packing.
- Manual mode packs the exact copy counts configured per image.

### BFS Interior Hole Repair

```text
1. Start from transparent pixels on the four image borders.
2. BFS through only near-fully-transparent pixels with alpha < 15.
3. Treat semi-transparent antialiasing pixels as barriers, so they do not create bridges into interior details.
4. Restore any transparent or semi-transparent pixel not reachable from the border when alpha < 200.
```

This keeps internal details such as eye whites, highlights, or enclosed illustration areas from turning into unwanted transparent holes.

### Flood-Fill Background Removal

```text
1. Sample the four corner pixels to estimate the background color.
2. BFS from the image borders through connected pixels within the color tolerance.
3. Make only the reachable exterior background pixels transparent.
4. Preserve same-colored regions inside the artwork because they are not connected to the border.
```

### Project Structure

```text
src/
├── types.ts                    # Shared TypeScript types
├── App.tsx                     # Main app state and layout orchestration
├── components/
│   ├── ImageUploader.tsx       # Drag-and-drop upload and folder selection
│   ├── ImageCard.tsx           # Per-image controls
│   ├── CanvasSettings.tsx      # Layout mode and paper settings
│   ├── CanvasPreview.tsx       # Live Canvas preview
│   └── ExportPanel.tsx         # PNG / PDF export buttons
└── utils/
    ├── maxrects.ts             # MaxRects packing
    ├── trimTransparency.ts     # Transparency trimming, BFS hole repair, flood-fill removal
    ├── backgroundRemoval.ts    # AI background removal wrapper
    └── canvasExport.ts         # Full-resolution rendering and file export
```

### Dependencies

| Library | Purpose |
|---|---|
| [`@imgly/background-removal`](https://github.com/imgly/background-removal-js) | Browser-side AI background removal |
| [`jsPDF`](https://github.com/parallax/jsPDF) | PDF export |
| [`React`](https://react.dev) + [`TypeScript`](https://www.typescriptlang.org) | UI and application code |
| [`Vite`](https://vite.dev) | Development server and production build |

---

## License

MIT © [iriskumi](https://github.com/iriskumi)
