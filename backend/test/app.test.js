const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('events');

const { createApp } = require('../app');

test('app responds to health endpoint', async () => {
  const app = createApp();
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.status, 'ok');
  } finally {
    server.close();
  }
});
