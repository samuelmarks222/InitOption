import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createOTCBackground } from './background.mjs';
import { createServerlessOTC } from './serverless.mjs';
import { createOTCCollector } from './collector.mjs';
const schema=await readFile(new URL('../../neon/013_otc_serverless.sql',import.meta.url),'utf8');
const controlSchema=await readFile(new URL('../../neon/014_otc_collection_control.sql',import.meta.url),'utf8');
const schedulerSchema=await readFile(new URL('../../neon/016_otc_scheduler_health.sql',import.meta.url),'utf8');
const assets={AAPL:{price:212,precision:8,volatility:.12,support:200,resistance:225,drift:0},'EUR/USD':{price:1.1,precision:8,volatility:.0006,support:1,resistance:1.2,drift:0}};
async function setup(collectOverride) {
  const db=new PGlite();await db.exec(schema+controlSchema+schedulerSchema);
  const transaction=fn=>db.transaction(tx=>fn(tx));
  let time=Date.now();
  const read=createServerlessOTC({transaction,assets,warmup:0,nowForTests:()=>time});
  const collect=collectOverride??createOTCCollector({transaction,assets,read});
  const background=createOTCBackground({transaction,assets,collect});
  return {db,transaction,read,background,advance:ms=>{time+=ms;}};
}
const admin='00000000-0000-4000-8000-000000000001';
test('durable global switch defaults off and enables all unviewed assets without changing history provenance',async()=>{
  const app=await setup();try{
    assert.equal((await app.background.status()).enabled,false);
    assert.equal((await app.background.run()).skipped,true);
    assert.equal((await app.background.status()).initializedAssets,0);
    await app.background.setEnabled(true,admin);
    assert.equal((await app.background.run()).result.assets,2);
    app.advance(10000);await app.background.run();
    const status=await app.background.status();
    assert.equal(status.enabled,true);assert.equal(status.initializedAssets,2);assert.equal(status.currentAssets,2);
    assert.equal(status.running,false);assert.ok(status.lastFinishedAt);assert.equal(status.lastResult.complete,true);
    const restarted=createOTCBackground({transaction:app.transaction,assets,collect:async()=>{throw new Error('must not run');}});
    assert.equal((await restarted.status()).enabled,true);
    for(const symbol of Object.keys(assets)) {
      const history=await app.read({symbol,action:'history',seconds:5,limit:20});
      assert.equal(history.generated,false);assert.ok(history.candles.length>0);
      assert.ok(history.candles.every(row=>row.origin==='recorded'));
    }
    await restarted.setEnabled(false,admin);
    assert.equal((await restarted.run()).skipped,true);
    assert.equal((await restarted.status()).initializedAssets,2);
    assert.equal((await app.db.query('SELECT updated_by FROM otc_collection_control')).rows[0].updated_by,admin);
    await assert.rejects(()=>restarted.setEnabled('true',admin),/boolean/);
  }finally{await app.db.close();}
});
test('lease prevents overlapping workers, and status never exposes the lease token',async()=>{
  let release;let started;const began=new Promise(resolve=>{started=resolve;});
  const app=await setup(async()=>{started();await new Promise(resolve=>{release=resolve;});return {assets:2,processed:[],errors:[],remaining:2,complete:false};});
  try{
    await app.background.setEnabled(true,admin);
    const run=app.background.run();await began;
    assert.equal((await app.background.status()).running,true);
    assert.equal((await app.background.run()).skipped,true);
    assert.equal(JSON.stringify(await app.background.status()).includes('lease_token'),false);
    release();await run;assert.equal((await app.background.status()).running,false);
  }finally{await app.db.close();}
});
test('failed cycles release leases and expose failure rather than a stale successful result',async()=>{
  let fail=true;
  const app=await setup(async()=>{if(fail)throw new Error('db unavailable');return {assets:2,processed:[],errors:[],remaining:2,complete:false};});
  try{
    await app.background.setEnabled(true,admin);
    await assert.rejects(app.background.run,/db unavailable/);
    const status=await app.background.status();assert.ok(status.lastError);assert.equal(status.lastResult,null);assert.equal(status.running,false);
    fail=false;await app.background.run();assert.equal((await app.background.status()).lastError,null);
  }finally{await app.db.close();}
});
test('runtime control DDL stays identical to the checked-in migration',async()=>{
  const runtime=await readFile(new URL('../../api/_lib/otcSchema.ts',import.meta.url),'utf8');
  const encoded=runtime.match(/OTC_COLLECTION_SCHEMA = (".*");/)[1];
  assert.equal(JSON.parse(encoded),controlSchema);
});

