'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';

interface IconData { size: number; label: string; dataUrl: string; format: string; }
interface ConversionResult {
  icons: IconData[]; zipDataUrl: string; originalName: string;
  originalWidth: number; originalHeight: number;
  upscaled?: boolean; aiUsed?: boolean;
}

const FORMATS = [
  { ext: 'PNG', supported: true }, { ext: 'JPG', supported: true },
  { ext: 'WebP', supported: true }, { ext: 'AVIF', supported: true },
  { ext: 'BMP', supported: true }, { ext: 'GIF', supported: true },
  { ext: 'TIFF', supported: true },
];

const ICON_SIZES = [
  { size: 16, label: 'Toolbar', desc: 'Extension toolbar icon' },
  { size: 32, label: 'Extension details', desc: 'Extension detail view' },
  { size: 48, label: 'Management', desc: 'Extension management page' },
  { size: 128, label: 'Chrome Web Store', desc: 'Store listing icon' },
  { size: 256, label: 'App icon', desc: 'Windows / store icon' },
  { size: 512, label: 'Desktop app', desc: 'High-res desktop icon' },
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [selected, setSelected] = useState<IconData | null>(null);
  const [history, setHistory] = useState<{name:string;sizes:number;date:string}[]>([]);
  const [mounted, setMounted] = useState(false);
  const [enabledSizes, setEnabledSizes] = useState<number[]>([16,32,48,128,256,512]);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('icon-craft-history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // Click outside to deselect
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest('.icon-card')) setSelected(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleFile = useCallback((f: File) => {
    setError(null); setResult(null); setSelected(null);
    const valid = ['image/png','image/jpeg','image/webp','image/avif','image/bmp','image/gif','image/tiff'];
    if (!valid.includes(f.type)) { setError('Unsupported format. Try PNG, JPG, or WebP.'); return; }
    if (f.size > 10*1024*1024) { setError('File too large — max 10MB.'); return; }
    setFile(f);
    const r = new FileReader();
    r.onload = e => setPreview(e.target?.result as string);
    r.readAsDataURL(f);
  }, []);

  const convert = async () => {
    if (!file) return; setLoading(true); setError(null);
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('useAI', String(useAI));
      const res = await fetch('/api/convert', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion failed');
      // Filter to enabled sizes
      data.icons = data.icons.filter((i: IconData) => enabledSizes.includes(i.size));
      setResult(data);
      setSelected(data.icons[0]);
      const entry = { name: data.originalName, sizes: data.icons.length, date: new Date().toLocaleDateString() };
      const updated = [entry, ...history.filter(h => h.name !== entry.name)].slice(0, 20);
      setHistory(updated); localStorage.setItem('icon-craft-history', JSON.stringify(updated));
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const dlIcon = (icon: IconData) => {
    const a = document.createElement('a'); a.href = icon.dataUrl;
    a.download = `${file?.name.replace(/\.[^.]+$/,'')||'icon'}-${icon.size}x${icon.size}.png`; a.click();
  };
  const dlZip = () => {
    if (!result) return;
    const a = document.createElement('a'); a.href = result.zipDataUrl;
    a.download = `${result.originalName}-icons.zip`; a.click();
  };
  const reset = () => { setFile(null); setPreview(null); setResult(null); setError(null); setSelected(null); };

  const toggleSize = (size: number) => {
    setEnabledSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size].sort((a,b) => a-b));
  };

  const fileSizeStr = (bytes: number) => bytes < 1024*1024 ? `${(bytes/1024).toFixed(1)} KB` : `${(bytes/1024/1024).toFixed(1)} MB`;

  return (
    <div className="h-screen flex flex-col bg-[#f5f5f5] dark:bg-[#0a0a0a]">

      {/* ── Toolbar ── */}
      <header className="h-14 bg-white dark:bg-[var(--background)] border-b border-gray-200 dark:border-[var(--border)] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-gray-800 dark:text-[var(--foreground)]">Icon Craft</span>
          <div className="h-5 w-px bg-gray-200 dark:bg-[var(--border)] mx-1"></div>
          <button onClick={reset} className="px-4 py-1.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            New Project
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/history" className="px-4 py-1.5 rounded-lg border border-gray-200 dark:border-[var(--border)] text-sm text-gray-600 dark:text-[var(--muted)] hover:bg-gray-50 dark:hover:bg-[var(--surface-hover)] transition-all">History</Link>
          {result && (
            <button onClick={dlZip} className="px-4 py-1.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              Export All
            </button>
          )}
        </div>
      </header>

      {/* ── 3-column body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="w-72 bg-white dark:bg-[var(--background)] border-r border-gray-200 dark:border-[var(--border)] overflow-y-auto flex-shrink-0 p-4">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-[var(--muted)] uppercase tracking-wider mb-4">Upload</h2>

          {/* Drop zone */}
          <div ref={dropRef}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-4 ${
              dragOver ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/5' : 'border-gray-200 dark:border-[var(--border)] hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5'
            }`}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files?.[0]; if(f) handleFile(f); }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

            {preview ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 dark:border-[var(--border)] bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#fff_0%_50%)_0_0/12px_12px] dark:bg-[repeating-conic-gradient(#1a1a1a_0%_25%,#0a0a0a_0%_50%)_0_0/12px_12px]">
                  <img src={preview} alt="" className="w-full h-full object-contain" />
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-[var(--foreground)] truncate max-w-full">{file?.name}</p>
                <p className="text-[10px] text-gray-400 dark:text-[var(--muted)]">{file && fileSizeStr(file.size)}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-[var(--foreground)]">Drop your image here</p>
                <p className="text-xs text-gray-400 dark:text-[var(--muted)] mt-1">or click to browse</p>
              </div>
            )}
          </div>

          {/* Format badges */}
          <div className="flex flex-wrap gap-1 mb-5">
            {FORMATS.map(f => (
              <span key={f.ext} className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                f.supported
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20'
                  : 'bg-gray-50 dark:bg-[var(--surface)] text-gray-400 dark:text-[var(--muted)] border-gray-100 dark:border-[var(--border)]'
              }`}>{f.ext}</span>
            ))}
          </div>

          <div className="h-px bg-gray-100 dark:bg-[var(--border)] my-4"></div>

          <h2 className="text-xs font-semibold text-gray-400 dark:text-[var(--muted)] uppercase tracking-wider mb-3">Settings</h2>

          {/* HD toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[var(--surface)] border border-gray-100 dark:border-[var(--border)] mb-3">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-[var(--foreground)]">AI HD Upscaling</p>
              <p className="text-[11px] text-gray-400 dark:text-[var(--muted)]">Real-ESRGAN 4×</p>
            </div>
            <button onClick={() => setUseAI(!useAI)}
              className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${useAI ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-[var(--border)]'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${useAI ? 'translate-x-4' : ''}`} />
            </button>
          </div>

          {/* Output size checkboxes */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[var(--surface)] border border-gray-100 dark:border-[var(--border)] mb-3">
            <p className="text-sm font-medium text-gray-700 dark:text-[var(--foreground)] mb-2">Output sizes</p>
            <div className="space-y-1.5">
              {ICON_SIZES.map(({size, label}) => (
                <label key={size} className="flex items-center gap-2 text-sm text-gray-600 dark:text-[var(--muted)] cursor-pointer">
                  <input type="checkbox" checked={enabledSizes.includes(size)} onChange={() => toggleSize(size)}
                    className="rounded border-gray-300 dark:border-[var(--border)] text-indigo-500 focus:ring-indigo-500" />
                  <span>{size} × {size}</span>
                  <span className="text-[11px] text-gray-400 dark:text-[var(--muted)] ml-auto">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-500 text-xs">{error}</div>
          )}

          {/* Generate button */}
          <button onClick={convert} disabled={!file || loading || enabledSizes.length === 0}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2">
            {loading ? (
              <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Generating...</>
            ) : 'Generate Icons'}
          </button>

          {/* History pills */}
          {mounted && !result && history.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] text-gray-400 dark:text-[var(--muted)] mb-2">Recent</p>
              <div className="flex flex-wrap gap-1.5">
                {history.slice(0,4).map((h,i) => (
                  <span key={i} className="px-2 py-1 rounded-md bg-gray-50 dark:bg-[var(--surface)] border border-gray-100 dark:border-[var(--border)] text-[11px] text-gray-400 dark:text-[var(--muted)]">{h.name}</span>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── CENTER — Canvas ── */}
        <main className="flex-1 overflow-y-auto p-6">
          {!result ? (
            /* Empty state */
            <div className="h-full flex flex-col items-center justify-center text-center">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-[var(--foreground)] mb-1">No icons yet</h2>
              <p className="text-sm text-gray-400 dark:text-[var(--muted)] max-w-xs">Upload an image from the left panel and click Generate Icons to get started.</p>
            </div>
          ) : (
            /* Icon grid */
            <>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-lg font-semibold text-gray-800 dark:text-[var(--foreground)]">Generated Icons</h1>
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-[var(--muted)]">
                  {result.aiUsed && <><span className="w-2 h-2 rounded-full bg-green-400"></span> AI HD Upscaled</>}
                  {result.upscaled && !result.aiUsed && <><span className="w-2 h-2 rounded-full bg-amber-400"></span> Upscaled</>}
                </div>
              </div>

              {/* Runway showing original file info */}
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-[var(--muted)] mb-4 p-2 px-3 rounded-lg bg-white dark:bg-[var(--surface)] border border-gray-100 dark:border-[var(--border)]">
                <span className="font-medium text-gray-500 dark:text-[var(--foreground)]">{result.originalName}</span>
                <span className="text-gray-300 dark:text-[var(--muted)]">·</span>
                <span>{result.originalWidth} × {result.originalHeight}</span>
                <span className="text-gray-300 dark:text-[var(--muted)]">·</span>
                <span>{result.icons.length} sizes</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {result.icons.map(icon => (
                  <div key={icon.size}
                    onClick={() => setSelected(icon)}
                    className={`icon-card bg-white dark:bg-[var(--surface)] rounded-xl border overflow-hidden hover:shadow-md transition-all cursor-pointer group ${
                      selected?.size === icon.size ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-gray-200 dark:border-[var(--border)]'
                    }`}>
                    <div className="aspect-square bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#fff_0%_50%)_0_0/12px_12px] dark:bg-[repeating-conic-gradient(#1a1a1a_0%_25%,#0a0a0a_0%_50%)_0_0/12px_12px] flex items-center justify-center p-4">
                      <img src={icon.dataUrl} alt={`${icon.size}×${icon.size}`}
                        className="object-contain"
                        style={{ width: Math.min(icon.size, 160), height: Math.min(icon.size, 160) }} />
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-[var(--foreground)]">{icon.size} × {icon.size}</p>
                        <p className="text-xs text-gray-400 dark:text-[var(--muted)]">{ICON_SIZES.find(i=>i.size===icon.size)?.desc || icon.label}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); dlIcon(icon); }}
                        className="text-[11px] text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium whitespace-nowrap ml-2">
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>

        {/* ── RIGHT SIDEBAR — Properties ── */}
        <aside className="w-64 bg-white dark:bg-[var(--background)] border-l border-gray-200 dark:border-[var(--border)] overflow-y-auto flex-shrink-0 p-4">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-[var(--muted)] uppercase tracking-wider mb-4">Properties</h2>

          {/* Original image preview */}
          {preview ? (
            <div className="mb-4">
              <p className="text-xs text-gray-500 dark:text-[var(--muted)] mb-1">Original</p>
              <div className="w-full aspect-square rounded-xl bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#fff_0%_50%)_0_0/12px_12px] dark:bg-[repeating-conic-gradient(#1a1a1a_0%_25%,#0a0a0a_0%_50%)_0_0/12px_12px] border border-gray-200 dark:border-[var(--border)] flex items-center justify-center overflow-hidden mb-2">
                <img src={preview} alt="" className="w-full h-full object-contain" />
              </div>
              {file && <p className="text-xs text-gray-400 dark:text-[var(--muted)]">{file.name} · {fileSizeStr(file.size)}</p>}
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-xs text-gray-500 dark:text-[var(--muted)] mb-1">Original</p>
              <div className="w-full aspect-square rounded-xl bg-gray-50 dark:bg-[var(--surface)] border border-gray-100 dark:border-[var(--border)] flex items-center justify-center text-gray-300 dark:text-[var(--muted)] text-xs">
                No image
              </div>
            </div>
          )}

          <div className="h-px bg-gray-100 dark:bg-[var(--border)] my-3"></div>

          {/* Selected icon details */}
          {selected && result ? (
            <div>
              <p className="text-xs text-gray-500 dark:text-[var(--muted)] mb-2">Selected</p>
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                <div className="w-12 h-12 rounded-lg mx-auto mb-2 bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#fff_0%_50%)_0_0/10px_10px] dark:bg-[repeating-conic-gradient(#1a1a1a_0%_25%,#0a0a0a_0%_50%)_0_0/10px_10px] flex items-center justify-center overflow-hidden">
                  <img src={selected.dataUrl} alt="" className="w-full h-full object-contain" />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-[var(--foreground)] text-center">{selected.size} × {selected.size}</p>
                <p className="text-xs text-gray-400 dark:text-[var(--muted)] text-center">{ICON_SIZES.find(i=>i.size===selected.size)?.desc || selected.label}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => dlIcon(selected)}
                    className="flex-1 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-600 transition-all">
                    Download
                  </button>
                  <button onClick={dlZip}
                    className="flex-1 py-1.5 rounded-lg border border-gray-200 dark:border-[var(--border)] text-xs font-medium text-gray-600 dark:text-[var(--muted)] hover:bg-gray-50 dark:hover:bg-[var(--surface-hover)] transition-all">
                    All ZIP
                  </button>
                </div>
              </div>
            </div>
          ) : result && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[var(--surface)] border border-gray-100 dark:border-[var(--border)]">
              <p className="text-xs text-gray-400 dark:text-[var(--muted)] text-center">Click an icon to see details</p>
            </div>
          )}

          {result && (
            <>
              <div className="h-px bg-gray-100 dark:bg-[var(--border)] my-3"></div>
              <button onClick={dlZip}
                className="w-full py-2 rounded-xl border border-gray-200 dark:border-[var(--border)] text-sm text-gray-600 dark:text-[var(--muted)] hover:bg-gray-50 dark:hover:bg-[var(--surface-hover)] transition-all flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Export All as ZIP
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
