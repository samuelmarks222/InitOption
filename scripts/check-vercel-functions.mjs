import {readdirSync, readFileSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

/** Vercel file-based API entries: underscore helpers and declarations are not
 * deployed independently. Keep the Hobby budget check independent of frontend builds. */
export function listApiEntries(root=process.cwd()) {
  const entries=[];
  function walk(dir) {
    for(const item of readdirSync(dir,{withFileTypes:true})) {
      if(item.name.startsWith('_')||item.name.startsWith('.'))continue;
      const path=join(dir,item.name);
      if(item.isDirectory())walk(path);
      else if(/\.(?:[cm]?js|[cm]?ts|tsx|jsx|go|py|rb)$/.test(item.name)&&! /\.d\.[cm]?ts$/.test(item.name))entries.push(relative(root,path).replaceAll('\\','/'));
    }
  }
  walk(join(root,'api'));return entries.sort();
}
export function checkVercelFunctionBudget(root=process.cwd(),limit=12) {
  const entries=listApiEntries(root),config=JSON.parse(readFileSync(join(root,'vercel.json'),'utf8'));
  if(entries.length>limit)throw new Error(`Vercel Hobby supports ${limit} Functions; found ${entries.length}. Consolidate an API route before deploying.\n${entries.join('\n')}`);
  for(const key of Object.keys(config.functions??{})) {
    if(!key.includes('*')&&!entries.includes(key))throw new Error(`Vercel Function settings reference a missing entry: ${key}`);
  }
  return entries;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {const entries=checkVercelFunctionBudget();console.log(`Vercel Hobby budget: ${entries.length}/12 Functions\n${entries.join('\n')}`);}
  catch(error){console.error(error.message);process.exitCode=1;}
}
