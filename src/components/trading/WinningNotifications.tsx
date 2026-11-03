import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowDownRight, ArrowUpRight, Check, Sparkles, Trophy, X } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { WinningNotification } from '@/lib/winningNotifications';
import './winningNotifications.css';

export function WinningNotificationCard({ result, onDismiss }: { result: WinningNotification; onDismiss: (id: string) => void }) {
  const { formatMoney } = useCurrency();
  const big = result.style === 'big';
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(result.id), big ? 8500 : 6000);
    return () => window.clearTimeout(timer);
  }, [result.id, big, onDismiss]);
  const Direction = result.direction === 'UP' ? ArrowUpRight : ArrowDownRight;
  return (
    <article role="status" aria-atomic="true" className={`trade-win-card ${big ? 'trade-win-card--big' : ''}`} data-trade-id={result.id}>
      <button type="button" className="absolute right-3 top-3 rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400" onClick={() => onDismiss(result.id)} aria-label={`Dismiss win for ${result.asset}`}><X size={16} /></button>
      {big && <div className="trade-win-sparkles" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ '--spark': i } as CSSProperties} />)}</div>}
      <div className="flex items-center gap-3 pr-6">
        <span className={`trade-win-icon ${big ? 'text-amber-300' : 'text-emerald-300'}`} aria-hidden="true">{big ? <Trophy size={24} /> : <Check size={23} strokeWidth={3} />}</span>
        <div><div className={`flex items-center gap-2 text-xs font-black tracking-[.18em] ${big ? 'text-amber-200' : 'text-emerald-300'}`}>{big ? 'BIG WIN!' : 'TRADE WON'}{big && <Sparkles size={14} aria-hidden="true" />}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-300"><span>{result.asset}</span><span className="text-slate-500">·</span><Direction size={14} aria-hidden="true" />{result.direction}</div>
        </div>
      </div>
      <div className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Profit earned</div>
      <div className={`mb-3 mt-1 font-black tabular-nums tracking-tight ${big ? 'text-3xl text-amber-100' : 'text-2xl text-emerald-300'}`} aria-label="Profit earned">+{formatMoney(result.profit)}</div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div><dt className="text-slate-400">Investment</dt><dd className="mt-1 font-semibold text-slate-200">{formatMoney(result.investment)}</dd></div>
        <div className="text-right"><dt className="text-slate-400">Total payout</dt><dd className="mt-1 font-bold text-white">{formatMoney(result.payout)}</dd></div>
      </dl>
      <div className="trade-win-timer" style={{ animationDuration: big ? '8.5s' : '6s' }} aria-hidden="true" />
    </article>
  );
}
export function WinningNotifications({ results, onDismiss }: { results: WinningNotification[]; onDismiss: (id: string) => void }) {
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 639px)').matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(max-width: 639px)');
    const update = () => setCompact(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  // One compact mobile card, kept above (not on top of) the bottom trading controls.
  // Queued cards are not mounted, so their expiry starts only when shown.
  return <section aria-label="Winning trades" className="pointer-events-none fixed right-3 top-20 z-[80] flex w-[calc(100%-1.5rem)] max-w-[300px] flex-col gap-3 sm:bottom-5 sm:left-20 sm:right-auto sm:top-auto sm:max-w-[340px]">{results.slice(0, compact ? 1 : 2).map(result => <WinningNotificationCard key={result.id} result={result} onDismiss={onDismiss} />)}</section>;
}
