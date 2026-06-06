import { NextRequest, NextResponse } from 'next/server';
import Sharp from 'sharp';
import JSZip from 'jszip';
import { upscaleWithAI } from '@/lib/upscaler';

// Standard icon sizes for Chrome extensions + desktop apps
const ICON_SIZES = [16, 32, 48, 128, 256, 512];

const SIZE_LABELS: Record<number, string> = {
  16: 'Extension icon (16×16)',
  32: 'Extension icon (32×32)',
  48: 'Extension icon (48×48)',
  128: 'Extension icon (128×128)',
  256: 'App icon / Store icon (256×256)',
  512: 'Desktop app icon (512×512)',
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const useAI = formData.get('useAI') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/bmp', 'image/gif', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Please upload a PNG, JPG, WebP, AVIF, BMP, GIF, or TIFF image' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name.replace(/\.[^.]+$/, '');

    const metadata = await Sharp(buffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    // Step 1: AI HD upscaling (if enabled) — upscale source to at least 512px
    let sourceBuffer = buffer;
    const maxRequiredSize = 512;
    const needsUpscale = originalWidth < maxRequiredSize || originalHeight < maxRequiredSize;

    if (needsUpscale && useAI) {
      // AI upscaling — 4x scale for best quality
      sourceBuffer = await upscaleWithAI(buffer, 4);
    } else if (needsUpscale) {
      // Smart Sharp upscaling
      const scale = Math.max(maxRequiredSize / originalWidth, maxRequiredSize / originalHeight);
      const newWidth = Math.round(originalWidth * scale);
      const newHeight = Math.round(originalHeight * scale);
      sourceBuffer = Buffer.from(await Sharp(buffer)
        .resize(newWidth, newHeight, {
          kernel: 'lanczos3',
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .sharpen({ sigma: 1.2, m1: 0.5, m2: 2.0, x1: 0, y1: 0, y2: 10, x2: 1 })
        .png({ compressionLevel: 9, palette: false })
        .toBuffer());
    }

    // Step 2: Generate icons for each size
    const icons: { size: number; label: string; dataUrl: string; format: string }[] = [];

    for (const size of ICON_SIZES) {
      const resizedPng = await Sharp(sourceBuffer)
        .resize(size, size, {
          kernel: 'lanczos3',
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png({ compressionLevel: 9 })
        .toBuffer();

      const dataUrl = `data:image/png;base64,${resizedPng.toString('base64')}`;
      icons.push({ size, label: SIZE_LABELS[size], dataUrl, format: 'png' });
    }

    // Step 3: ICO format (Windows desktop)
    const icoBuffer = await Sharp(sourceBuffer)
      .resize(32, 32, { kernel: 'lanczos3', fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    // Step 4: Package ZIP
    const zip = new JSZip();
    for (const icon of icons) {
      const base64Data = icon.dataUrl.replace(/^data:image\/\w+;base64,/, '');
      zip.file(`${originalName}-${icon.size}x${icon.size}.png`, Buffer.from(base64Data, 'base64'));
    }
    zip.file(`${originalName}-32x32.ico`, icoBuffer);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipBase64 = zipBuffer.toString('base64');

    return NextResponse.json({
      icons,
      zipDataUrl: `data:application/zip;base64,${zipBase64}`,
      originalName,
      originalWidth,
      originalHeight,
      upscaled: needsUpscale,
      aiUsed: needsUpscale && useAI,
    });

  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}
