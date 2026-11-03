import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkVercelFunctionBudget,listApiEntries} from './check-vercel-functions.mjs';

test('repository stays at 12 deployable Functions with OTC as a helper',()=>{
  const entries=checkVercelFunctionBudget();
  assert.equal(entries.length,12);assert.ok(entries.includes('api/system.ts'));
  assert.equal(existsSync('api/otc.ts'),false);assert.ok(existsSync('api/_lib/otcHandler.ts'));
  const config=JSON.parse(readFileSync('vercel.json','utf8'));
  assert.equal(config.functions['api/system.ts'].includeFiles,'server/otc/assets.json');
  assert.equal(config.functions['api/otc.ts'],undefined);
  for(const [path,destination]of [
    ['/api/otc','/api/system?route=otc'],
    ['/otc/price','/api/system?route=otc&action=price'],
    ['/otc/history','/api/system?route=otc&action=ticks'],
    ['/otc/health','/api/system?route=otc&action=health'],
  ]){
    assert.equal(config.rewrites.find(rule=>rule.source===path)?.destination,destination);
    assert.ok(config.rewrites.findIndex(rule=>rule.source===path)<config.rewrites.findIndex(rule=>rule.source==='/api/(.*)'));
  }
});
test('budget check rejects a thirteenth entry and ignores private helpers/declarations',()=>{
  const root=mkdtempSync(join(tmpdir(),'function-budget-'));
  try{
    mkdirSync(join(root,'api/_lib'),{recursive:true});
    writeFileSync(join(root,'vercel.json'),'{}');
    for(let i=0;i<12;i++)writeFileSync(join(root,`api/route${i}.ts`),'export default ()=>{}');
    writeFileSync(join(root,'api/_lib/helper.ts'),'');writeFileSync(join(root,'api/types.d.ts'),'');
    assert.equal(listApiEntries(root).length,12);assert.equal(checkVercelFunctionBudget(root).length,12);
    writeFileSync(join(root,'api/extra.ts'),'');assert.throws(()=>checkVercelFunctionBudget(root),/found 13/);
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('budget check rejects stale per-function configuration',()=>{
  const root=mkdtempSync(join(tmpdir(),'function-config-'));
  try{
    mkdirSync(join(root,'api'));writeFileSync(join(root,'api/system.ts'),'');
    writeFileSync(join(root,'vercel.json'),JSON.stringify({functions:{'api/otc.ts':{maxDuration:30}}}));
    assert.throws(()=>checkVercelFunctionBudget(root),/missing entry/);
  }finally{rmSync(root,{recursive:true,force:true});}
});
