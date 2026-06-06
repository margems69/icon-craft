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
    const saved = localStorage.getItem('icon-craft-history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('icon-craft-history');
    setHistory([]);
  };

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="nav-blur fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-semibold text-sm tracking-tight hover:text-[var(--accent)] transition-colors">Icon Craft</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Conversion History</h1>
            <p className="text-[var(--muted)] text-sm mt-1">Your recent icon conversions, stored locally.</p>
          </div>
          {history.length > 0 && (
            <button className="btn-secondary text-sm" onClick={clearHistory}>
              Clear history
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--muted)] text-sm">No conversions yet.</p>
            <Link href="/" className="text-[var(--accent)] text-sm hover:underline mt-2 inline-block">
              Convert your first logo →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((entry, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                <div>
                  <p className="font-medium text-sm">{entry.name}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{entry.sizes} icon sizes</p>
                </div>
                <span className="text-xs text-[var(--muted)]">{entry.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
