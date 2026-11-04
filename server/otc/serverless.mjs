import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { BrownianMarket } from "../../native-chart/simulation.mjs";
export const SLOT_MS = 100;
const DEFAULT_RETENTION = 864000; // 24h, independent of browser history depth.
export class OTCError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
/** Database-backed, lazy Brownian generation. No global timer, filesystem or
 * in-memory pricing authority. SELECT FOR UPDATE serializes every asset writer.
 * Private HMAC randomness makes replay of a persisted checkpoint deterministic. */
export function createServerlessOTC({
  transaction,
  assets,
  maxBatch = 5000,
  warmup = 0,
  retention = DEFAULT_RETENTION,
  barRetention = 30 * DEFAULT_RETENTION,
  nowForTests,
} = {}) {
  if (
    !Number.isInteger(maxBatch) ||
    maxBatch < 1 ||
    !Number.isInteger(warmup) ||
    warmup < 0 ||
    warmup >= retention || !Number.isSafeInteger(barRetention) || barRetention < retention
  )
    throw new Error("Invalid OTC limits");
  const wire = (symbol, row, precision) => ({
    symbol,
    sequence: Number(row.slot),
    t: String(BigInt(row.slot) * 100000n),
    p: Number(row.price).toFixed(precision),
    source: "internal-otc",
  });
  return async function read({ symbol, after, at, seconds = 5, before, limit = 200, action = "ticks" }) {
    if (typeof symbol !== "string" || !Object.prototype.hasOwnProperty.call(assets, symbol))
      throw new OTCError(400, "Unknown OTC symbol");
    if (!["ticks", "price", "history"].includes(action))
      throw new OTCError(400, "Unknown OTC action");
    if (after !== undefined && (!Number.isSafeInteger(after) || after < 0))
      throw new OTCError(400, "Invalid tick cursor");
    if (at !== undefined && (!Number.isFinite(at) || at < 0))
      throw new OTCError(400, "Invalid expiry timestamp");
    if (action === "history") {
      if (![5,10,15,30,60,120,180,240,300,600,900,1800,3600,7200,14400].includes(seconds) ||
          !Number.isInteger(limit) || limit < 1 || limit > 1000 ||
          (before !== undefined && (!Number.isSafeInteger(before) || before < 0 || before % seconds !== 0)))
        throw new OTCError(400, "Invalid history window");
      return transaction(async client => {
        await client.query("SET LOCAL statement_timeout = '15s'");
        const clock = nowForTests ? nowForTests() : Number((await client.query("SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS ms")).rows[0].ms);
        const end = Math.min(before ?? Infinity, Math.floor(clock / 1000 / seconds) * seconds);
        const rows = (await client.query(`SELECT floor(bucket_slot / $2::numeric) * $2 AS bucket,
          (array_agg(open ORDER BY bucket_slot))[1] AS open, max(high) AS high, min(low) AS low,
          (array_agg(close ORDER BY bucket_slot DESC))[1] AS close, sum(volume) AS volume
          FROM public.otc_bars WHERE symbol=$1 AND bucket_slot<$3
          GROUP BY floor(bucket_slot / $2::numeric) ORDER BY bucket DESC LIMIT $4`,
          [symbol, seconds*10, end*10, limit+1])).rows;
        const oldest = (await client.query("SELECT min(bucket_slot) AS first FROM public.otc_bars WHERE symbol=$1",[symbol])).rows[0]?.first;
        return {type:"history",source:"internal-otc",symbol,seconds,before:end,generated:false,hasMore:rows.length>limit,earliest:oldest == null ? null : Number(oldest)/10,
          candles:rows.slice(0,limit).reverse().map(row=>({time:Number(row.bucket)/10,open:Number(row.open),high:Number(row.high),low:Number(row.low),close:Number(row.close),volume:Number(row.volume),origin:"recorded"}))};
      });

    }
    return transaction(async (client) => {
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query("SET LOCAL statement_timeout = '15s'");
      const initialTime = nowForTests
        ? nowForTests()
        : (
            await client.query(
              "SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS ms",
            )
          ).rows[0].ms;
      const initialSlot =
        Math.floor(Number(initialTime) / SLOT_MS) - warmup - 1;
      const config = assets[symbol],
        initialModel = { price: config.price, remaining: 0, regimeDrift: 0 };
      await client.query(
        `INSERT INTO public.otc_markets(symbol,session,secret,config,model,last_slot)
        VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6) ON CONFLICT(symbol) DO NOTHING`,
        [
          symbol,
          randomUUID(),
          randomBytes(32).toString("hex"),
          JSON.stringify(config),
          JSON.stringify(initialModel),
          initialSlot,
        ],
      );
      const market = (
        await client.query(
          "SELECT * FROM public.otc_markets WHERE symbol=$1 FOR UPDATE",
          [symbol],
        )
      ).rows[0];
      // Read the clock after acquiring the row lock; never trust a client target time.
      const now = Number(
        nowForTests
          ? nowForTests()
          : (
              await client.query(
                "SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS ms",
              )
            ).rows[0].ms,
      );
      if (at !== undefined && at * 1000 > now)
        throw new OTCError(425, "Expiry has not occurred");
      const desired =
        at === undefined
          ? Math.floor(now / SLOT_MS)
          : Math.floor(Math.round(at * 1e6) / 100000);
      let slot = Number(market.last_slot);
      if (desired < slot - retention)
        throw new OTCError(
          409,
          "Requested expiry is outside retained price history",
        );
      const stop = Math.min(desired, slot + maxBatch),
        batch = [];
      const model = new BrownianMarket({ ...market.config, ...market.model });
      // Constructor deliberately initializes regime state; restore it explicitly.
      model.remaining = market.model.remaining;
      model.regimeDrift = market.model.regimeDrift;
      for (let next = slot + 1; next <= stop; next++) {
        let draw = 0;
        model.random = () => {
          const bytes = createHmac("sha256", market.secret)
            .update(`${next}:${draw++}`)
            .digest();
          return (bytes.readUIntBE(0, 6) + 0.5) / 281474976710656;
        };
        batch.push({ slot: next, price: model.next() });
        slot = next;
      }
      if (batch.length) {
        await client.query(
          `INSERT INTO public.otc_ticks(symbol,slot,price)
          SELECT $1, x.slot, x.price FROM jsonb_to_recordset($2::jsonb) AS x(slot bigint,price numeric)`,
          [symbol, JSON.stringify(batch)],
        );
        const buckets = new Map();
        for (const tick of batch) {
          const bucket_slot = Math.floor(tick.slot / 50) * 50,
            price = Number(tick.price),
            bar = buckets.get(bucket_slot);
          if (bar) {
            bar.high = Math.max(bar.high, price);
            bar.low = Math.min(bar.low, price);
            bar.close = price;
            bar.volume++;
          } else
            buckets.set(bucket_slot, {
              bucket_slot,
              open: price,
              high: price,
              low: price,
              close: price,
              volume: 1,
            });
        }
        await client.query(
          `INSERT INTO public.otc_bars(symbol,bucket_slot,open,high,low,close,volume)
          SELECT $1,x.bucket_slot,x.open,x.high,x.low,x.close,x.volume FROM jsonb_to_recordset($2::jsonb)
          AS x(bucket_slot bigint,open numeric,high numeric,low numeric,close numeric,volume bigint)
          ON CONFLICT(symbol,bucket_slot) DO UPDATE SET high=GREATEST(otc_bars.high,EXCLUDED.high),
          low=LEAST(otc_bars.low,EXCLUDED.low),close=EXCLUDED.close,volume=otc_bars.volume+EXCLUDED.volume`,
          [symbol, JSON.stringify([...buckets.values()])],
        );
        const prune = slot - Number(market.pruned_slot) >= 600;
        if (prune) {
          await client.query(
            "DELETE FROM public.otc_ticks WHERE symbol=$1 AND slot<$2",
            [symbol, slot - retention],
          );
          await client.query(
            "DELETE FROM public.otc_bars WHERE symbol=$1 AND bucket_slot<$2",
            [symbol, Math.floor((slot - barRetention) / 50) * 50],
          );
        }
        await client.query(
          "UPDATE public.otc_markets SET model=$2::jsonb,last_slot=$3,pruned_slot=$4 WHERE symbol=$1",
          [
            symbol,
            JSON.stringify({
              price: model.price,
              remaining: model.remaining,
              regimeDrift: model.regimeDrift,
            }),
            slot,
            prune ? slot : market.pruned_slot,
          ],
        );
      }
      if (action === "price") {
        // Return a retryable response, but commit bounded catch-up work.
        if (slot < desired)
          return {
            pending: true,
            source: "internal-otc",
            session: market.session,
          };
        const tick = (
          await client.query(
            "SELECT slot,price FROM public.otc_ticks WHERE symbol=$1 AND slot<=$2 ORDER BY slot DESC LIMIT 1",
            [symbol, desired],
          )
        ).rows[0];
        const quotedAt = at ?? now / 1000;
        if (!tick || quotedAt - Number(tick.slot) * 0.1 > 0.5)
          throw new OTCError(409, "No retained OTC price at requested time");
        const value = wire(symbol, tick, market.config.precision);
        return {
          ...value,
          session: market.session,
          price: Number(value.p),
          timestamp: Number(value.t) / 1e6,
          quotedAt,
        };
      }
      const reset =
        after === undefined || after > slot || after < slot - retention;
      const rows = reset
        ? (
            await client.query(
              "SELECT slot,price FROM public.otc_ticks WHERE symbol=$1 ORDER BY slot DESC LIMIT 3001",
              [symbol],
            )
          ).rows.reverse()
        : (
            await client.query(
              "SELECT slot,price FROM public.otc_ticks WHERE symbol=$1 AND slot>$2 ORDER BY slot LIMIT 5000",
              [symbol, after],
            )
          ).rows;
      const candles = reset
        ? (
            await client.query(
              "SELECT * FROM public.otc_bars WHERE symbol=$1 ORDER BY bucket_slot DESC LIMIT 20000",
              [symbol],
            )
          ).rows
            .reverse()
            .map((row) => ({
              time: Number(row.bucket_slot) / 10,
              open: Number(row.open),
              high: Number(row.high),
              low: Number(row.low),
              close: Number(row.close),
              volume: Number(row.volume),
            }))
        : undefined;
      const ticks = rows.map((row) =>
        wire(symbol, row, market.config.precision),
      );
      const cursor = ticks.at(-1)?.sequence ?? slot;
      return {
        type: reset ? "snapshot" : "batch",
        source: "internal-otc",
        symbol,
        session: market.session,
        precision: market.config.precision,
        ticks,
        candles,
        cursor,
        catchingUp: slot < desired || cursor < slot,
        serverTime: now / 1000,
      };
    });
  };
}
