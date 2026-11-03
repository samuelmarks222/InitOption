import {createServer} from 'node:http';
import {createOTCService} from './service.mjs';
const service=createOTCService({dataDir:process.env.OTC_DATA_DIR??'.otc-data',origin:process.env.OTC_ORIGIN});
const server=createServer((req,res)=>{if(!service.request(req,res)){res.writeHead(404);res.end();}});
server.on('upgrade',(req,socket,head)=>{if(!service.upgrade(req,socket,head))socket.destroy();});
server.listen(Number(process.env.PORT??8092),'0.0.0.0',()=>console.log('Platform-generated OTC service on port '+server.address().port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{service.close();server.close(()=>process.exit(0));});
