import {createChart, CandlestickSeries, AreaSeries, BarSeries, LineSeries} from '../src/components/trading/engine/native/chart.ts';
import {TickBuffer, ChartTypeManager, intervals, aggregateTicks, heikinAshi} from './ticks.js';
import {MarketDataAdapter} from './adapter.js';
const $ = id => document.getElementById(id);
const chart = createChart($('chart'),{layout:{background:{color:'#202638'},textColor:'#9faec6'},grid:{vertLines:{color:'#2a3247'},horzLines:{color:'#2a3247'}},rightPriceScale:{scaleMargins:{top:.1,bottom:.1}},timeScale:{timeVisible:true,secondsVisible:true,shiftVisibleRangeOnNewBar:true}});
let buffer = new TickBuffer(), manager = new ChartTypeManager(), adapter, series, sma, drawing = false, firstAnchor = null, drawings = [], drawSeries = [], rawBars = [], displayBars = [];
function makeSeries() {
  if (series) chart.removeSeries(series);
  series = chart.addSeries(manager.type === 'area' ? AreaSeries : manager.type === 'bars' ? BarSeries : CandlestickSeries,{upColor:'#00c68b',downColor:'#ff5261',wickUpColor:'#00c68b',wickDownColor:'#ff5261',lineColor:'#35b6ef',topColor:'rgba(53,182,239,.3)',bottomColor:'rgba(53,182,239,.01)',priceFormat:{type:'price',precision:5,minMove:.00001}});
}
function render(full = false) {
  if (full) {
    rawBars = aggregateTicks(buffer.snapshot(),intervals[manager.timeframe]);
    displayBars = manager.type === 'heikinAshi' ? heikinAshi(rawBars) : rawBars.map(bar => ({...bar}));
  } else {
    const tick = buffer.latest;
    if (!tick) return;
    const time = Math.floor(tick.timestamp/intervals[manager.timeframe])*intervals[manager.timeframe];
    let bar = rawBars.at(-1);
    if (bar?.time === time) {
      bar.high = Math.max(bar.high,tick.price); bar.low = Math.min(bar.low,tick.price); bar.close = tick.price; bar.volume += tick.volume ?? 1;
    } else { bar = {time,open:tick.price,high:tick.price,low:tick.price,close:tick.price,volume:tick.volume ?? 1}; rawBars.push(bar); }
    const index = rawBars.length-1, previous = displayBars[index-1];
    if (manager.type === 'heikinAshi') {
      const open = previous ? (previous.open+previous.close)/2 : (bar.open+bar.close)/2;
      const close = (bar.open+bar.high+bar.low+bar.close)/4;
      displayBars[index] = {...bar,open,close,high:Math.max(bar.high,open,close),low:Math.min(bar.low,open,close)};
    } else displayBars[index] = {...bar};
  }
  const bars = displayBars;
  const point = bar => manager.type === 'area' ? {time:bar.time,value:bar.close} : bar;
  if (full) series.setData(bars.map(point)); else if (bars.length) series.update(point(bars.at(-1)));
  if ($('sma').checked) {
    if (!sma) { sma = chart.addSeries(LineSeries,{color:'#f9c567',lineWidth:1,priceLineVisible:false}); full = true; }
    if (full) {
      let sum = 0; const values = [];
      bars.forEach((bar,i) => { sum += bar.close; if (i >= 20) sum -= bars[i-20].close; if (i >= 19) values.push({time:bar.time,value:sum/20}); });
      sma.setData(values);
    } else if (bars.length >= 20) sma.update({time:bars.at(-1).time,value:bars.slice(-20).reduce((sum,bar) => sum+bar.close,0)/20});
  } else if (sma) { chart.removeSeries(sma); sma = null; }
  const latest = buffer.latest;
  if (latest) $('quote').textContent = `${latest.symbol}  ${latest.price}  ·  ${new Date(latest.timestamp*1000).toISOString()}`;
  $('depth').textContent = `${buffer.rows.length.toLocaleString()} received ticks · ${bars.length.toLocaleString()} candles`;
  $('timeframe').value = manager.timeframe; $('timeframe').disabled = manager.type === 'area';
  if (full) redrawDrawings();
}
function redrawDrawings() {
  for (const line of drawSeries) chart.removeSeries(line); drawSeries = [];
  // Anchors retain market time/price. Project into the selected interval's bucket.
  for (const anchors of drawings) {
    const line = chart.addSeries(LineSeries,{color:'#a58aff',lineWidth:2,priceLineVisible:false,lastValueVisible:false});
    const points = anchors.map(p => ({time:Math.floor(p.time/intervals[manager.timeframe])*intervals[manager.timeframe],value:p.price}));
    line.setData(points.sort((a,b) => a.time-b.time)); drawSeries.push(line);
  }
}
for (const label of Object.keys(intervals)) $('timeframe').add(new Option(label,label));
$('type').onchange = () => { manager.setType($('type').value); makeSeries(); render(true); };
$('timeframe').onchange = () => { manager.setTimeframe($('timeframe').value); render(true); };
$('sma').onchange = () => render(true);
$('fit').onclick = () => chart.timeScale().fitContent();
$('draw').onclick = () => { drawing = !drawing; firstAnchor = null; $('draw').textContent = drawing ? 'Select two points…' : 'Draw trendline'; };
$('clear').onclick = () => { drawings = []; redrawDrawings(); };
chart.subscribeClick(event => {
  if (!drawing || !event.point || !Number.isFinite(Number(event.time))) return;
  const price = series.coordinateToPrice(event.point.y); if (!Number.isFinite(price)) return;
  const anchor = {time:Number(event.time),price};
  if (!firstAnchor) firstAnchor = anchor;
  else { drawings.push([firstAnchor,anchor]); firstAnchor = null; drawing = false; $('draw').textContent = 'Draw trendline'; redrawDrawings(); }
});
function sourceLabel() { $('notice').textContent = $('mode').value === 'simulation' ? 'SIMULATION — NOT REAL MARKET DATA' : 'LIVE MODE — RECEIVED MARKET DATA ONLY'; }
$('mode').onchange = () => { adapter?.disconnect(); sourceLabel(); $('url').value = ''; $('history').value = ''; };
$('connect').onclick = () => {
  adapter?.disconnect(); buffer = new TickBuffer(); drawings = []; render(true); sourceLabel(); $('quote').textContent = 'Awaiting ticks';
  adapter = new MarketDataAdapter({url:$('url').value.trim(),historyUrl:$('history').value.trim(),symbol:$('symbol').value.trim(),mode:$('mode').value,buffer,
    onTick:tick => { const latest = buffer.latest; render(tick.timestamp < latest.timestamp || tick.timestamp === latest.timestamp && (tick.sequence ?? 0) < (latest.sequence ?? 0) || buffer.rows.length >= buffer.maxTicks); },
    onHistory:() => { render(true); chart.timeScale().fitContent(); },onStatus:status => { $('status').textContent = status; }});
  adapter.connect();
};
$('disconnect').onclick = () => adapter?.disconnect();
// Same-origin defaults work behind HTTPS preview proxies. Never call browser localhost.
if (location.protocol !== 'file:') { $('url').value = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ticks`; $('history').value = `${location.origin}/history`; }
makeSeries();
window.addEventListener('pagehide', () => { adapter?.disconnect(); chart.remove(); },{once:true});
