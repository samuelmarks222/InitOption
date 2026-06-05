import { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType, IPriceLine, LineStyle, Time } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

const UP = "#00C076";
const DN = "#F6465D";
const RESULT_MS = 4000;

type ExInfo = { direction: "higher" | "lower"; amount: number; entry_price: number; payout_rate: number; opened_at: string; expiry_seconds: number; expiresAtMs: number; isWin: boolean };

const tfLabel = (s: number) => {
  if (s === 60) return "M1"; if (s === 300) return "M5"; if (s === 900) return "M15";
  if (s === 1800) return "M30"; if (s === 3600) return "H1"; if (s === 14400) return "H4";
  if (s === 86400) return "D1"; return `${s}s`;
};

type DP = { time?: unknown; close?: number };
const lastClose = (s: ISeriesApi<SeriesType>) => {
  try { const d = (s as unknown as { data?: () => DP[] }).data?.(); if (d?.length) { const c = d[d.length - 1].close; if (typeof c === "number" && Number.isFinite(c)) return c; } return null; } catch { return null; }
};

const parseTime = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v > 1_000_000_000_000 ? Math.floor(v / 1000) : Math.floor(v);
  if (typeof v === "string") { const n = Number(v); if (Number.isFinite(n)) return n > 1_000_000_000_000 ? Math.floor(n / 1000) : Math.floor(n); const p = Date.parse(v); if (!Number.isNaN(p)) return Math.floor(p / 1000); }
  if (v instanceof Date) return Math.floor(v.getTime() / 1000);
  return null;
};

const getX = (chart: IChartApi, trade: ActiveTrade) => {
  if (trade.marker_time != null && Number.isFinite(trade.marker_time)) {
    const x = chart.timeScale().timeToCoordinate(trade.marker_time as Time);
    if (x != null && Number.isFinite(x)) return x;
  }
  if (trade.marker_logical != null && Number.isFinite(trade.marker_logical)) {
    const x = chart.timeScale().logicalToCoordinate(trade.marker_logical as never);
    if (x != null && Number.isFinite(x)) return x;
  }
  const t = parseTime(trade.opened_at);
  if (t != null) {
    const x = chart.timeScale().timeToCoordinate(t as Time);
    if (x != null && Number.isFinite(x)) return x;
  }
  const vr = chart.timeScale().getVisibleLogicalRange();
  if (vr) return chart.timeScale().logicalToCoordinate(vr.from + 2 as never);
  return null;
};

interface Props { chart: IChartApi; series: ISeriesApi<SeriesType>; assetSymbol: string; trades: ActiveTrade[]; timeframeSeconds: number; }

