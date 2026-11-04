import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
export const OTC_CRON_PATH='/api/otc/collect';
export function configureOTCScheduler(config,{enable=false,confirmed=false}={}) {
  if(enable&&!confirmed)throw new Error('Frequent Vercel cron requires a supported plan. Confirm it explicitly with --confirm-supported-plan. This tool does not purchase or verify a hosting plan.');
  const crons=(config.crons??[]).filter(job=>job.path!==OTC_CRON_PATH);
  if(enable)crons.push({path:OTC_CRON_PATH,schedule:'* * * * *'});
  return {...config,crons};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try {
    const args=process.argv.slice(2);
    if(args.some(arg=>!['--enable','--disable','--check','--confirm-supported-plan'].includes(arg)))throw new Error('Unknown argument. Use --check, --enable --confirm-supported-plan, or --disable.');
    if(args.filter(arg=>['--enable','--disable','--check'].includes(arg)).length!==1)throw new Error('Choose exactly one of --check, --enable, --disable.');
    const path=new URL('../vercel.json',import.meta.url),config=JSON.parse(await readFile(path,'utf8'));
    if(args.includes('--check'))console.log(JSON.stringify({configured:config.crons?.some(job=>job.path===OTC_CRON_PATH&&job.schedule==='* * * * *')??false,path:OTC_CRON_PATH,note:'Configuration is not evidence of deployed scheduled execution.'},null,2));
    else{
      const result=configureOTCScheduler(config,{enable:args.includes('--enable'),confirmed:args.includes('--confirm-supported-plan')});
      await writeFile(path,JSON.stringify(result,null,2)+'\n');
      console.log('Updated local vercel.json only. Review the diff and deploy after plan approval. No hosting/billing changes were made.');
    }
  }catch(error){console.error(error.message);process.exitCode=1;}
}
