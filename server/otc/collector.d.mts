import type {PoolClient} from 'pg';
import type {OTCReadRequest,OTCSnapshot} from './serverless.mjs';
export interface CollectorResult {
  assets:number;processed:{symbol:string;cursor:number;catchingUp:boolean}[];
  errors:{symbol:string;message:string}[];remaining:number;complete:boolean;
}
export function createOTCCollector(options:{
  transaction:<T>(work:(client:PoolClient)=>Promise<T>)=>Promise<T>;
  assets:Record<string,unknown>;
  read:(request:OTCReadRequest)=>Promise<OTCSnapshot>;
  now?:()=>number;budgetMs?:number;concurrency?:number;shouldContinue?:()=>Promise<boolean>;
}):()=>Promise<CollectorResult>;
