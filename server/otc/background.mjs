import { randomUUID } from 'node:crypto';

/** Durable global switch, cycle lease and health; collection never depends on a browser. */
export function createOTCBackground({ transaction, assets, collect }) {
  const symbols = Object.keys(assets);
  const iso = value => value ? new Date(value).toISOString() : null;
  async function status() {
    return transaction(async client => {
      const control = (await client.query(`SELECT *, clock_timestamp() AS server_now
        FROM public.otc_collection_control WHERE id=true`)).rows[0];
      const rows = (await client.query('SELECT symbol,last_slot FROM public.otc_markets')).rows;
      const now = new Date(control.server_now).getTime();
      const slots = new Map(rows.map(row => [row.symbol, Number(row.last_slot)]));
      const initialized = symbols.filter(symbol => slots.has(symbol));
      const lag = initialized.map(symbol => Math.max(0, now - slots.get(symbol) * 100));
      const freshAssets=lag.filter(ms=>ms<=120000).length;
      const scheduledAge=control.last_scheduled_at ? (now-new Date(control.last_scheduled_at).getTime())/1000 : Infinity;
      const finishedAge=control.last_scheduled_finished_at ? (now-new Date(control.last_scheduled_finished_at).getTime())/1000 : Infinity;
      const schedulerState=!control.enabled?'disabled':scheduledAge>150?'missing':control.scheduled_last_error?'error':finishedAge>150?'awaiting-success':
        initialized.length!==symbols.length?'initializing':freshAssets!==symbols.length?'lagging':Number(control.scheduled_consecutive_successes)<2?'verifying':'healthy';
      return {
        scheduler: {state:schedulerState,lastSeenAt:iso(control.last_scheduled_at),lastFinishedAt:iso(control.last_scheduled_finished_at),
          consecutiveSuccesses:Number(control.scheduled_consecutive_successes??0),lastError:control.scheduled_last_error??null,
          freshAssets,freshnessWindowSeconds:120,heartbeatWindowSeconds:150},
        enabled: control.enabled, totalAssets: symbols.length,
        initializedAssets: initialized.length,
        currentAssets: lag.filter(ms => ms <= 60000).length,
        uninitializedAssets: symbols.length - initialized.length,
        maxLagSeconds: lag.length ? Math.ceil(Math.max(...lag) / 1000) : null,
        updatedAt: iso(control.updated_at), lastStartedAt: iso(control.last_started_at),
        lastFinishedAt: iso(control.last_finished_at), lastResult: control.last_result,
        lastError: control.last_error,
        running: control.lease_until != null && new Date(control.lease_until).getTime() > now,
        serverNow: iso(control.server_now),
      };
    });
  }
  async function setEnabled(enabled, userId) {
    if (typeof enabled !== 'boolean') throw new TypeError('enabled must be a boolean');
    await transaction(client => client.query(`UPDATE public.otc_collection_control
      SET enabled=$1, updated_by=$2, updated_at=clock_timestamp(),
        scheduled_consecutive_successes=CASE WHEN enabled IS DISTINCT FROM $1 THEN 0 ELSE scheduled_consecutive_successes END WHERE id=true`, [enabled, userId]));
    return status();
  }
  async function run({scheduled=false}={}) {
    if(scheduled) await transaction(client=>client.query("UPDATE public.otc_collection_control SET last_scheduled_at=clock_timestamp() WHERE id=true"));
    const token = randomUUID();
    const acquired = await transaction(async client => (await client.query(`UPDATE public.otc_collection_control
      SET lease_token=$1, lease_until=clock_timestamp()+interval '60 seconds', last_started_at=clock_timestamp()
      WHERE id=true AND enabled AND (lease_until IS NULL OR lease_until < clock_timestamp()) RETURNING id`, [token])).rows.length > 0);
    if (!acquired) return { skipped: true, reason: 'disabled-or-running' };
    try {
      const result = await collect();
      await transaction(client => client.query(`UPDATE public.otc_collection_control
        SET last_finished_at=clock_timestamp(), last_result=$2::jsonb, last_error=$3,
          last_scheduled_finished_at=CASE WHEN $4::boolean THEN clock_timestamp() ELSE last_scheduled_finished_at END,
          scheduled_last_error=CASE WHEN $4::boolean THEN $3 ELSE scheduled_last_error END,
          scheduled_consecutive_successes=CASE WHEN $4::boolean THEN
            CASE WHEN $3::text IS NULL AND $5::boolean THEN scheduled_consecutive_successes+1 ELSE 0 END
            ELSE scheduled_consecutive_successes END,
          lease_token=NULL, lease_until=NULL WHERE id=true AND lease_token=$1`,
        [token,JSON.stringify(result),result.errors.length?'Some assets failed collection; inspect the cycle result.':null,scheduled,result.processed.length>0]));
      return { skipped: false, result };
    } catch (error) {
      await transaction(client => client.query(`UPDATE public.otc_collection_control
        SET last_finished_at=clock_timestamp(), last_result=NULL, last_error=$2,
          last_scheduled_finished_at=CASE WHEN $3::boolean THEN clock_timestamp() ELSE last_scheduled_finished_at END,
          scheduled_last_error=CASE WHEN $3::boolean THEN $2 ELSE scheduled_last_error END,
          scheduled_consecutive_successes=CASE WHEN $3::boolean THEN 0 ELSE scheduled_consecutive_successes END,
          lease_token=NULL, lease_until=NULL WHERE id=true AND lease_token=$1`,
        [token,'Collection failed. Check server logs and database connectivity.',scheduled]));
      throw error;
    }
  }
  return { status, setEnabled, run };
}
