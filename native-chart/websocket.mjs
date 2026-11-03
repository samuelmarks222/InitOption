import {createHash} from 'node:crypto';
import {EventEmitter} from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const decoder = new TextDecoder('utf-8', {fatal:true});
function frame(opcode, data = Buffer.alloc(0)) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const length = payload.length;
  const header = Buffer.alloc(length < 126 ? 2 : length <= 65535 ? 4 : 10);
  header[0] = 0x80 | opcode;
  if (length < 126) header[1] = length;
  else if (length <= 65535) { header[1] = 126; header.writeUInt16BE(length,2); }
  else { header[1] = 127; header.writeBigUInt64BE(BigInt(length),2); }
  return Buffer.concat([header,payload]);
}

/** Small RFC 6455 text-only transport, using Node TCP sockets, not a dependency.
 * Masking, fragmentation, control frames, UTF-8 and bounded input are validated. */
export class WebSocketPeer extends EventEmitter {
  constructor(socket, head = Buffer.alloc(0), {maxMessage = 16384, maxBackpressure = 1048576} = {}) {
    super(); this.socket = socket; this.maxMessage = maxMessage; this.maxBackpressure = maxBackpressure;
    this.buffer = Buffer.alloc(0); this.parts = []; this.fragmentBytes = 0; this.fragmented = false; this.closed = false; this.alive = true;
    socket.setNoDelay(true);
    socket.on('data', bytes => this.receive(bytes));
    socket.on('error', () => this.terminate());
    socket.on('close', () => { this.closed = true; clearTimeout(this.closeTimer); this.emit('close'); });
    // Upgrade head may contain a complete first frame. Let callers attach listeners first.
    if (head.length) queueMicrotask(() => this.receive(head));
  }
  send(value) {
    if (this.closed || this.socket.destroyed) return false;
    if (this.socket.writableLength > this.maxBackpressure) { this.close(1013,'Slow consumer'); return false; }
    return this.socket.write(frame(1, typeof value === 'string' ? value : JSON.stringify(value)));
  }
  ping() { if (!this.closed) this.socket.write(frame(9)); }
  terminate() { this.closed = true; clearTimeout(this.closeTimer); this.socket.destroy(); }
  close(code = 1000, reason = '') {
    if (this.closed) return;
    this.closed = true;
    const text = Buffer.from(reason).subarray(0,123), payload = Buffer.alloc(2+text.length);
    payload.writeUInt16BE(code); text.copy(payload,2);
    this.socket.end(frame(8,payload));
    this.closeTimer = setTimeout(() => this.terminate(),2000); this.closeTimer.unref();
  }
  receive(bytes) {
    if (this.closed) return;
    this.buffer = Buffer.concat([this.buffer,bytes]);
    while (!this.closed && this.buffer.length >= 2) {
      const b = this.buffer, fin = !!(b[0]&128), opcode = b[0]&15, masked = !!(b[1]&128);
      if (b[0]&112 || !masked || ![0,1,2,8,9,10].includes(opcode)) { this.close(1002,'Invalid frame'); return; }
      let size = b[1]&127, offset = 2;
      if (size === 126) { if (b.length < 4) return; size = b.readUInt16BE(2); offset = 4; if (size < 126) { this.close(1002); return; } }
      else if (size === 127) {
        if (b.length < 10) return;
        const large = b.readBigUInt64BE(2);
        if (large < 65536n || large > BigInt(this.maxMessage)) { this.close(1009); return; }
        size = Number(large); offset = 10;
      }
      const control = opcode >= 8;
      if (control && (!fin || size > 125) || size > this.maxMessage || !control && this.fragmentBytes + size > this.maxMessage) { this.close(control ? 1002 : 1009); return; }
      if (b.length < offset+4+size) return;
      const mask = b.subarray(offset,offset+4), payload = Buffer.from(b.subarray(offset+4,offset+4+size));
      for (let i=0;i<size;i++) payload[i] ^= mask[i&3];
      this.buffer = b.subarray(offset+4+size);
      if (opcode === 8) {
        if (size === 1) { this.close(1002); return; }
        if (size >= 2) {
          const code = payload.readUInt16BE(0);
          if (!(code >= 1000 && code <= 1014 && ![1004,1005,1006].includes(code) || code >= 3000 && code <= 4999)) { this.close(1002); return; }
          try { decoder.decode(payload.subarray(2)); } catch { this.close(1007); return; }
        }
        this.closed = true; this.socket.end(frame(8,payload)); return;
      }
      if (opcode === 9) { this.socket.write(frame(10,payload)); continue; }
      if (opcode === 10) { this.alive = true; continue; }
      if (opcode === 2) { this.close(1003,'Text messages only'); return; }
      if (opcode === 0 && !this.fragmented || opcode === 1 && this.fragmented) { this.close(1002); return; }
      this.parts.push(payload); this.fragmentBytes += size;
      if (!fin) { this.fragmented = true; continue; }
      const message = Buffer.concat(this.parts); this.parts = []; this.fragmentBytes = 0; this.fragmented = false;
      try { this.emit('message',decoder.decode(message)); } catch { this.close(1007,'Invalid text'); return; }
    }
  }
}

export function acceptWebSocket(request, socket, head, {path = '/ticks', origin} = {}) {
  const reject = status => { socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`); return null; };
  let pathname;
  try { pathname = new URL(request.url,'http://local').pathname; } catch { return reject('400 Bad Request'); }
  const key = request.headers['sec-websocket-key'];
  if (request.method !== 'GET' || pathname !== path ||
      request.headers.upgrade?.toLowerCase() !== 'websocket' ||
      !request.headers.connection?.toLowerCase().split(/\s*,\s*/).includes('upgrade') ||
      request.headers['sec-websocket-version'] !== '13' || typeof key !== 'string' ||
      !/^[A-Za-z0-9+/]{22}==$/.test(key) || Buffer.from(key,'base64').length !== 16) return reject('400 Bad Request');
  if (origin && request.headers.origin !== origin) return reject('403 Forbidden');
  const accept = createHash('sha1').update(key+GUID).digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  return new WebSocketPeer(socket,head);
}
