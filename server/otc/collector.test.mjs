import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createOTCCollector} from './collector.mjs';
test('collects every configured asset without browser subscriptions using the shared tick writer',async()=>{
  const calls=[];
  const collect=createOTCCollector({transaction:async fn=>fn({query:async()=>({rows:[{symbol:'A',last_slot:20},{symbol:'B',last_slot:10}]})}),assets:{A:{},B:{},C:{}},read:async args=>{calls.push(args);return {cursor:30,catchingUp:false};},now:()=>0});
  const result=await collect();
  assert.deepEqual(calls.map(row=>row.symbol),['C','B','A']);
  assert.ok(calls.every(row=>row.action==='ticks'));assert.equal(result.complete,true);
  assert.equal(calls[1].after,10);assert.equal(result.assets,3);
});
test('stops before starting new work when budget expires, allowing next invocation to prioritize lagging assets',async()=>{
  let now=0;const calls=[];
  const collect=createOTCCollector({transaction:async fn=>fn({query:async()=>({rows:[]})}),assets:{A:{},B:{},C:{}},budgetMs:10,now:()=>now,read:async args=>{calls.push(args.symbol);now+=10;return {cursor:1,catchingUp:false};}});
  const result=await collect();assert.deepEqual(calls,['A']);assert.equal(result.remaining,2);assert.equal(result.complete,false);
});
test('reports failures and catch-up instead of claiming the collection cycle is current',async()=>{
  const collect=createOTCCollector({transaction:async fn=>fn({query:async()=>({rows:[]})}),assets:{A:{},B:{}},now:()=>0,read:async args=>{if(args.symbol==='A')throw new Error('offline');return {cursor:1,catchingUp:true};}});
  const result=await collect();assert.equal(result.errors.length,1);assert.equal(result.processed.length,1);assert.equal(result.complete,false);
});
test('runs bounded parallel waves while retaining lag-prioritized results',async()=>{
 let active=0,maxActive=0;const started=[];
 const collect=createOTCCollector({transaction:async fn=>fn({query:async()=>({rows:[]})}),assets:{A:{},B:{},C:{},D:{},E:{}},concurrency:2,now:()=>0,read:async({symbol})=>{
   active++;maxActive=Math.max(maxActive,active);started.push(symbol);await new Promise(resolve=>setTimeout(resolve,5));active--;return {cursor:1,catchingUp:false};
 }});
 const result=await collect();assert.equal(maxActive,2);assert.deepEqual(started,['A','B','C','D','E']);assert.equal(result.complete,true);
});
test('stops launching new waves after the durable switch turns off',async()=>{
 let enabled=true;const calls=[];
 const collect=createOTCCollector({transaction:async fn=>fn({query:async()=>({rows:[]})}),assets:{A:{},B:{},C:{}},concurrency:2,shouldContinue:async()=>enabled,now:()=>0,read:async({symbol})=>{
   calls.push(symbol);enabled=false;return {cursor:1,catchingUp:false};
 }});
 const result=await collect();assert.equal(calls.length,2);assert.equal(result.remaining,1);assert.equal(result.complete,false);
});
test('validates execution limits and treats malformed writer results as asset failures',async()=>{
 for(const concurrency of [0,-1,9,1.5])assert.throws(()=>createOTCCollector({concurrency}),/limits/);
 const collect=createOTCCollector({transaction:async fn=>fn({query:async()=>({rows:[]})}),assets:{A:{}},read:async()=>undefined});
 assert.equal((await collect()).errors.length,1);
});