export const TradeMarkersOverlay = ({ chart, series, assetSymbol, trades }: Props) => {
  const cRef = useRef<HTMLDivElement>(null);
  const plRef = useRef<Record<string, IPriceLine>>({});
  const sRef = useRef(series);
  const chRef = useRef(chart);
  const pillsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const trRef = useRef(trades);
  const exRef = useRef<Map<string, ExInfo>>(new Map());

  useEffect(() => { sRef.current = series; }, [series]);
  useEffect(() => { chRef.current = chart; }, [chart]);
  useEffect(() => { trRef.current = trades; }, [trades]);

  const myTrades = trades.filter((t) => t.asset_symbol === assetSymbol);

  useEffect(() => {
    const s = sRef.current; if (!s) return;
    const lines = plRef.current;
    const ids = new Set(myTrades.map((t) => t.id));
    Object.keys(lines).forEach((id) => { if (!ids.has(id)) { try { s.removePriceLine(lines[id]); } catch {} delete lines[id]; } });
    myTrades.forEach((t) => {
      const c = t.direction === "higher" ? UP : DN;
      const o = { price: t.entry_price, color: c, lineStyle: LineStyle.Solid as const, lineWidth: 1, axisLabelVisible: false };
      if (lines[t.id]) lines[t.id].applyOptions(o);
      else try { lines[t.id] = s.createPriceLine(o); } catch {}
    });
  }, [myTrades]);

  useEffect(() => { return () => { const s = sRef.current; Object.values(plRef.current).forEach((l) => { try { s?.removePriceLine(l); } catch {} }); plRef.current = {}; }; }, []);

  useEffect(() => {
    const el = cRef.current; if (!el) return;
    const pills = pillsRef.current;
    const expired = exRef.current;
    const cur = new Set(myTrades.map((t) => t.id));
    const now = Date.now();

    pills.forEach((e, id) => {
      if (cur.has(id) || expired.has(id)) return;
      const live = trRef.current.find((t) => t.id === id);
      if (live) {
        const rem = live.expiry_seconds - (now - new Date(live.opened_at).getTime()) / 1000;
        if (rem <= 0) {
          const lc = lastClose(sRef.current);
          const up = live.direction === "higher";
          const won = lc !== null ? (up ? lc > live.entry_price : lc < live.entry_price) : false;
          expired.set(id, { direction: live.direction, amount: live.amount, entry_price: live.entry_price, payout_rate: live.payout_rate, opened_at: live.opened_at, expiry_seconds: live.expiry_seconds, expiresAtMs: now + RESULT_MS, isWin: won });
        } else { e.remove(); pills.delete(id); }
      } else { e.remove(); pills.delete(id); }
    });

    myTrades.forEach((t) => {
      if (pills.has(t.id)) return;
      const e = document.createElement("div");
      e.style.cssText = "position:absolute;pointer-events:none;white-space:nowrap;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;font-family:Inter,monospace;color:#FFF;background:rgba(26,26,42,0.88);border:1px solid;z-index:5;display:none";
      el.appendChild(e);
      pills.set(t.id, e);
    });

    return () => { pills.forEach((e) => e.remove()); pills.clear(); expired.clear(); };
  }, [myTrades]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const container = cRef.current; if (!container) { raf = requestAnimationFrame(loop); return; }
      const cw = container.clientWidth;
      const pills = pillsRef.current;
      const current = trRef.current;
      const expired = exRef.current;
      const now = Date.now();
      const ch = chRef.current;
      const sr = sRef.current;

      expired.forEach((info, id) => {
        const e = pills.get(id);
        if (!e) { expired.delete(id); return; }
        if (now > info.expiresAtMs) { e.remove(); pills.delete(id); expired.delete(id); return; }
        const y = sr.priceToCoordinate(info.entry_price);
        if (y == null || !Number.isFinite(y)) { e.style.display = "none"; return; }
        const up = info.direction === "higher";
        const arrow = up ? "▲" : "▼";
        e.style.display = ""; e.style.left = "12px";
        if (info.isWin) { e.textContent = `${arrow} +$${(info.amount * info.payout_rate).toFixed(2)}`; e.style.borderColor = UP; }
        else { e.textContent = `${arrow} -$${info.amount.toFixed(2)}`; e.style.borderColor = DN; }
        const ey = y + (up ? -22 : 22);
        e.style.top = `${Math.max(4, Math.min(ey, container.clientHeight - 20))}px`;
      });

      pills.forEach((e, id) => {
        if (expired.has(id)) return;
        const trade = current.find((t) => t.id === id);
        if (!trade) { e.style.display = "none"; return; }

        let x: number | null = getX(ch, trade);
        let y = sr.priceToCoordinate(trade.entry_price);
        if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) { e.style.display = "none"; return; }
        const clampX = Math.max(4, Math.min(x, cw - 4));

        const up = trade.direction === "higher";
        const arrow = up ? "▲" : "▼";
        const col = up ? UP : DN;
        e.style.display = ""; e.style.borderColor = col;

        const rem = Math.max(0, trade.expiry_seconds - (now - new Date(trade.opened_at).getTime()) / 1000);

        if (rem <= 0) {
          const lc = lastClose(sr);
          const won = lc !== null ? (up ? lc > trade.entry_price : lc < trade.entry_price) : false;
          if (won) { e.textContent = `${arrow} +$${(trade.amount * trade.payout_rate).toFixed(2)}`; e.style.borderColor = UP; }
          else { e.textContent = `${arrow} -$${trade.amount.toFixed(2)}`; e.style.borderColor = DN; }
        } else {
          const mins = Math.floor(rem / 60);
          const secs = Math.floor(rem % 60);
          e.textContent = `${arrow} $${trade.amount.toFixed(2)}  ${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}  ${tfLabel(trade.expiry_seconds)}  ${secs.toString().padStart(2, "0")}`;
        }

        e.style.left = `${clampX}px`;
        const ty = y + (up ? -22 : 22);
        e.style.top = `${Math.max(4, Math.min(ty, container.clientHeight - 20))}px`;
      });

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <div ref={cRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 85 }} />;
};
