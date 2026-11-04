import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { configureOTCScheduler,OTC_CRON_PATH } from '../../scripts/configure-otc-scheduler.mjs';
test('frequent cron is opt-in and cannot silently break a Hobby deployment',()=>{
 const config={crons:[{path:'/api/cron',schedule:'0 7 * * *'}],functions:{'api/system.ts':{maxDuration:30}}};
 assert.throws(()=>configureOTCScheduler(config,{enable:true}),/supported plan/);
 const enabled=configureOTCScheduler(config,{enable:true,confirmed:true});
 assert.deepEqual(enabled.crons,[...config.crons,{path:OTC_CRON_PATH,schedule:'* * * * *'}]);
 assert.equal(config.crons.length,1);assert.deepEqual(configureOTCScheduler(enabled,{enable:true,confirmed:true}),enabled);
 assert.deepEqual(configureOTCScheduler(enabled,{enable:false}),config);
});
test('collector cron alias reuses the existing protected Vercel Function',async()=>{
 const config=JSON.parse(await readFile(new URL('../../vercel.json',import.meta.url),'utf8'));
 assert.ok(config.rewrites.some(row=>row.source===OTC_CRON_PATH&&row.destination==='/api/system?route=otc&action=collect'));
 const jobs=config.crons.filter(row=>row.path===OTC_CRON_PATH);assert.ok(jobs.length<=1);if(jobs.length)assert.equal(jobs[0].schedule,'* * * * *');
});
