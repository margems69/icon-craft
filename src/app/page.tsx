'use client';
/* eslint-disable @next/next/no-img-element -- previews are runtime-generated Blob URLs */

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  processImage,
  releaseConversionResult,
  type ConversionResult,
  type FitMode,
  type IconData,
} from '@/lib/clientIconProcessor';

const FORMATS = ['PNG', 'JPG', 'WebP', 'AVIF', 'BMP', 'GIF'];
const ICON_SIZES = [
  { size: 16, label: 'Toolbar' },
  { size: 32, label: 'Extension details' },
  { size: 48, label: 'Management' },
  { size: 128, label: 'Chrome Web Store' },
  { size: 256, label: 'App icon' },
  { size: 512, label: 'Desktop app' },
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<IconData | null>(null);
  const [history, setHistory] = useState<{name:string;sizes:number;date:string}[]>([]);
  const [enabledSizes, setEnabledSizes] = useState<number[]>([16,32,48,128,256,512]);
  const [fit, setFit] = useState<FitMode>('contain');
  const [padding, setPadding] = useState(8);
  const [background, setBackground] = useState('transparent');
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
    const valid = ['image/png','image/jpeg','image/webp','image/avif','image/bmp','image/gif'];
    if (!valid.includes(nextFile.type)) {
      setError('Unsupported format. Try PNG, JPG, WebP, AVIF, BMP, or GIF.');
      return;
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      setError('File too large — maximum size is 10 MB.');
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
      const data = await processImage(file, enabledSizes, { fit, padding, background });
      resultRef.current = data;
      setResult(data);
      setSelected(data.icons[0]);
      const entry = { name: data.originalName, sizes: data.icons.length, date: new Date().toLocaleDateString() };
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
    link.download = `${file?.name.replace(/\.[^.]+$/,'') || 'icon'}-${icon.size}x${icon.size}.png`;
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
    setEnabledSizes(current => current.includes(size)
      ? current.filter(item => item !== size)
      : [...current, size].sort((a,b) => a-b));
  };

  const fileSize = (bytes: number) => bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="app-shell min-h-dvh text-slate-900">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-[#f8f7f4]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[1480px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="brand-mark" aria-hidden="true"><span/><span/><span/></div>
            <div>
              <p className="text-[15px] font-bold tracking-[-0.02em]">IconCraft</p>
              <p className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:block">Asset studio</p>
            </div>
          </div>
          <nav className="flex items-center gap-1.5" aria-label="Primary navigation">
            <Link href="/history" className="ghost-button">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5M12 7v5l3 2"/></svg>
              <span className="hidden sm:inline">History</span>
            </Link>
            <button onClick={reset} className="ghost-button">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
              <span>New project</span>
            </button>
            {result && <button onClick={downloadZip} className="primary-button compact"><span>Export all</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"/></svg></button>}
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1480px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_280px]">
        <aside className="space-y-4">
          <section className="panel p-5">
            <div className="mb-4 flex items-start justify-between">
              <div><span className="eyebrow">01 · Source</span><h2 className="mt-1 text-lg font-bold tracking-[-0.03em]">Choose your artwork</h2></div>
              {file && <span className="status-pill">Ready</span>}
            </div>
            <div role="button" tabIndex={0} aria-label="Choose an image to convert"
              className={`upload-zone ${dragOver ? 'is-dragging' : ''} ${preview ? 'has-file' : ''}`}
              onDrop={event => { event.preventDefault(); setDragOver(false); const dropped = event.dataTransfer.files?.[0]; if (dropped) handleFile(dropped); }}
              onDragOver={event => { event.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileRef.current?.click(); } }}>
              <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp,.avif,.bmp,.gif" className="hidden" onChange={event => event.target.files?.[0] && handleFile(event.target.files[0])}/>
              {preview ? (
                <div className="relative z-10 flex w-full items-center gap-4 text-left">
                  <div className="checker-frame h-20 w-20 shrink-0 rounded-2xl"><img src={preview} alt="Uploaded artwork preview" className="h-full w-full object-contain"/></div>
                  <div className="min-w-0"><p className="truncate text-sm font-bold">{file?.name}</p><p className="mt-1 text-xs text-slate-500">{file && fileSize(file.size)}</p><span className="mt-3 inline-flex text-xs font-bold text-violet-700">Replace image →</span></div>
                </div>
              ) : (
                <div className="relative z-10">
                  <div className="upload-icon mx-auto"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L8 8m4-4 4 4M5 15v4h14v-4"/></svg></div>
                  <p className="mt-4 text-sm font-bold">Drop an image here</p><p className="mt-1 text-xs leading-5 text-slate-500">or click to browse · up to 10 MB</p>
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">{FORMATS.map(format => <span key={format} className="format-pill">{format}</span>)}</div>
          </section>

          <section className="panel p-5">
            <span className="eyebrow">02 · Customize</span>
            <div className="mt-4 space-y-5">
              <div>
                <div className="mb-2.5 flex items-center justify-between"><label className="field-label">Output sizes</label><button type="button" className="text-[11px] font-bold text-violet-700" onClick={() => setEnabledSizes(enabledSizes.length === ICON_SIZES.length ? [] : ICON_SIZES.map(item => item.size))}>{enabledSizes.length === ICON_SIZES.length ? 'Clear' : 'Select all'}</button></div>
                <div className="size-grid">{ICON_SIZES.map(({size}) => <button type="button" key={size} onClick={() => toggleSize(size)} className={`size-chip ${enabledSizes.includes(size) ? 'selected' : ''}`} aria-pressed={enabledSizes.includes(size)}>{size}<span>px</span></button>)}</div>
              </div>
              <div>
                <span className="field-label">Image fit</span>
                <div className="segmented mt-2"><button type="button" className={fit === 'contain' ? 'active' : ''} onClick={() => setFit('contain')}>Contain</button><button type="button" className={fit === 'cover' ? 'active' : ''} onClick={() => setFit('cover')}>Cover</button></div>
              </div>
              {fit === 'contain' && <div><label htmlFor="padding" className="mb-2 flex justify-between text-xs font-semibold text-slate-600"><span>Safe padding</span><span className="rounded-md bg-violet-50 px-2 py-0.5 text-violet-700">{padding}%</span></label><input id="padding" type="range" min="0" max="30" value={padding} onChange={event => setPadding(Number(event.target.value))} className="range-control"/></div>}
              <div><label htmlFor="background" className="field-label">Canvas</label><select id="background" value={background} onChange={event => setBackground(event.target.value)} className="select-control mt-2"><option value="transparent">Transparent</option><option value="#ffffff">White</option><option value="#000000">Black</option></select></div>
            </div>
            {error && <div role="alert" aria-live="assertive" className="error-card mt-4">{error}</div>}
            <button onClick={convert} disabled={!file || loading || enabledSizes.length === 0} className="primary-button mt-5 w-full justify-center">
              {loading ? <><span className="spinner"/>Crafting your icons…</> : <><span>Generate {enabledSizes.length || ''} icons</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></>}
            </button>
          </section>
        </aside>

        <main className="min-w-0">
          {!result ? (
            <section className="hero-stage panel">
              <div className="orb orb-one"/><div className="orb orb-two"/>
              <div className="relative z-10 mx-auto max-w-2xl px-6 py-14 text-center sm:py-20">
                <span className="hero-badge"><span>✦</span> Private, local & fast</span>
                <h1 className="mt-6 text-balance text-4xl font-black leading-[1.03] tracking-[-0.055em] text-slate-950 sm:text-6xl">One logo.<br/><span className="gradient-text">Every icon you need.</span></h1>
                <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-slate-500 sm:text-base">Turn your artwork into a polished, platform-ready icon set in seconds. Nothing leaves your browser.</p>
                <button onClick={() => fileRef.current?.click()} className="primary-button mx-auto mt-8">Choose your image <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></button>
                <div className="mt-12 grid gap-3 text-left sm:grid-cols-3">
                  {[['01','Upload','PNG, JPG, WebP & more'],['02','Fine-tune','Fit, padding & background'],['03','Export','Six sizes in one ZIP']].map(([number,title,copy]) => <div className="step-card" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></div>)}
                </div>
                {history.length > 0 && <div className="mt-8 flex flex-wrap items-center justify-center gap-2"><span className="text-xs font-semibold text-slate-400">Recent:</span>{history.slice(0,3).map((item,index) => <span className="recent-pill" key={`${item.name}-${index}`}>{item.name}</span>)}</div>}
              </div>
            </section>
          ) : (
            <section className="panel min-h-full p-5 sm:p-7">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end">
                <div><span className="eyebrow">Your icon set</span><h1 className="mt-1 text-2xl font-black tracking-[-0.04em]">Ready to ship.</h1><p className="mt-1 text-sm text-slate-500">{result.originalName} · {result.originalWidth} × {result.originalHeight}</p></div>
                <div className="flex items-center gap-2"><span className="success-pill"><span/>{result.icons.length} assets generated</span>{result.upscaled && <span className="upscale-pill">AI upscaled</span>}</div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                {result.icons.map(icon => (
                  <article key={icon.size} role="button" tabIndex={0} aria-pressed={selected?.size === icon.size} onClick={() => setSelected(icon)} onKeyDown={event => { if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(icon); } }} className={`icon-card group ${selected?.size === icon.size ? 'selected' : ''}`}>
                    <div className="checker-frame icon-canvas"><img src={icon.dataUrl} alt={`${icon.size} by ${icon.size} icon`} className="object-contain" style={{width: Math.min(icon.size,150),height: Math.min(icon.size,150)}}/></div>
                    <div className="flex items-center justify-between gap-2 p-3.5"><div className="min-w-0"><p className="font-bold tracking-[-0.02em]">{icon.size} × {icon.size}</p><p className="truncate text-[11px] text-slate-400">{ICON_SIZES.find(item => item.size === icon.size)?.label}</p></div><button className="download-icon" aria-label={`Download ${icon.size} pixel icon`} onClick={event => {event.stopPropagation(); downloadIcon(icon);}}><svg viewBox="0 0 24 24"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14"/></svg></button></div>
                  </article>
                ))}
              </div>
              <div className="export-banner mt-6"><div><p className="text-sm font-bold">Your complete icon pack is ready</p><p className="mt-0.5 text-xs text-slate-500">Every selected size, bundled as optimized PNG files.</p></div><button onClick={downloadZip} className="primary-button compact">Download ZIP <svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/></svg></button></div>
            </section>
          )}
        </main>

        <aside className="hidden xl:block">
          <section className="panel sticky top-23 p-5">
            <span className="eyebrow">Project details</span>
            {file && <div className="mt-4"><p className="truncate text-sm font-bold">{file.name}</p><p className="mt-1 text-xs text-slate-400">{fileSize(file.size)} · {selected ? `${selected.size} × ${selected.size}` : 'Original'}</p></div>}
            <div className="my-5 h-px bg-slate-100"/>
            <div className="space-y-3 text-xs"><div className="property-row"><span>Fit mode</span><strong>{fit === 'contain' ? 'Contain' : 'Cover'}</strong></div><div className="property-row"><span>Padding</span><strong>{fit === 'contain' ? `${padding}%` : '—'}</strong></div><div className="property-row"><span>Background</span><strong>{background === 'transparent' ? 'Transparent' : background === '#ffffff' ? 'White' : 'Black'}</strong></div><div className="property-row"><span>Output</span><strong>{enabledSizes.length} sizes</strong></div></div>
            {selected && <button onClick={() => downloadIcon(selected)} className="secondary-button mt-5 w-full justify-center">Download selected <svg viewBox="0 0 24 24"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14"/></svg></button>}
          </section>
        </aside>
      </div>
      <footer className="mx-auto flex w-full max-w-[1480px] flex-col justify-between gap-2 px-6 pb-6 text-[11px] font-semibold text-slate-400 sm:flex-row"><span>IconCraft · Crafted for pixel-perfect results</span><span>Your images stay on your device</span></footer>
    </div>
  );
}
