'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HistoryEntry {
  name: string;
  sizes: number;
  date: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

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

  const clearHistory = () => {
    localStorage.removeItem('icon-craft-history');
    setHistory([]);
  };

  const removeEntry = (name: string) => {
    const updated = history.filter(item => item.name !== name);
    setHistory(updated);
    localStorage.setItem('icon-craft-history', JSON.stringify(updated));
  };

  return (
    <div className="app-shell min-h-screen text-slate-900 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3.5">
            <Link href="/" className="brand-mark focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="IconCraft Home">
              <span /><span /><span />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900">IconCraft</span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">History</span>
              </div>
              <p className="text-xs text-slate-500">Your recent icon conversions</p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link href="/" className="primary-button compact">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              <span>New Icon Project</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="eyebrow">Local Storage</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Recent Conversions</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Saved locally on this device. Privacy preserved — no cloud tracking.
            </p>
          </div>

          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="ghost-button text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span>Clear all</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="panel p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-2xl mb-4">
              🕒
            </div>
            <h2 className="text-base font-bold text-slate-800">No conversions recorded yet</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Converted icon sets will appear here so you can keep track of recent exports.
            </p>
            <Link href="/" className="primary-button compact mt-6">
              <span>Convert your first logo</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((entry, i) => (
              <div
                key={`${entry.name}-${i}`}
                className="panel p-4 flex items-center justify-between transition hover:border-slate-300"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                    📦
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{entry.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700">
                        {entry.sizes} sizes generated
                      </span>
                      <span className="text-[11px] text-slate-400">·</span>
                      <span className="text-[11px] text-slate-500">{entry.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/"
                    className="secondary-button compact text-xs"
                    title="Open studio"
                  >
                    <span>Open Studio</span>
                  </Link>
                  <button
                    onClick={() => removeEntry(entry.name)}
                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition flex items-center justify-center"
                    title="Remove from history"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white/60 py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>IconCraft Studio</span>
          <Link href="/" className="text-indigo-600 hover:underline">
            ← Return to Studio
          </Link>
        </div>
      </footer>
    </div>
  );
}
