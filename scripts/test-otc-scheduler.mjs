import { pathToFileURL } from 'node:url';

/** Explicitly invokes one collection cycle. Never logs headers, secrets or response bodies. */
export async function testOTCScheduler({origin, secret, fetchImpl = fetch}) {
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('OTC_ORIGIN must be an HTTPS origin only, without credentials, path, query or fragment.');
  }
  if (!secret?.trim() || /[\r\n]/.test(secret)) throw new Error('A valid server-only CRON_SECRET is required.');
  url.pathname = '/api/otc/collect';
  const response = await fetchImpl(url, {
    method: 'GET', headers: {Authorization: `Bearer ${secret.trim()}`},
    redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(35000),
  });
  if (![200,202].includes(response.status)) throw new Error(`Collector returned HTTP ${response.status}; inspect deployment logs. No response body was logged.`);
  const cycle = await response.json();
  if (cycle.skipped === true) throw new Error('Collector skipped: collection is disabled or another cycle holds the lease. This is not a successful work cycle.');
  const result = cycle.result;
  if (cycle.skipped !== false || !Array.isArray(result?.processed) || !Array.isArray(result?.errors) || !Number.isInteger(result?.assets) || typeof result?.complete !== 'boolean' || !Number.isInteger(result?.remaining)) {
    throw new Error('Unexpected collector response; verify that the collector rewrite is deployed.');
  }
  if (result.errors.length || !result.processed.length) throw new Error('Collector reported errors or performed no asset work.');
  return {httpStatus: response.status, processed: result.processed.length, assets: result.assets, remaining: result.remaining, complete: result.complete,
    note: 'One authenticated call only; not proof of autonomous scheduling or catalog freshness.'};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.slice(2).join(' ') !== '--run') {
    console.error('Usage: OTC_ORIGIN=https://www.initoption.com CRON_SECRET=<from secure environment> node scripts/test-otc-scheduler.mjs --run. This performs one real collection cycle. Do not type secrets into shared shell history.');
    process.exitCode = 1;
  } else {
    try { console.log(JSON.stringify(await testOTCScheduler({origin: process.env.OTC_ORIGIN, secret: process.env.CRON_SECRET}), null, 2)); }
    catch { console.error('Collection check failed. Verify the HTTPS origin, server-only secret, deployed collector, enabled switch and server logs. No credentials or response body were logged.'); process.exitCode = 1; }
  }
}
