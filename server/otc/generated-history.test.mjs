import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {generatedHistory,combineHistory} from './generated-history.mjs';
const options={secret:'private-fixture',anchor:1793790000,price:212,volatility:.12,precision:8,seconds:5,before:1793790000,limit:30};
test('generated analysis history is deterministic, private-seeded, valid and explicitly identified',()=>{
  const page=generatedHistory(options);
  assert.equal(page.candles.length,30);assert.equal(page.hasMore,true);
  assert.deepEqual(generatedHistory(options),page);
  assert.notDeepEqual(generatedHistory({...options,secret:'other-market'}).candles,page.candles);
  assert.ok(page.candles.every(bar=>bar.time<options.anchor&&bar.time%5===0&&bar.low>0&&bar.low<=Math.min(bar.open,bar.close)&&bar.high>=Math.max(bar.open,bar.close)&&bar.volume===50&&bar.origin==='generated-history'));
});
test('1m bars exactly aggregate the same twelve canonical 5s bars and pages agree',()=>{
  const before=Math.floor(options.anchor/60)*60;
  const minute=generatedHistory({...options,before,seconds:60,limit:1}).candles[0];
  const base=generatedHistory({...options,before,limit:12}).candles;
  assert.deepEqual(minute,{time:base[0].time,open:base[0].open,high:Math.max(...base.map(b=>b.high)),low:Math.min(...base.map(b=>b.low)),close:base.at(-1).close,volume:600,origin:'generated-history'});
  const all=generatedHistory({...options,before,limit:20}).candles;
  const older=generatedHistory({...options,before:all[10].time,limit:10}).candles;
  assert.deepEqual(older,all.slice(0,10));
});
test('4h views have months-scale coverage while generated data ends strictly before its live anchor',()=>{
  const page=generatedHistory({...options,seconds:14400,before:Math.ceil(options.anchor/14400)*14400,limit:300});
  assert.ok(page.candles.length>=180);assert.equal(page.hasMore,false);
  assert.ok(page.candles.every(b=>b.time<options.anchor));
});
test('all configured assets can expose valid history without a prior browser selection',async()=>{
  const assets=JSON.parse(await readFile(new URL('./assets.json',import.meta.url),'utf8'));
  for(const [symbol,asset] of Object.entries(assets)){
    const page=generatedHistory({...options,...asset,secret:`fixture:${symbol}`,limit:3});
    assert.equal(page.candles.length,3,symbol);assert.ok(page.candles.every(b=>b.low>0&&b.high>=b.low),symbol);
  }
});
test('mixed boundary buckets preserve recorded close and combine only the synthetic prefix',()=>{
  const generated=[{time:0,open:10,high:12,low:9,close:11,volume:100,origin:'generated-history'}];
  const recorded=[{time:0,open:11,high:15,low:10,close:14,volume:200},{time:60,open:14,high:16,low:12,close:15,volume:600}];
  const merged=combineHistory(generated,recorded,2);
  assert.deepEqual(merged,[{time:0,open:10,high:15,low:9,close:14,volume:300,origin:'mixed'},{...recorded[1],origin:'recorded'}]);
  assert.equal(recorded[0].open,11);
});
