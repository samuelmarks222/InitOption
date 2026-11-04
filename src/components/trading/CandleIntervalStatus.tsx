import { useEffect, useState } from 'react';
import { getSynchronizedUnixTimeMs, subscribeClockSync } from '@/lib/serverTimeSync';
import { bucketStart } from './engine/native/timeframes';

export function candleIntervalProgress(now: number, seconds: number) {
  const start = bucketStart(now, seconds);
  return { remaining: Math.max(1, Math.ceil(start + seconds - now)), fraction: (now - start) / seconds };
}
function duration(seconds: number) {
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60), rest = seconds % 60;
  return [ ...(hours ? [String(hours).padStart(2, '0')] : []), String(minutes).padStart(2, '0'), String(rest).padStart(2, '0') ].join(':');
}
/** A clock indicator only: never drives candle prices or closes. */
export default function CandleIntervalStatus({ label, seconds, live }: { label: string; seconds: number; live: boolean }) {
  const [now, setNow] = useState(getSynchronizedUnixTimeMs);
  useEffect(() => {
    const update = () => setNow(getSynchronizedUnixTimeMs());
    const timer = window.setInterval(update, 250);
    const unsubscribe = subscribeClockSync(update);
    update();
    return () => { window.clearInterval(timer); unsubscribe(); };
  }, []);
  const progress = candleIntervalProgress(now / 1000, seconds);
  return (
    <div className="pointer-events-none absolute bottom-16 right-3 z-[78] rounded border border-white/10 bg-slate-950/85 px-2 py-1 text-[11px] text-slate-300"
      title="Timeframe controls candle duration, not the live price update rate. All timeframes share the same price stream.">
      <div role="timer" aria-live="off"><strong>{label} candle</strong> · {live ? `Closes in ${duration(progress.remaining)}` : 'Waiting for server prices'}</div>
      <div className="mt-1 h-0.5 w-full overflow-hidden rounded bg-slate-700" aria-hidden="true">
        <div className="h-full bg-sky-400" style={{ width: `${live ? progress.fraction * 100 : 0}%` }} />
      </div>
    </div>
  );
}
