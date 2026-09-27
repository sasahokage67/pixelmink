const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function loadTypeScript(relativePath) {
  const filename = path.resolve(__dirname, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded._compile(compiled, filename);
  return loaded.exports;
}

const { resolveSocketEndpoint } = loadTypeScript('../src/lib/socket-endpoint.ts');
test('signaling URL cannot point remote visitors at their own localhost or mixed content', () => {
  assert.equal(resolveSocketEndpoint(undefined, 'https://example.com'), undefined);
  assert.equal(resolveSocketEndpoint('http://localhost:3000', 'https://example.com'), undefined);
  assert.equal(resolveSocketEndpoint('http://127.0.0.1:3000', 'http://192.168.1.10:3000'), undefined);
  assert.equal(resolveSocketEndpoint('http://localhost:3000', 'http://localhost:3000'), 'http://localhost:3000/');
  assert.equal(resolveSocketEndpoint('http://calls.example.com', 'https://example.com'), undefined);
  assert.equal(resolveSocketEndpoint('https://calls.example.com', 'https://example.com'), 'https://calls.example.com/');
});

test('TURN config uses configured credentials and supports multiple relay transports', () => {
  const keys = ['NEXT_PUBLIC_TURN_URLS', 'NEXT_PUBLIC_TURN_URL', 'NEXT_PUBLIC_TURN_USERNAME', 'NEXT_PUBLIC_TURN_CREDENTIAL'];
  const saved = keys.map((key) => process.env[key]);
  try {
    keys.forEach((key) => delete process.env[key]);
    const { getRtcConfiguration } = loadTypeScript('../src/lib/webrtc.ts');
    assert.equal(getRtcConfiguration().iceServers.length, 2);
    process.env.NEXT_PUBLIC_TURN_URLS = 'turn:relay.example:3478?transport=udp, turns:relay.example:5349?transport=tcp';
    process.env.NEXT_PUBLIC_TURN_USERNAME = 'test-user';
    process.env.NEXT_PUBLIC_TURN_CREDENTIAL = 'test-credential';
    const relay = getRtcConfiguration().iceServers[2];
    assert.deepEqual(relay.urls, ['turn:relay.example:3478?transport=udp', 'turns:relay.example:5349?transport=tcp']);
    assert.equal(relay.username, 'test-user');
    assert.equal(relay.credential, 'test-credential');
    delete process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
    assert.equal(getRtcConfiguration().iceServers.length, 2);
  } finally {
    keys.forEach((key, index) => { if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index]; });
  }
});
