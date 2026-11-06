import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulationServer} from './server.js';

test('simulation transport remains available but no longer serves a chart UI', async () => {
  const app = createSimulationServer({port: 0, host: '127.0.0.1'});
  try {
    if (!app.server.listening) await new Promise(resolve => app.server.once('listening', resolve));
    const base = `http://127.0.0.1:${app.server.address().port}`;
    assert.equal((await fetch(`${base}/`)).status, 404);
    assert.equal((await fetch(`${base}/chart.html`)).status, 404);
    const history = await fetch(`${base}/history?symbol=DEMO%2FUSD`);
    assert.equal(history.status, 200);
    assert.equal((await history.json()).mode, 'simulation');
  } finally { await app.close(); }
});
