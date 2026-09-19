# IconCraft

> Fast, private, browser-based icon studio. Convert artwork and logos into perfectly sized icon sets for Chrome extensions, web favicons, desktop applications, and mobile apps.

## Features

- **100% Client-Side**: All icon processing runs directly in your browser using HTML5 Canvas and JSZip. No images are ever uploaded to external servers.
- **Multiple Platform Sizes**: Generates standard sizes (16x16, 32x32, 48x48, 128x128, 256x256, 512x512).
- **Multi-Resolution Windows `.ico`**: Automatically bundles 16, 32, 48, 128, and 256px frames into a single `.ico` file.
- **Manifest Generator**: Generates ready-to-use `chrome-manifest-icons.json` for Chrome extension `manifest.json`.
- **Customizable**: Control image fit (Contain / Cover), safe padding percentage, canvas backgrounds, and custom shapes.
- **AI Upscaler Support**: Built-in pipeline support for Real-ESRGAN NCNN Vulkan.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI & Styling**: React 19, Tailwind CSS
- **Packaging & Processing**: JSZip, HTML5 Canvas, Sharp

## Getting Started

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
