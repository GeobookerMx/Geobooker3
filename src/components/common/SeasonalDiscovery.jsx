import React, { useEffect, useState } from 'react';
import { Gift, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getHolidaySeason } from '../../config/holidaySeason';

const DISMISSED_KEY = 'gb_holidays_2026_dismissed';

export default function SeasonalDiscovery({ onSearch, disabled = false }) {
  const { i18n } = useTranslation();
  const [date, setDate] = useState(() => new Date());
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === 'true'; } catch { return false; }
  });
  useEffect(() => {
    const refresh = () => setDate(new Date());
    const timer = setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const season = getHolidaySeason(date, i18n.language);
  if (!season || dismissed) return null;

  return (
    <section aria-label={season.title} className="relative mt-4 overflow-hidden rounded-2xl border border-amber-200/40 bg-gradient-to-br from-emerald-950 to-emerald-800 p-4 text-left text-white shadow-sm">
      <Sparkles aria-hidden="true" className="pointer-events-none absolute bottom-4 right-4 h-16 w-16 text-amber-100/10" />
      <div className="flex items-start gap-3 pr-8">
        <Gift aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-amber-200" />
        <div>
          <h2 className="text-base font-bold text-amber-100">{season.title}</h2>
          <p className="mt-1 text-sm text-emerald-50">{season.description}</p>
        </div>
      </div>
      <button type="button" aria-label={season.dismiss}
        onClick={() => {
          setDismissed(true);
          try { localStorage.setItem(DISMISSED_KEY, 'true'); } catch { /* Still hides for this session. */ }
        }}
        className="absolute right-1 top-1 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
        <X aria-hidden="true" className="h-5 w-5" />
      </button>
      <div className="relative mt-3 flex flex-wrap gap-2">
        {season.suggestions.map(query => (
          <button key={query} type="button" disabled={disabled} onClick={() => onSearch(query)}
            className="min-h-[44px] rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200 disabled:opacity-50">
            {query}
          </button>
        ))}
      </div>
    </section>
  );
}
