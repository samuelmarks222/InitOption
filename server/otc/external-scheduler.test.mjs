import test from 'node:test';
import assert from 'node:assert/strict';
import {testOTCScheduler} from '../../scripts/test-otc-scheduler.mjs';
const cycle = {skipped:false,result:{processed:[{symbol:'NEAR'}],errors:[],assets:141,remaining:140,complete:false}};
const options = (status=202,body=cycle) => ({origin:'https://www.initoption.com',secret:'test-secret',fetchImpl:async()=>({status,json:async()=>body})});
test('external trigger uses protected HTTPS endpoint, header auth and no redirects',async()=>{
 const args=options();args.fetchImpl=async(url,init)=>{
  assert.equal(url.href,'https://www.initoption.com/api/otc/collect');assert.equal(init.headers.Authorization,'Bearer test-secret');assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert.ok(init.signal);return {status:202,json:async()=>cycle};
 };const result=await testOTCScheduler(args);assert.equal(result.processed,1);assert.equal(result.complete,false);assert.ok(!JSON.stringify(result).includes('test-secret'));
});
test('accepts complete cycle without claiming continuous execution',async()=>{
 const result=await testOTCScheduler(options(200,{...cycle,result:{...cycle.result,complete:true,remaining:0}}));assert.equal(result.complete,true);assert.match(result.note,/not proof/);
});
test('rejects unsafe origins before sending secret',async()=>{
 for(const origin of ['http://example.com','https://user:pass@example.com','https://example.com/other','https://example.com/?key=x','https://example.com/#x'])await assert.rejects(testOTCScheduler({...options(),origin}));
});
test('requires a secret and rejects header injection',async()=>{
 for(const secret of ['',undefined,'x\r\ny'])await assert.rejects(testOTCScheduler({...options(),secret}));
});
test('rejects failed HTTP status without exposing response body',async()=>{
 for(const status of [301,401,404,503])await assert.rejects(testOTCScheduler(options(status)),new RegExp(`HTTP ${status}`));
});
test('skipped cycles are not reported as successful work',async()=>{
 await assert.rejects(testOTCScheduler(options(200,{skipped:true,reason:'disabled-or-running'})),/skipped/);
});
test('rejects HTML, malformed JSON shapes, zero work and asset errors',async()=>{
 for(const body of ['<html/>',{}, {...cycle,result:{...cycle.result,processed:[]}}, {...cycle,result:{...cycle.result,errors:[{}]}}])await assert.rejects(testOTCScheduler(options(200,body)));
});
test('network failures propagate to caller',async()=>{
 await assert.rejects(testOTCScheduler({...options(),fetchImpl:async()=>{throw new Error('network failure');}}),/network failure/);
});
