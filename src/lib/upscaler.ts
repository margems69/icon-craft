/**
 * Real-ESRGAN upscaler wrapper.
 * Calls the realesrgan-ncnn-vulkan binary for AI-powered HD upscaling.
 * Falls back to Sharp if the binary is not available (e.g., on Windows without WSL).
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import Sharp from 'sharp';

const execFileAsync = promisify(execFile);

// Binary location relative to project root
const BINARY_PATH = path.join(process.cwd(), 'upscaler', 'realesrgan-ncnn-vulkan');
const MODELS_DIR = path.join(process.cwd(), 'upscaler', 'models');

export async function upscaleWithAI(inputBuffer: Buffer, scale: number = 4): Promise<Buffer> {
  // Check if binary exists
  try {
    await fs.access(BINARY_PATH, fs.constants.X_OK);
  } catch {
    console.log('Real-ESRGAN binary not found, falling back to Sharp upscaling');
    return upscaleWithSharp(inputBuffer, scale);
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'icon-craft-'));
  const inputPath = path.join(tmpDir, 'input.png');
  const outputPath = path.join(tmpDir, 'output.png');

  try {
    // Write input as PNG
    await Sharp(inputBuffer).png().toFile(inputPath);

    // Select model based on scale
    let modelName = 'realesrgan-x4plus';
    if (scale === 2) modelName = 'realesr-animevideov3-x2';
    else if (scale === 3) modelName = 'realesr-animevideov3-x3';

    // Run realesrgan-ncnn-vulkan
    await execFileAsync(BINARY_PATH, [
      '-i', inputPath,
      '-o', outputPath,
      '-s', String(scale),
      '-n', modelName,
      '-m', MODELS_DIR,
    ], { timeout: 60000 });

    // Read output
    const outputBuffer = await fs.readFile(outputPath);
    return outputBuffer;

  } catch (error) {
    console.error('Real-ESRGAN failed:', error);
    // Fall back to Sharp
    return upscaleWithSharp(inputBuffer, scale);
  } finally {
    // Clean up temp files
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

/**
 * Sharp-based smart upscaling as fallback.
 * Uses 2-pass Lanczos3 + aggressive sharpen for quality.
 */
async function upscaleWithSharp(inputBuffer: Buffer, scale: number): Promise<Buffer> {
  const metadata = await Sharp(inputBuffer).metadata();
  const w = metadata.width || 0;
  const h = metadata.height || 0;

  // First pass: upscale 2x
  const intermediate = await Sharp(inputBuffer)
    .resize(Math.round(w * 2), Math.round(h * 2), {
      kernel: 'lanczos3',
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // Second pass: scale to target with sharpening
  const targetW = Math.round(w * scale);
  const targetH = Math.round(h * scale);

  return await Sharp(intermediate)
    .resize(targetW, targetH, {
      kernel: 'lanczos3',
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .sharpen({
      sigma: 1.2,
      m1: 0.5,
      m2: 2.0,
      x1: 0,
      y1: 0,
      y2: 10,
      x2: 1,
    })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}