test('manual cycles cannot establish scheduler health; authenticated runs must demonstrate freshness',async()=>{
  const app=await setup();try{
    await app.background.setEnabled(true,admin);
    await app.background.run();
    assert.equal((await app.background.status()).scheduler.state,'missing');
    await app.background.run({scheduled:true});
    assert.equal((await app.background.status()).scheduler.state,'verifying');
    await app.background.run({scheduled:true});
    assert.equal((await app.background.status()).scheduler.state,'healthy');
    await app.db.query("UPDATE otc_collection_control SET last_scheduled_at=now()-interval '5 minutes'");
    assert.equal((await app.background.status()).scheduler.state,'missing');
    await app.background.setEnabled(false,admin);
    assert.equal((await app.background.status()).scheduler.state,'disabled');
  }finally{await app.db.close();}
});
test('scheduler health never treats a recently invoked but stale catalog as healthy',async()=>{
  const app=await setup();try{
    await app.background.setEnabled(true,admin);
    await app.background.run({scheduled:true});await app.background.run({scheduled:true});
    await app.db.query("UPDATE otc_markets SET last_slot=last_slot-3000");
    const status=await app.background.status();assert.equal(status.scheduler.state,'lagging');assert.equal(status.scheduler.freshAssets,0);
  }finally{await app.db.close();}
});
test('runtime scheduler DDL matches its migration',async()=>{
 const runtime=await readFile(new URL('../../api/_lib/otcSchema.ts',import.meta.url),'utf8');
 assert.equal(JSON.parse(runtime.match(/OTC_SCHEDULER_SCHEMA = (".*");/)[1]),schedulerSchema);
});
test('a manual cycle cannot clear a scheduler failure or inflate its success count',async()=>{
 let fail=false;
 const app=await setup(async()=>{if(fail)throw new Error('offline');return {assets:2,processed:[{symbol:'AAPL',cursor:1,catchingUp:false}],errors:[],remaining:1,complete:false};});
 try{
   await app.background.setEnabled(true,admin);fail=true;
   await assert.rejects(()=>app.background.run({scheduled:true}));
   fail=false;await app.background.run();
   const status=await app.background.status();assert.equal(status.scheduler.state,'error');assert.equal(status.scheduler.consecutiveSuccesses,0);assert.ok(status.scheduler.lastError);
 }finally{await app.db.close();}
});
test('an obsolete worker cannot publish scheduler health after its lease is replaced',async()=>{
 let release;let started;const began=new Promise(resolve=>{started=resolve;});
 const app=await setup(async()=>{started();await new Promise(resolve=>{release=resolve;});return {assets:2,processed:[{symbol:'AAPL',cursor:1,catchingUp:false}],errors:[],remaining:1,complete:false};});
 try{
  await app.background.setEnabled(true,admin);const run=app.background.run({scheduled:true});await began;
  await app.db.query("UPDATE otc_collection_control SET lease_token='replacement-worker',scheduled_consecutive_successes=0,last_scheduled_finished_at=NULL");
  release();await run;const status=await app.background.status();assert.equal(status.scheduler.consecutiveSuccesses,0);assert.equal(status.scheduler.lastFinishedAt,null);
 }finally{await app.db.close();}
});
