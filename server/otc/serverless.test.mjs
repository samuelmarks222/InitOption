import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createServerlessOTC} from './serverless.mjs';
const schema=await readFile(new URL('../../neon/013_otc_serverless.sql',import.meta.url),'utf8');
const assets={AAPL:{price:212,volatility:.12,precision:8,support:200,resistance:225,drift:0}};
async function setup(options={}){
  const db=new PGlite();await db.exec(schema);
  let now=1793790000000;
  const transaction=fn=>db.transaction(tx=>fn(tx));
  const read=createServerlessOTC({transaction,assets,nowForTests:()=>now,warmup:20,...options});
  return {db,transaction,read,advance:ms=>{now+=ms;},now:()=>now};
}
test('PostgreSQL persists one sequence and identical prices across cold workers and concurrent readers',async()=>{
  const app=await setup();try{
    const one=await app.read({symbol:'AAPL'});assert.equal(one.type,'snapshot');assert.equal(one.ticks.length,21);
    app.advance(500);
    const worker=createServerlessOTC({transaction:app.transaction,assets,warmup:20,nowForTests:app.now});
    const [a,b]=await Promise.all([app.read({symbol:'AAPL',after:one.cursor}),worker({symbol:'AAPL',after:one.cursor})]);
    assert.deepEqual(a.ticks,b.ticks);assert.equal(a.ticks.length,5);
    assert.equal((await app.db.query('SELECT count(*)::int AS n FROM otc_markets')).rows[0].n,1);
    const rows=(await app.db.query('SELECT slot FROM otc_ticks ORDER BY slot')).rows;assert.equal(new Set(rows.map(r=>r.slot)).size,rows.length);
    assert.equal((await worker({symbol:'AAPL'})).session,one.session);
    assert.equal(JSON.stringify(a).includes('secret'),false);
  }finally{await app.db.close();}
});
test('entry and exact expiry read the same persisted tick; invalid and future requests do not mutate prices',async()=>{
  const app=await setup();try{
    const initial=await app.read({symbol:'AAPL'}),tick=initial.ticks.at(-1);
    const at=Number(tick.t)/1e6;
    const quote=await app.read({action:'price',symbol:'AAPL',at});assert.equal(quote.p,tick.p);
    app.advance(1500);await app.read({symbol:'AAPL',after:initial.cursor});
    assert.equal((await app.read({action:'price',symbol:'AAPL',at})).p,tick.p);
    await assert.rejects(()=>app.read({action:'price',symbol:'AAPL',at:app.now()/1000+1}),e=>e.status===425);
    await assert.rejects(()=>app.read({symbol:'UNKNOWN'}),e=>e.status===400);
    await assert.rejects(()=>app.read({symbol:'AAPL',after:-1}),e=>e.status===400);
  }finally{await app.db.close();}
});
test('bounded catch-up commits progress without pretending an old price is current',async()=>{
  const app=await setup({maxBatch:5});try{
    const first=await app.read({symbol:'AAPL'});assert.equal(first.catchingUp,true);
    let result=await app.read({action:'price',symbol:'AAPL'});assert.equal(result.pending,true);
    for(let i=0;i<10&&result.pending;i++)result=await app.read({action:'price',symbol:'AAPL'});
    assert.equal(result.source,'internal-otc');assert.equal(result.timestamp,app.now()/1000);
    assert.equal((await app.db.query('SELECT count(*)::int AS n FROM otc_ticks')).rows[0].n,21);
  }finally{await app.db.close();}
});
test('durable model checkpoint and HMAC randomness produce the same next ticks regardless of request batching',async()=>{
  const app=await setup();try{
    const initial=await app.read({symbol:'AAPL'});
    await app.db.exec('CREATE TEMP TABLE saved_market AS TABLE otc_markets; CREATE TEMP TABLE saved_ticks AS TABLE otc_ticks; CREATE TEMP TABLE saved_bars AS TABLE otc_bars;');
    app.advance(1000);const batch=await app.read({symbol:'AAPL',after:initial.cursor});
    await app.db.exec('DELETE FROM otc_ticks; DELETE FROM otc_bars; INSERT INTO otc_bars SELECT * FROM saved_bars; UPDATE otc_markets SET model=s.model,last_slot=s.last_slot,pruned_slot=s.pruned_slot FROM saved_market s WHERE otc_markets.symbol=s.symbol; INSERT INTO otc_ticks SELECT * FROM saved_ticks;');
    const small=createServerlessOTC({transaction:app.transaction,assets,warmup:20,maxBatch:3,nowForTests:app.now});
    let cursor=initial.cursor;const combined=[];
    for(let i=0;i<4;i++){const part=await small({symbol:'AAPL',after:cursor});combined.push(...part.ticks);cursor=part.cursor;}
    assert.deepEqual(combined,batch.ticks);
  }finally{await app.db.close();}
});
test('database failures roll back ticks, bars and model together, and a later request resumes exactly once',async()=>{
  const app=await setup();try{
    const first=await app.read({symbol:'AAPL'});app.advance(500);
    const failing=createServerlessOTC({assets,nowForTests:app.now,transaction:fn=>app.transaction(client=>fn({query:(sql,args)=>{
      if(sql.startsWith('UPDATE public.otc_markets'))throw new Error('injected write failure');
      return client.query(sql,args);
    }}))});
    await assert.rejects(()=>failing({symbol:'AAPL',after:first.cursor}),/injected/);
    assert.equal(Number((await app.db.query('SELECT last_slot FROM otc_markets')).rows[0].last_slot),first.cursor);
    assert.equal((await app.db.query('SELECT count(*)::int AS n FROM otc_ticks')).rows[0].n,21);
    const resumed=await app.read({symbol:'AAPL',after:first.cursor});assert.equal(resumed.ticks.length,5);
    const raw=(await app.db.query('SELECT min(price) AS low,max(price) AS high,count(*)::int AS n FROM otc_ticks')).rows[0];
    const bars=(await app.db.query('SELECT min(low) AS low,max(high) AS high,sum(volume)::int AS n FROM otc_bars')).rows[0];
    assert.deepEqual(bars,raw);
  }finally{await app.db.close();}
});
test('SQL migration and serverless bootstrap schema stay identical',async()=>{
  const bootstrap=await readFile(new URL('../../api/_lib/otcSchema.ts',import.meta.url),'utf8');
  assert.equal(JSON.parse(bootstrap.split('export const OTC_SCHEMA = ')[1].trim().slice(0,-1)),schema);
});
test('history pages aggregate persisted OHLC, page backwards, and never generate prices',async()=>{
  const app=await setup();try{
    await app.read({symbol:'AAPL'});
    const base=Math.floor(app.now()/1000/60)*60-3600;
    await app.db.query(`INSERT INTO otc_bars(symbol,bucket_slot,open,high,low,close,volume) VALUES
      ('AAPL',$1,10,14,9,12,2),('AAPL',$2,12,16,11,15,3),('AAPL',$3,15,18,13,17,4)`,[base*10,(base+5)*10,(base+60)*10]);
    const before=(await app.db.query('SELECT model,last_slot FROM otc_markets')).rows;
    const page=await app.read({symbol:'AAPL',action:'history',seconds:60,before:base+120,limit:1});
    assert.equal(page.hasMore,true);assert.deepEqual(page.candles,[{time:base+60,open:15,high:18,low:13,close:17,volume:4}]);
    const older=await app.read({symbol:'AAPL',action:'history',seconds:60,before:page.candles[0].time,limit:1});
    assert.equal(older.hasMore,false);assert.deepEqual(older.candles,[{time:base,open:10,high:16,low:9,close:15,volume:5}]);
    assert.deepEqual((await app.db.query('SELECT model,last_slot FROM otc_markets')).rows,before);
    for(const args of [{seconds:7},{limit:1001},{before:base+1,seconds:60},{before:-1}])await assert.rejects(()=>app.read({symbol:'AAPL',action:'history',...args}),e=>e.status===400);
  }finally{await app.db.close();}
});
test('candle archives survive raw-tick retention and remain available to cold workers',async()=>{
  const app=await setup({retention:100,barRetention:1000});try{
    const first=await app.read({symbol:'AAPL'});app.advance(70000);await app.read({symbol:'AAPL',after:first.cursor});
    const raw=(await app.db.query('SELECT min(slot) AS first FROM otc_ticks')).rows[0].first;
    const bars=(await app.db.query('SELECT min(bucket_slot) AS first FROM otc_bars')).rows[0].first;
    assert.ok(Number(bars)<Number(raw)-100);
    const worker=createServerlessOTC({transaction:app.transaction,assets,nowForTests:app.now});
    const page=await worker({symbol:'AAPL',action:'history',seconds:5});assert.ok(page.candles.some(b=>b.time<Number(raw)/10));
  }finally{await app.db.close();}
});
