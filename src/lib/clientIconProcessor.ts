import JSZip from 'jszip';

const ICON_SIZES = [16, 32, 48, 128, 256, 512];
const SIZE_LABELS: Record<number, string> = {
  16: 'Extension icon (16×16)',
  32: 'Extension icon (32×32)',
  48: 'Extension icon (48×48)',
  128: 'Extension icon (128×128)',
  256: 'App icon / Store icon (256×256)',
  512: 'Desktop app icon (512×512)',
};

export interface IconData {
  size: number;
  label: string;
  dataUrl: string;
  format: string;
}

export interface ConversionResult {
  icons: IconData[];
  zipDataUrl: string;
  originalName: string;
  originalWidth: number;
  originalHeight: number;
  upscaled?: boolean;
  aiUsed?: boolean;
}

/**
 * Resize an image bitmap to the target size using canvas.
 * Uses lanczos-equivalent quality via canvas's imageSmoothingQuality.
 */
function resizeImage(
  img: HTMLImageElement | ImageBitmap,
  targetSize: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetSize, targetSize);
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode PNG'));
      },
      'image/png',
      0.92
    );
  });
}

/**
 * Generate a simple ICO file wrapping a PNG image.
 * ICO format: 6-byte header + 16-byte directory entry + PNG data.
 */
async function generateIco(pngBlob: Blob): Promise<Blob> {
  const pngBuffer = await pngBlob.arrayBuffer();
  const pngBytes = new Uint8Array(pngBuffer);

  // ICO header: reserved(2) + type=1(2) + count=1(2)
  const header = new Uint8Array(6);
  header[2] = 1; // type = 1 (ICO)
  header[4] = 1; // count = 1

  // Directory entry: w, h, colors, reserved, planes, bpp, size, offset
  const dir = new Uint8Array(16);
  // Width/height: 0 means 256
  dir[0] = 0; // w = 256 (0 means 256)
  dir[1] = 0; // h = 256
  dir[4] = 1; // color planes
  dir[5] = 32; // bits per pixel
  // Size of image data
  const size = pngBytes.length;
  dir[8] = size & 0xff;
  dir[9] = (size >> 8) & 0xff;
  dir[10] = (size >> 16) & 0xff;
  dir[11] = (size >> 24) & 0xff;
  // Offset: header + directory = 22
  const offset = 22;
  dir[12] = offset & 0xff;
  dir[13] = (offset >> 8) & 0xff;
  dir[14] = (offset >> 16) & 0xff;
  dir[15] = (offset >> 24) & 0xff;

  const ico = new Uint8Array(22 + pngBytes.length);
  ico.set(header, 0);
  ico.set(dir, 6);
  ico.set(pngBytes, 22);

  return new Blob([ico], { type: 'image/x-icon' });
}

/**
 * Process an image file entirely on the client side.
 * Returns icons, ZIP as data URL, and metadata.
 */
export async function processImage(
  file: File,
  enabledSizes: number[]
): Promise<ConversionResult> {
  // Read the file as data URL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('Failed to read file'));
    r.readAsDataURL(file);
  });

  // Load image to get dimensions
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode image'));
    image.src = dataUrl;
  });

  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;
  const originalName = file.name.replace(/\.[^.]+$/, '');

  // Upscale if source is smaller than 512px (simple canvas-based upscaling)
  const maxRequiredSize = 512;
  const needsUpscale = originalWidth < maxRequiredSize || originalHeight < maxRequiredSize;
  let sourceImg = img;

  if (needsUpscale) {
    // Simple client-side upscaling: draw at larger size on canvas
    const scale = Math.max(maxRequiredSize / originalWidth, maxRequiredSize / originalHeight);
    const newWidth = Math.round(originalWidth * scale);
    const newHeight = Math.round(originalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to encode upscaled image'));
      }, 'image/png');
    });

    const upscaledUrl = URL.createObjectURL(blob);
    sourceImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to decode upscaled image'));
      image.src = upscaledUrl;
    });
  }

  // Filter sizes to only enabled ones
  const sizes = ICON_SIZES.filter((s) => enabledSizes.includes(s));

  // Generate icons for each size
  const icons: IconData[] = [];
  const zip = new JSZip();

  for (const size of sizes) {
    const pngBlob = await resizeImage(sourceImg, size);
    const pngBuffer = await pngBlob.arrayBuffer();

    // Data URL for preview
    const dataUrl = `data:image/png;base64,${bufferToBase64(pngBuffer)}`;

    icons.push({
      size,
      label: SIZE_LABELS[size] || `${size}×${size}`,
      dataUrl,
      format: 'png',
    });

    // Add to ZIP
    zip.file(`${originalName}-${size}x${size}.png`, pngBuffer);
  }

  // Generate ICO (32×32)
  const icoPngBlob = await resizeImage(sourceImg, 32);
  const icoBlob = await generateIco(icoPngBlob);
  zip.file(`${originalName}-32x32.ico`, await icoBlob.arrayBuffer());

  // Generate ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipBase64 = await blobToBase64(zipBlob);
  const zipDataUrl = `data:application/zip;base64,${zipBase64}`;

  return {
    icons,
    zipDataUrl,
    originalName,
    originalWidth,
    originalHeight,
    upscaled: needsUpscale,
  };
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return bufferToBase64(buffer);
}
