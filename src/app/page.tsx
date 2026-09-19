'use client';
/* eslint-disable @next/next/no-img-element -- previews are runtime-generated Blob URLs */

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  processImage,
  releaseConversionResult,
  type ConversionResult,
  type FitMode,
  type IconShape,
  type IconData,
} from '@/lib/clientIconProcessor';

const FORMATS = ['PNG', 'JPG', 'WebP', 'AVIF', 'BMP', 'GIF', 'SVG'];

const ICON_SIZES = [
  { size: 16, label: 'Browser favicon & toolbar', badge: '16px' },
  { size: 32, label: 'Retina extension icon', badge: '32px' },
  { size: 48, label: 'Extension management page', badge: '48px' },
  { size: 128, label: 'Chrome Web Store & install', badge: '128px' },
  { size: 256, label: 'Store listing & app icon', badge: '256px' },
  { size: 512, label: 'Desktop app & high-res splash', badge: '512px' },
];

const PRESET_BUNDLES = [
  { label: 'Chrome Extension', sizes: [16, 32, 48, 128], icon: '🧩' },
  { label: 'Web & Favicons', sizes: [16, 32, 48], icon: '🌐' },
  { label: 'App & Desktop', sizes: [128, 256, 512], icon: '💻' },
  { label: 'Full Suite', sizes: [16, 32, 48, 128, 256, 512], icon: '📦' },
];

