# AEL Image Color Extractor

<p align="center">
  <img src="screenshot.svg" alt="AEL Image Color Extractor Screenshot" width="800">
</p>

**Upload any image and extract its dominant colors instantly.** Uses canvas-based color quantization (median cut algorithm) for accurate palette generation. Get hex, RGB, and HSL values — export to 5 formats.

## Features

- **Smart Color Extraction**: Median cut quantization for accurate palettes
- **3–16 Colors**: Adjustable palette size
- **Quality Control**: 5 levels from Fast to Most Accurate
- **5 Export Formats**: CSS Variables, Tailwind Config, JSON, SVG, Plain Text
- **Click to Copy**: Copy hex values from palette swatches
- **Drag & Drop**: Upload images via drag-drop or file picker
- **Canvas Engine**: Everything runs client-side — no server needed
- **Zero Dependencies**: Pure vanilla JavaScript

## Tech Stack

- **HTML5** — Semantic structure
- **CSS3** — Glassmorphism, flexbox, grid
- **JavaScript** — Canvas API, median cut color quantization, File API

## Live Demo

https://aymanelmasryael.github.io/ael-image-color-extractor/

## Usage

1. Upload an image (drag-drop or click to browse)
2. Adjust the number of colors (3–16)
3. Set quality level (Fast → Most Accurate)
4. Click **Extract Palette**
5. View hex, RGB, and HSL values
6. Export in your preferred format (CSS, Tailwind, JSON, SVG, TXT)
7. Download the palette as a JSON file

## Supported Formats

| Format | Description |
|--------|-------------|
| **CSS** | Custom properties (—color-1, —color-2, etc.) |
| **Tailwind** | Tailwind CSS config with extended colors |
| **JSON** | Structured data with hex, RGB, HSL |
| **SVG** | Visual palette as SVG rectangles |
| **TXT** | Plain text, space-separated |

## Author

**Ayman Elmasry** — AEL Digital Studio

---

_© 2026 AEL Digital Studio. All rights reserved._
