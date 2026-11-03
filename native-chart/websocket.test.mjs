import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {WebSocketPeer} from './websocket.mjs';
class Socket extends EventEmitter {
  writableLength=0;destroyed=false;sent=[];
  setNoDelay(){} write(value){this.sent.push(value);return true;}
  end(value){if(value)this.sent.push(value);this.destroyed=true;this.emit('close');}
  destroy(){this.destroyed=true;this.emit('close');}
}
function masked(opcode,data,fin=true){
  const payload=Buffer.from(data),mask=Buffer.from([3,5,7,11]),header=Buffer.alloc(payload.length<126?2:4);
  header[0]=(fin?128:0)|opcode;header[1]=128|(payload.length<126?payload.length:126);if(payload.length>=126)header.writeUInt16BE(payload.length,2);
  for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];return Buffer.concat([header,mask,payload]);
}
test('masked fragmented UTF-8 survives TCP splitting and interleaved ping',()=>{
  const socket=new Socket(),peer=new WebSocketPeer(socket),messages=[];peer.on('message',v=>messages.push(v));
  const bytes=Buffer.from('a€z'),first=masked(1,bytes.subarray(0,2),false),last=masked(0,bytes.subarray(2));
  peer.receive(first.subarray(0,3));peer.receive(first.subarray(3));peer.receive(masked(9,'ping'));peer.receive(last);
  assert.deepEqual(messages,['a€z']);assert.equal(socket.sent[0][0],0x8a);peer.terminate();
});
test('extended masked text frames parse; invalid UTF-8 and oversized messages close safely',()=>{
  const socket=new Socket(),peer=new WebSocketPeer(socket),messages=[];peer.on('message',v=>messages.push(v));peer.receive(masked(1,'x'.repeat(200)));assert.equal(messages[0].length,200);
  peer.receive(masked(1,Buffer.from([0xff])));assert.equal(socket.sent.at(-1).readUInt16BE(2),1007);
  const second=new Socket(),bounded=new WebSocketPeer(second,Buffer.alloc(0),{maxMessage:16});bounded.receive(masked(1,'x'.repeat(17)));assert.equal(second.sent[0].readUInt16BE(2),1009);
});
test('unexpected continuation and fragmented control frames fail protocol validation',()=>{
  for(const bytes of [masked(0,'text'),masked(9,'ping',false)]){
    const socket=new Socket(),peer=new WebSocketPeer(socket);peer.receive(bytes);assert.equal(socket.sent[0].readUInt16BE(2),1002);
  }
});
test('slow consumers are closed rather than building unbounded outbound queues',()=>{
  const socket=new Socket(),peer=new WebSocketPeer(socket);socket.writableLength=2000000;assert.equal(peer.send('tick'),false);assert.equal(socket.sent[0].readUInt16BE(2),1013);
});
