import { useCallback, useEffect, useState } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { getOTCCollectionStatus, runOTCCollection, setOTCCollectionEnabled } from '@/lib/otcCollection';
import type { OTCCollectionStatus } from '@/types/otcCollection';

export default function BackgroundCollectionControl() {
  const [status, setStatus] = useState<OTCCollectionStatus | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => {
    try { setStatus(await getOTCCollectionStatus()); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to read collection status'); }
  }, []);
  useEffect(() => {
    void refresh();
    // Status only: this timer never generates ticks or executes collection.
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  async function runCycle() {
    const cycle = await runOTCCollection();
    setMessage(!('result' in cycle) ? 'Cycle skipped: collection is disabled or another cycle is running.' :
      cycle.result.complete ? 'Cycle finished for all catalog assets.' : 'Partial cycle finished. More scheduler cycles are needed to catch up.');
  }
  async function perform(toggle?: boolean) {
    setBusy(true); setMessage(''); setError('');
    try {
      if (toggle !== undefined) {
        setStatus(await setOTCCollectionEnabled(toggle));
        if (!toggle) setMessage('Background collection disabled. Recorded history is retained; viewed assets can still receive live ticks.');
      }
      if (toggle !== false) await runCycle();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Collection request failed'); }
    finally { await refresh(); setBusy(false); }
  }
  const age = status?.lastFinishedAt ? Math.max(0, (new Date(status.serverNow).getTime() - new Date(status.lastFinishedAt).getTime()) / 1000) : null;
  const schedulerLabels = {
    disabled:'Disabled',missing:'Scheduler not observed recently — check the external scheduler or supported cron',error:'Scheduled collection failed',
    'awaiting-success':'Scheduler reached API — awaiting completed work',initializing:'Scheduler running — initializing assets',
    lagging:'Scheduler running — assets are falling behind',verifying:'Verifying scheduled operation — awaiting two successful runs',
    healthy:'Recent scheduled runs verified — all assets fresh',
  };
  const health = status?.scheduler ? schedulerLabels[status.scheduler.state] : !status ? 'Status unavailable' : !status.enabled ? 'Disabled' : status.running ? 'Cycle in progress' :
    status.lastError ? 'Collection errors' : age === null ? 'Awaiting first cycle' : age > 120 ? 'No recent cycle — check scheduler' : 'Recent cycle recorded';
  const buttonClass = 'rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-sky-400';
  return <section aria-labelledby="background-collection-heading" className="rounded-2xl border p-5 space-y-4" style={{background:'var(--admin-surface)',borderColor:'var(--admin-border)'}}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h3 id="background-collection-heading" className="flex items-center gap-2 text-lg font-bold text-white"><Database size={19}/> Background history collection</h3>
        <p className="mt-1 max-w-2xl text-sm text-slate-300">One server-side switch for every asset in the OTC pricing catalog, including assets with no viewers. This does not change trading availability or payouts.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!status || busy} aria-pressed={status?.enabled ?? false} onClick={() => void perform(!status?.enabled)} className={`${buttonClass} ${status?.enabled ? 'bg-slate-600 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}>
          {busy ? 'Working…' : status?.enabled ? 'Disable background collection' : 'Enable all assets & collect now'}
        </button>
        <button type="button" disabled={!status?.enabled || busy || status.running} onClick={() => void perform()} className={`${buttonClass} bg-sky-700 text-white hover:bg-sky-600`}>Run one cycle</button>
        <button type="button" aria-label="Refresh collection status" disabled={busy} onClick={() => void refresh()} className={`${buttonClass} bg-white/5 text-slate-200`}><RefreshCw size={17}/></button>
      </div>
    </div>
    <p role="status" className="text-sm font-semibold text-sky-300">{health}</p>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-slate-200">{message}</p>}
    {status && <>
      <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
        {[["Catalog assets",status.totalAssets],["Initialized",status.initializedAssets],["Updated within 60s",status.currentAssets],["Not yet initialized",status.uninitializedAssets]].map(([label,value]) => <div key={label} className="rounded-lg bg-black/15 px-3 py-2"><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 text-lg font-bold tabular-nums text-white">{value}</dd></div>)}
      </dl>
      {status.scheduler && <div className="rounded-lg border border-white/10 p-3 text-xs text-slate-300 space-y-1">
        <p>Authenticated scheduler last seen: {status.scheduler.lastSeenAt ? new Date(status.scheduler.lastSeenAt).toLocaleString() : 'Never'}</p>
        <p>Scheduled cycle last finished: {status.scheduler.lastFinishedAt ? new Date(status.scheduler.lastFinishedAt).toLocaleString() : 'Never'} · Consecutive successful scheduled cycles: {status.scheduler.consecutiveSuccesses}</p>
        <p>{status.scheduler.freshAssets}/{status.totalAssets} assets advanced within {status.scheduler.freshnessWindowSeconds}s. Manual cycles do not establish scheduler health.</p>
        {status.scheduler.lastError && <p role="alert" className="text-red-300">{status.scheduler.lastError}</p>}
      </div>}
      <p className="text-xs text-slate-400">Last cycle finished: {status.lastFinishedAt ? new Date(status.lastFinishedAt).toLocaleString() : 'Never'} · Maximum initialized-asset lag: {status.maxLagSeconds === null ? 'Unknown' : `${status.maxLagSeconds}s`}</p>
      {status.lastResult && <p className="text-xs text-slate-300">Last cycle: {status.lastResult.processed.length} processed, {status.lastResult.remaining} remaining, {status.lastResult.errors.length} errors{status.lastResult.complete ? ' — all current at that cycle.' : ' — not fully caught up.'}</p>}
      {status.lastError && <p role="alert" className="text-sm text-red-300">{status.lastError}</p>}
    </>}
    <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200">
      {status?.scheduler?.state==='healthy' ? <><strong>Recent scheduled operation observed.</strong> The collector runs independently of this page. This is recent health evidence, not a guarantee of future uptime.</> : <><strong>A frequent scheduler is still required.</strong> Enabling this setting saves permission and runs one initial cycle; it does not install or start a scheduler. Configure an authenticated external scheduler (for example cron-job.org), or a supported Vercel cron, to call the collector every minute. Hobby daily cron is insufficient. If scheduled calls are failing, inspect collection errors instead of creating another job.</>}
      {status && <span className="block mt-1">Scheduler secret: {status.schedulerSecretConfigured ? 'configured (not proof a scheduler is running)' : 'not configured'}. Recorded OTC history accumulates from collection onward; missing past observations are never fabricated.</span>}
    </div>
  </section>;
}
