import JSZip from 'jszip';

const ICON_SIZES = [16, 32, 48, 128, 256, 512] as const;
const ICO_SIZES = [16, 32, 48, 128, 256] as const;
const MAX_SOURCE_PIXELS = 64_000_000;

const SIZE_LABELS: Record<number, string> = {
  16: 'Extension icon (16×16)',
  32: 'Extension icon (32×32)',
  48: 'Extension icon (48×48)',
  128: 'Extension icon (128×128)',
  256: 'App icon / Store icon (256×256)',
  512: 'Desktop app icon (512×512)',
};

export type FitMode = 'contain' | 'cover';

export interface ProcessingOptions {
  fit: FitMode;
  padding: number;
  background: string;
}

export interface IconData {
  size: number;
  label: string;
  dataUrl: string;
  format: 'png';
}

export interface ConversionResult {
  icons: IconData[];
  zipDataUrl: string;
  originalName: string;
  originalWidth: number;
  originalHeight: number;
  upscaled: boolean;
}

const DEFAULT_OPTIONS: ProcessingOptions = {
  fit: 'contain',
  padding: 8,
  background: 'transparent',
};

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Failed to encode PNG')),
      'image/png',
    );
  });
}

/**
 * Render without changing the source aspect ratio. Contain adds padding while
 * cover fills the canvas and crops equally from opposing edges.
 */
async function resizeImage(
  img: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetSize: number,
  options: ProcessingOptions,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser');

  ctx.clearRect(0, 0, targetSize, targetSize);
  if (options.background !== 'transparent') {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, targetSize, targetSize);
  }

  const padding = options.fit === 'contain'
    ? Math.round(targetSize * Math.min(Math.max(options.padding, 0), 40) / 100)
    : 0;
  const available = Math.max(1, targetSize - padding * 2);
  const scale = options.fit === 'cover'
    ? Math.max(targetSize / sourceWidth, targetSize / sourceHeight)
    : Math.min(available / sourceWidth, available / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (targetSize - width) / 2, (targetSize - height) / 2, width, height);

  return canvasToBlob(canvas);
}

function writeUint32LE(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

/**
 * Create a standards-compliant ICO containing PNG frames at common Windows
 * icon sizes. In ICO metadata, a zero width/height byte represents 256.
 */
async function generateIco(frames: Array<{ size: number; blob: Blob }>): Promise<Blob> {
  const buffers = await Promise.all(frames.map(({ blob }) => blob.arrayBuffer()));
  const directorySize = 6 + frames.length * 16;
  const payloadSize = buffers.reduce((total, buffer) => total + buffer.byteLength, 0);
  const ico = new Uint8Array(directorySize + payloadSize);

  ico[2] = 1;
  ico[4] = frames.length & 0xff;
  ico[5] = (frames.length >>> 8) & 0xff;

  let payloadOffset = directorySize;
  frames.forEach(({ size }, index) => {
    const entryOffset = 6 + index * 16;
    const buffer = buffers[index];
    const encodedSize = size === 256 ? 0 : size;

    ico[entryOffset] = encodedSize;
    ico[entryOffset + 1] = encodedSize;
    ico[entryOffset + 4] = 1;
    ico[entryOffset + 6] = 32;
    writeUint32LE(ico, entryOffset + 8, buffer.byteLength);
    writeUint32LE(ico, entryOffset + 12, payloadOffset);
    ico.set(new Uint8Array(buffer), payloadOffset);
    payloadOffset += buffer.byteLength;
  });

  return new Blob([ico], { type: 'image/x-icon' });
}

function safeBaseName(filename: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/, '');
  return withoutExtension
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'icon';
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error('This browser could not decode the image. Try PNG, JPG, WebP, or AVIF.');
  }
}

export async function processImage(
  file: File,
  enabledSizes: number[],
  requestedOptions: Partial<ProcessingOptions> = {},
): Promise<ConversionResult> {
  const options = { ...DEFAULT_OPTIONS, ...requestedOptions };
  const sizes = ICON_SIZES.filter((size) => enabledSizes.includes(size));
  if (sizes.length === 0) throw new Error('Select at least one output size.');

  const image = await decodeImage(file);
  const originalWidth = image.width;
  const originalHeight = image.height;
  if (originalWidth < 1 || originalHeight < 1) {
    image.close();
    throw new Error('The image has invalid dimensions.');
  }
  if (originalWidth * originalHeight > MAX_SOURCE_PIXELS) {
    image.close();
    throw new Error('The image dimensions are too large. Use an image under 64 megapixels.');
  }
  const originalName = safeBaseName(file.name);
  const maxRequiredSize = Math.max(...sizes);
  const zip = new JSZip();
  const icons: IconData[] = [];

  try {
    for (const size of sizes) {
      const pngBlob = await resizeImage(image, originalWidth, originalHeight, size, options);
      zip.file(`${originalName}-${size}x${size}.png`, pngBlob);
      icons.push({
        size,
        label: SIZE_LABELS[size],
        dataUrl: URL.createObjectURL(pngBlob),
        format: 'png',
      });
    }

    const icoFrames = await Promise.all(
      ICO_SIZES.map(async (size) => ({
        size,
        blob: await resizeImage(image, originalWidth, originalHeight, size, options),
      })),
    );
    zip.file(`${originalName}.ico`, await generateIco(icoFrames));

    const chromeIconMap = Object.fromEntries(
      sizes
        .filter((size) => size <= 128)
        .map((size) => [String(size), `${originalName}-${size}x${size}.png`]),
    );
    zip.file('chrome-manifest-icons.json', JSON.stringify({
      icons: chromeIconMap,
      action: { default_icon: chromeIconMap },
    }, null, 2));

    zip.file('README.txt', [
      `${originalName} icon bundle`,
      '',
      `Source: ${originalWidth}x${originalHeight}`,
      `Fit: ${options.fit}`,
      `Padding: ${options.fit === 'contain' ? `${options.padding}%` : 'none'}`,
      `Background: ${options.background}`,
      '',
      'Chrome extension: copy the "icons" and "action.default_icon" values',
      'from chrome-manifest-icons.json into your manifest.json.',
      'Windows: use the included multi-resolution .ico file.',
      '',
      'Generated locally by Icon Craft. No image was uploaded.',
    ].join('\r\n'));

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return {
      icons,
      zipDataUrl: URL.createObjectURL(zipBlob),
      originalName,
      originalWidth,
      originalHeight,
      upscaled: originalWidth < maxRequiredSize || originalHeight < maxRequiredSize,
    };
  } catch (error) {
    icons.forEach(({ dataUrl }) => URL.revokeObjectURL(dataUrl));
    throw error;
  } finally {
    image.close();
  }
}

export function releaseConversionResult(result: ConversionResult | null) {
  if (!result) return;
  result.icons.forEach(({ dataUrl }) => URL.revokeObjectURL(dataUrl));
  URL.revokeObjectURL(result.zipDataUrl);
}
