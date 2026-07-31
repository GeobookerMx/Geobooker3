import React from 'react';
import { Sparkles } from 'lucide-react';

export default function GeoGuide({ title = 'Geo', children }) {
  return (
    <div className="rounded-[1.75rem] border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
          <svg viewBox="0 0 64 64" className="h-10 w-10" aria-hidden="true">
            <circle cx="32" cy="32" r="24" fill="#22d3ee" />
            <path d="M20 32c0-8 5-14 12-14s12 6 12 14c0 9-12 18-12 18S20 41 20 32Z" fill="#0f172a" />
            <circle cx="32" cy="31" r="5" fill="#ffffff" />
          </svg>
          <span className="absolute -right-1 -top-1 rounded-full bg-amber-400 p-1 text-slate-950">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">{title}</p>
          <div className="mt-2 text-sm leading-6 text-slate-700">{children}</div>
        </div>
      </div>
    </div>
  );
}