const COLOR_PALETTE = [
  { label: 'Transparent', value: 'transparent', bg: 'transparent' },
  { label: 'Pure White', value: '#ffffff', bg: '#ffffff' },
  { label: 'Slate 900', value: '#0f172a', bg: '#0f172a' },
  { label: 'Indigo', value: '#4f46e5', bg: '#4f46e5' },
  { label: 'Emerald', value: '#059669', bg: '#059669' },
  { label: 'Rose', value: '#e11d48', bg: '#e11d48' },
  { label: 'Amber', value: '#d97706', bg: '#d97706' },
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<IconData | null>(null);
  const [history, setHistory] = useState<{ name: string; sizes: number; date: string }[]>([]);
  const [enabledSizes, setEnabledSizes] = useState<number[]>([16, 32, 48, 128, 256, 512]);
  
  // Customization Options
  const [fit, setFit] = useState<FitMode>('contain');
  const [padding, setPadding] = useState(8);
  const [background, setBackground] = useState('transparent');
  const [customColor, setCustomColor] = useState('#4f46e5');
  const [shape, setShape] = useState<IconShape>('square');
  const [borderRadius, setBorderRadius] = useState(22);
  
  // Workbench UI state
  const [previewTab, setPreviewTab] = useState<'canvas' | 'browser' | 'toolbar' | 'dock'>('canvas');
  const [resultTab, setResultTab] = useState<'icons' | 'manifest'>('icons');
  const [showGuides, setShowGuides] = useState(true);
  const [copiedManifest, setCopiedManifest] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const resultRef = useRef<ConversionResult | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem('icon-craft-history');
        if (saved) setHistory(JSON.parse(saved));
      } catch {
        localStorage.removeItem('icon-craft-history');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    releaseConversionResult(resultRef.current);
  }, []);

  const handleFile = useCallback((nextFile: File) => {
    setError(null);
    setResult(null);
    setSelected(null);
    releaseConversionResult(resultRef.current);
    resultRef.current = null;
    const valid = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/bmp', 'image/gif', 'image/svg+xml'];
    if (!valid.includes(nextFile.type) && !nextFile.name.endsWith('.svg')) {
      setError('Unsupported format. Please choose a PNG, JPG, WebP, AVIF, BMP, GIF, or SVG file.');
      return;
    }
    if (nextFile.size > 20 * 1024 * 1024) {
      setError('File is too large — maximum limit is 20 MB.');
      return;
    }
    setFile(nextFile);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const previewUrl = URL.createObjectURL(nextFile);
    previewRef.current = previewUrl;
    setPreview(previewUrl);
  }, []);

  const convert = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      releaseConversionResult(resultRef.current);
      const data = await processImage(file, enabledSizes, {
        fit,
        padding,
        background,
        shape,
        borderRadius,
      });
      resultRef.current = data;
      setResult(data);
      setSelected(data.icons[0]);
      const entry = {
        name: data.originalName,
        sizes: data.icons.length,
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      };
      const updated = [entry, ...history.filter(item => item.name !== entry.name)].slice(0, 20);
      setHistory(updated);
      localStorage.setItem('icon-craft-history', JSON.stringify(updated));
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Icon generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const downloadIcon = (icon: IconData) => {
    const link = document.createElement('a');
    link.href = icon.dataUrl;
    link.download = `${file?.name.replace(/\.[^.]+$/, '') || 'icon'}-${icon.size}x${icon.size}.png`;
    link.click();
  };

  const downloadZip = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.zipDataUrl;
    link.download = `${result.originalName}-icons.zip`;
    link.click();
  };

  const reset = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    releaseConversionResult(resultRef.current);
    resultRef.current = null;
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setSelected(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const toggleSize = (size: number) => {
    setEnabledSizes(current =>
      current.includes(size)
        ? current.filter(item => item !== size)
        : [...current, size].sort((a, b) => a - b)
    );
  };

  const applyPreset = (sizes: number[]) => {
    setEnabledSizes(sizes);
  };

  const fileSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  // Compute live shape mask style
  const getShapeStyle = () => {
    if (shape === 'circle') return { borderRadius: '50%' };
    if (shape === 'rounded') return { borderRadius: `${borderRadius}%` };
    return { borderRadius: '0px' };
  };

  // Manifest JSON representation
  const getManifestJson = () => {
    const name = file ? file.name.replace(/\.[^.]+$/, '') : 'icon';
    const iconObj = Object.fromEntries(
      enabledSizes.map(s => [String(s), `${name}-${s}x${s}.png`])
    );
    return JSON.stringify(
      {
        manifest_version: 3,
        name: name,
        version: '1.0.0',
        icons: iconObj,
        action: {
          default_icon: iconObj,
        },
      },
      null,
      2
    );
  };

  const copyManifest = () => {
    navigator.clipboard.writeText(getManifestJson());
    setCopiedManifest(true);
    setTimeout(() => setCopiedManifest(false), 2000);
  };

  return (
    <div className="app-shell min-h-screen text-slate-900 flex flex-col">
      {/* Top Studio Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3.5">
            <Link href="/" className="brand-mark focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="IconCraft Home">
              <span /><span /><span />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900">IconCraft</span>
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">Studio</span>
              </div>
              <p className="text-xs text-slate-500">Asset converter & multi-platform packager</p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link href="/history" className="ghost-button">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>History</span>
              {history.length > 0 && (
                <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
                  {history.length}
                </span>
              )}
            </Link>

            {file && (
              <button onClick={reset} className="ghost-button text-slate-600 hover:text-red-600">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                <span>Clear</span>
              </button>
            )}

            {result && (
              <button onClick={downloadZip} className="primary-button compact">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                <span>Export ZIP Pack</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Studio Grid */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Left Controls Column */}
          <aside className="space-y-5">
            {/* Step 1: Artwork Source */}
            <section className="panel p-5">
              <div className="mb-3.5 flex items-center justify-between">
                <div>
                  <span className="eyebrow">01 · Artwork Source</span>
                  <h2 className="text-sm font-bold text-slate-900">Upload Logo or Icon</h2>
                </div>
                {file && <span className="status-pill"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"/> Ready</span>}
              </div>

              <div
                role="button"
                tabIndex={0}
                aria-label="Upload artwork"
                className={`upload-zone ${dragOver ? 'is-dragging' : ''} ${preview ? 'has-file' : ''}`}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) handleFile(dropped);
                }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileRef.current?.click();
                  }
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.avif,.bmp,.gif,.svg"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                {preview ? (
                  <div className="flex w-full items-center gap-3.5 text-left">
                    <div className="checker-frame h-16 w-16 shrink-0 rounded-xl border border-slate-200">
                      <img src={preview || undefined} alt="Uploaded logo preview" className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900">{file?.name}</p>
                      <p className="text-[11px] text-slate-500">{file && fileSize(file.size)}</p>
                      <span className="mt-1.5 inline-flex text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                        Replace artwork →
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="upload-icon mx-auto">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-900">Drop image here or click to browse</p>
                    <p className="mt-1 text-[11px] text-slate-500">Supports PNG, SVG, JPG, WebP up to 20MB</p>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {FORMATS.map(fmt => (
                  <span key={fmt} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    {fmt}
                  </span>
                ))}
              </div>
            </section>

            {/* Step 2: Customization Studio */}
            <section className="panel p-5">
              <span className="eyebrow">02 · Studio Controls</span>
              <h2 className="mt-1 text-sm font-bold text-slate-900">Style & Format</h2>

              <div className="mt-4 space-y-4">
                {/* Platform Presets */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-2">Preset Bundles</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRESET_BUNDLES.map(b => (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() => applyPreset(b.sizes)}
                        className={`flex items-center gap-1.5 rounded-lg border p-2 text-left text-xs transition ${
                          b.sizes.every(s => enabledSizes.includes(s)) && b.sizes.length === enabledSizes.length
                            ? 'border-indigo-500 bg-indigo-50/60 font-semibold text-indigo-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-sm">{b.icon}</span>
                        <span className="truncate">{b.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Sizes */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-600">Export Sizes ({enabledSizes.length})</label>
                    <button
                      type="button"
                      onClick={() =>
                        setEnabledSizes(
                          enabledSizes.length === ICON_SIZES.length ? [] : ICON_SIZES.map(s => s.size)
                        )
                      }
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      {enabledSizes.length === ICON_SIZES.length ? 'Clear all' : 'Select all'}
                    </button>
                  </div>
                  <div className="size-grid">
                    {ICON_SIZES.map(({ size, badge }) => (
                      <button
                        type="button"
                        key={size}
                        onClick={() => toggleSize(size)}
                        className={`size-chip ${enabledSizes.includes(size) ? 'selected' : ''}`}
                      >
                        {size}<span>px</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shape Masking */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-2">Icon Shape</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShape('square')}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs gap-1 transition ${
                        shape === 'square'
                          ? 'border-indigo-500 bg-indigo-50/60 font-bold text-indigo-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-5 h-5 border-2 border-current rounded-none" />
                      <span>Square</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShape('rounded')}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs gap-1 transition ${
                        shape === 'rounded'
                          ? 'border-indigo-500 bg-indigo-50/60 font-bold text-indigo-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-5 h-5 border-2 border-current rounded-md" />
                      <span>Squircle</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShape('circle')}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs gap-1 transition ${
                        shape === 'circle'
                          ? 'border-indigo-500 bg-indigo-50/60 font-bold text-indigo-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-5 h-5 border-2 border-current rounded-full" />
                      <span>Circle</span>
                    </button>
                  </div>

                  {shape === 'rounded' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
                        <span>Corner Radius</span>
                        <span className="text-indigo-600 font-bold">{borderRadius}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="40"
                        value={borderRadius}
                        onChange={e => setBorderRadius(Number(e.target.value))}
                        className="range-control"
                      />
                    </div>
                  )}
                </div>

                {/* Fit Mode */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Image Fit</label>
                  <div className="segmented">
                    <button
                      type="button"
                      className={fit === 'contain' ? 'active' : ''}
                      onClick={() => setFit('contain')}
                    >
                      Contain (Padded)
                    </button>
                    <button
                      type="button"
                      className={fit === 'cover' ? 'active' : ''}
                      onClick={() => setFit('cover')}
                    >
                      Cover (Bleed)
                    </button>
                  </div>
                </div>

                {/* Padding Slider */}
                {fit === 'contain' && (
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
                      <span>Safe Padding</span>
                      <span className="text-indigo-600 font-bold">{padding}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="35"
                      value={padding}
                      onChange={e => setPadding(Number(e.target.value))}
                      className="range-control"
                    />
                  </div>
                )}

                {/* Canvas Background */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-600">Canvas Background</label>
                    <span className="text-[11px] font-mono text-slate-500 uppercase">{background}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COLOR_PALETTE.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        title={c.label}
                        onClick={() => setBackground(c.value)}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition ${
                          background === c.value
                            ? 'ring-2 ring-indigo-500 ring-offset-2 border-slate-400'
                            : 'border-slate-300 hover:scale-105'
                        }`}
                        style={{
                          backgroundColor: c.value === 'transparent' ? '#ffffff' : c.value,
                          backgroundImage: c.value === 'transparent' ? 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)' : undefined,
                          backgroundSize: '8px 8px',
                        }}
                      />
                    ))}

                    {/* Custom Color Input */}
                    <label
                      title="Pick custom color"
                      className={`w-7 h-7 rounded-lg border cursor-pointer flex items-center justify-center overflow-hidden transition relative ${
                        !COLOR_PALETTE.some(c => c.value === background)
                          ? 'ring-2 ring-indigo-500 ring-offset-2 border-indigo-400'
                          : 'border-slate-300'
                      }`}
                      style={{ backgroundColor: customColor }}
                    >
                      <input
                        type="color"
                        value={customColor}
                        onChange={e => {
                          setCustomColor(e.target.value);
                          setBackground(e.target.value);
                        }}
                        className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                      />
                      <span className="text-[10px] font-bold text-white drop-shadow-md">🎨</span>
                    </label>
                  </div>
                </div>
              </div>

              {error && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* Generate CTA */}
              <button
                onClick={convert}
                disabled={!file || loading || enabledSizes.length === 0}
                className="primary-button mt-5 w-full justify-center text-sm font-bold shadow-indigo-500/20"
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    <span>Rendering {enabledSizes.length} icons…</span>
                  </>
                ) : (
                  <>
                    <span>Generate {enabledSizes.length} Icons</span>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                  </>
                )}
              </button>
            </section>
          </aside>

          {/* Right Main Stage: Live Workbench & Mockups */}
          <main className="min-w-0">
            {!file ? (
              /* Hero Empty State */
              <section className="panel flex flex-col items-center justify-center p-8 sm:p-14 text-center min-h-[560px]">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm mb-6">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 mb-4">
                  <span>⚡ 100% In-Browser</span> · <span>Zero Server Uploads</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 max-w-lg">
                  Instant Icon Studio for Extensions, Apps & Web
                </h1>
                <p className="mt-3 text-sm sm:text-base text-slate-500 max-w-md">
                  Turn logos and vector graphics into multi-resolution icon packages, Windows `.ico` bundles, and Chrome extension manifests in seconds.
                </p>

                <button
                  onClick={() => fileRef.current?.click()}
                  className="primary-button mt-8 text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m-8-8h16"/></svg>
                  <span>Select Artwork to Begin</span>
                </button>

                <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left w-full max-w-2xl">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
                    <span className="text-xs font-bold text-indigo-600">01 · Client-Side</span>
                    <p className="mt-1 text-xs font-bold text-slate-800">Private & Fast</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Processed locally with HTML5 canvas. No files leave your device.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
                    <span className="text-xs font-bold text-indigo-600">02 · Multi-Platform</span>
                    <p className="mt-1 text-xs font-bold text-slate-800">PNG + ICO + Manifest</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Includes ready-to-use manifest.json and multi-size Windows icon.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
                    <span className="text-xs font-bold text-indigo-600">03 · Device Mockups</span>
                    <p className="mt-1 text-xs font-bold text-slate-800">Realistic Previews</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Test how your icon looks in browser tabs, toolbars, and dock trays.</p>
                  </div>
                </div>
              </section>
            ) : !result ? (
              /* Live Interactive Preview Workbench */
              <section className="panel p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <span className="eyebrow">Real-Time Studio Workbench</span>
                    <h2 className="text-lg font-bold text-slate-900">Live Preview & Context</h2>
                  </div>

                  {/* Mockup Tab Switcher */}
                  <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('canvas')}
                      className={`tab-pill ${previewTab === 'canvas' ? 'active' : ''}`}
                    >
                      🎨 Canvas
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('browser')}
                      className={`tab-pill ${previewTab === 'browser' ? 'active' : ''}`}
                    >
                      🌐 Browser Tab
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('toolbar')}
                      className={`tab-pill ${previewTab === 'toolbar' ? 'active' : ''}`}
                    >
                      🧩 Extension
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('dock')}
                      className={`tab-pill ${previewTab === 'dock' ? 'active' : ''}`}
                    >
                      📱 Dock
                    </button>
                  </div>
                </div>

                {/* Tab 1: Studio Canvas View */}
                {previewTab === 'canvas' && (
                  <div className="py-8 flex flex-col items-center justify-center">
                    <div className="relative">
                      {/* Live Canvas Viewport */}
                      <div
                        className="w-72 h-72 sm:w-80 sm:h-80 shadow-2xl overflow-hidden relative flex items-center justify-center transition-all duration-200"
                        style={{
                          ...getShapeStyle(),
                          backgroundColor: background === 'transparent' ? '#ffffff' : background,
                          backgroundImage:
                            background === 'transparent'
                              ? 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)'
                              : undefined,
                          backgroundSize: '16px 16px',
                          border: '1px solid rgba(203, 213, 225, 0.6)',
                        }}
                      >
                        {/* Safe Area Guide Overlay */}
                        {showGuides && fit === 'contain' && padding > 0 && (
                          <div
                            className="absolute pointer-events-none border border-dashed border-indigo-400/40 rounded transition-all"
                            style={{
                              inset: `${padding}%`,
                            }}
                          />
                        )}

                        {/* Centered Image */}
                        <div
                          className="w-full h-full flex items-center justify-center transition-all"
                          style={{
                            padding: fit === 'contain' ? `${padding}%` : '0%',
                          }}
                        >
                          <img
                            src={preview || undefined}
                            alt="Live icon canvas preview"
                            className={`w-full h-full ${
                              fit === 'contain' ? 'object-contain' : 'object-cover'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Dimension Badge */}
                      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md">
                        512 × 512 Master Canvas
                      </span>
                    </div>

                    {/* Canvas Controls Bar */}
                    <div className="mt-8 flex items-center gap-4 text-xs text-slate-500">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showGuides}
                          onChange={e => setShowGuides(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Show safe-area guides</span>
                      </label>
                      <span>·</span>
                      <span>Shape: <strong className="text-slate-700 capitalize">{shape}</strong></span>
                      <span>·</span>
                      <span>Fit: <strong className="text-slate-700 capitalize">{fit}</strong></span>
                    </div>
                  </div>
                )}

                {/* Tab 2: Realistic Browser Tab Mockup */}
                {previewTab === 'browser' && (
                  <div className="py-6 max-w-xl mx-auto">
                    <div className="browser-mockup">
                      <div className="browser-header">
                        <div className="browser-dots">
                          <div className="browser-dot bg-red-400" />
                          <div className="browser-dot bg-amber-400" />
                          <div className="browser-dot bg-emerald-400" />
                        </div>
                        {/* Tab with live icon */}
                        <div className="browser-tab">
                          <div
                            className="w-4 h-4 overflow-hidden shrink-0 flex items-center justify-center"
                            style={{
                              ...getShapeStyle(),
                              backgroundColor: background === 'transparent' ? 'transparent' : background,
                            }}
                          >
                            <img src={preview || undefined} alt="Favicon preview" className="w-full h-full object-contain" />
                          </div>
                          <span className="truncate max-w-[120px]">
                            {file?.name.replace(/\.[^.]+$/, '') || 'IconCraft'} · App
                          </span>
                          <span className="text-slate-400 hover:text-slate-600 cursor-pointer">×</span>
                        </div>
                      </div>
                      <div className="chrome-toolbar">
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                          <span>←</span><span>→</span><span>↻</span>
                        </div>
                        <div className="chrome-omnibox">
                          <span className="text-emerald-600">🔒</span>
                          <span className="text-slate-700 font-medium">https://myapp.io</span>
                          <span className="text-slate-400">/dashboard</span>
                        </div>
                      </div>
                      <div className="p-8 bg-slate-50 flex flex-col items-center justify-center text-center min-h-[180px]">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Browser Tab Preview</p>
                        <p className="text-sm font-bold text-slate-700 mt-1">Look at the tab bar above</p>
                        <p className="text-xs text-slate-500 mt-1">This accurately renders your 16px and 32px favicon inside an active tab.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Chrome Extension Toolbar Mockup */}
                {previewTab === 'toolbar' && (
                  <div className="py-6 max-w-xl mx-auto">
                    <div className="browser-mockup">
                      <div className="browser-header">
                        <div className="browser-dots">
                          <div className="browser-dot bg-red-400" />
                          <div className="browser-dot bg-amber-400" />
                          <div className="browser-dot bg-emerald-400" />
                        </div>
                        <div className="browser-tab">
                          <span>Chrome Extensions</span>
                        </div>
                      </div>
                      <div className="chrome-toolbar">
                        <div className="chrome-omnibox">
                          <span>🔍</span>
                          <span className="text-slate-600">chrome://extensions</span>
                        </div>
                        {/* Extension icons area */}
                        <div className="flex items-center gap-3 pl-2">
                          <span className="text-slate-400 cursor-pointer" title="Extensions Menu">🧩</span>
                          {/* Active pinned extension icon */}
                          <div
                            className="w-6 h-6 p-0.5 rounded shadow-sm border border-slate-200 cursor-pointer hover:bg-slate-100 transition flex items-center justify-center"
                            style={{
                              ...getShapeStyle(),
                              backgroundColor: background === 'transparent' ? 'transparent' : background,
                            }}
                            title={`${file?.name} extension`}
                          >
                            <img src={preview || undefined} alt="Extension action icon preview" className="w-full h-full object-contain" />
                          </div>
                        </div>
                      </div>
                      <div className="p-8 bg-slate-50 flex flex-col items-center justify-center text-center min-h-[180px]">
                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Chrome Toolbar Icon</p>
                        <p className="text-sm font-bold text-slate-700 mt-1">Pinned Action Button</p>
                        <p className="text-xs text-slate-500 mt-1">Shows how users will interact with your Chrome extension in the browser header.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 4: App Dock Mockup */}
                {previewTab === 'dock' && (
                  <div className="py-6 max-w-xl mx-auto">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 p-8 text-center min-h-[260px] flex flex-col items-center justify-end">
                      <div className="mb-8 text-slate-300">
                        <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Dock & Home Screen View</p>
                        <p className="text-sm font-bold text-white mt-0.5">Desktop & Mobile Icon Context</p>
                      </div>

                      {/* Dock Shelf */}
                      <div className="flex items-center gap-4 bg-white/15 backdrop-blur-xl border border-white/20 p-2.5 px-4 rounded-2xl shadow-2xl">
                        <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white text-lg shadow">📁</div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-lg shadow">💬</div>
                        
                        {/* Custom Crafted App Icon */}
                        <div className="flex flex-col items-center group cursor-pointer">
                          <div
                            className="w-12 h-12 overflow-hidden flex items-center justify-center shadow-lg transition transform group-hover:-translate-y-1"
                            style={{
                              ...getShapeStyle(),
                              backgroundColor: background === 'transparent' ? '#ffffff' : background,
                            }}
                          >
                            <img src={preview || undefined} alt="Dock app icon" className="w-full h-full object-contain p-1" />
                          </div>
                          <span className="text-[10px] font-bold text-white drop-shadow mt-1">
                            {file?.name.replace(/\.[^.]+$/, '').slice(0, 10)}
                          </span>
                        </div>

                        <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center text-white text-lg shadow">⚙️</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Footer */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Ready to export <strong>{enabledSizes.length} sizes</strong> + multi-resolution Windows <strong>.ico</strong> bundle.
                  </div>
                  <button
                    onClick={convert}
                    disabled={loading || enabledSizes.length === 0}
                    className="primary-button compact w-full sm:w-auto"
                  >
                    <span>Generate Icon Package</span>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                  </button>
                </div>
              </section>
            ) : (
              /* Generated Results Stage */
              <section className="panel p-5 sm:p-7">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
                  <div>
                    <span className="eyebrow">Export Ready</span>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Your Icon Pack is Ready</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {result.originalName} · Source: {result.originalWidth} × {result.originalHeight}px
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setResultTab('icons')}
                      className={`tab-pill ${resultTab === 'icons' ? 'active' : ''}`}
                    >
                      Icon Assets ({result.icons.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultTab('manifest')}
                      className={`tab-pill ${resultTab === 'manifest' ? 'active' : ''}`}
                    >
                      manifest.json
                    </button>
                    <button onClick={downloadZip} className="primary-button compact ml-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                      <span>Download ZIP</span>
                    </button>
                  </div>
                </div>

                {/* Results Tab 1: Icon Cards Grid */}
                {resultTab === 'icons' && (
                  <>
                    <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                      {result.icons.map(icon => (
                        <article
                          key={icon.size}
                          role="button"
                          tabIndex={0}
                          aria-pressed={selected?.size === icon.size}
                          onClick={() => setSelected(icon)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelected(icon);
                            }
                          }}
                          className={`icon-card group ${selected?.size === icon.size ? 'selected' : ''}`}
                        >
                          <div className="checker-frame h-44 border-b border-slate-100 p-4">
                            <img
                              src={icon.dataUrl}
                              alt={`${icon.size} by ${icon.size} icon`}
                              className="object-contain transition-transform group-hover:scale-105"
                              style={{
                                width: Math.min(icon.size, 120),
                                height: Math.min(icon.size, 120),
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between p-3">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900">{icon.size} × {icon.size} px</p>
                              <p className="truncate text-[10px] text-slate-500">{icon.label}</p>
                            </div>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                downloadIcon(icon);
                              }}
                              title={`Download ${icon.size}x${icon.size} PNG`}
                              className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white transition flex items-center justify-center shrink-0"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>

                    {/* Export Banner */}
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Includes Windows .ICO & Chrome Manifest</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          ZIP bundle contains all PNG files, multi-frame {result.originalName}.ico, and README guide.
                        </p>
                      </div>
                      <button onClick={downloadZip} className="primary-button compact shrink-0">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        <span>Download Full Package</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Results Tab 2: Chrome Manifest Viewer */}
                {resultTab === 'manifest' && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Chrome Extension manifest.json snippet</h3>
                        <p className="text-xs text-slate-500">Paste this directly into your extension manifest</p>
                      </div>
                      <button
                        onClick={copyManifest}
                        className="ghost-button border border-slate-200 bg-white"
                      >
                        {copiedManifest ? (
                          <>
                            <span className="text-emerald-600">✓</span>
                            <span className="text-emerald-600 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
                      {getManifestJson()}
                    </pre>
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white/60 py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>IconCraft Studio · High-resolution client icon generator</span>
          <span className="text-slate-400">Your artwork never leaves your browser</span>
        </div>
      </footer>
    </div>
  );
}
