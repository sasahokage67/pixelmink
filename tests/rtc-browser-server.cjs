// Isolated localhost harness using the production signaling and connection code.
// No accounts, database, real camera/microphone, or public messaging services.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { Server } = require('socket.io');
const { registerCallSignaling } = require('../server/call-signaling');

const server = http.createServer((req, res) => {
  if (req.url === '/controller.js') {
    const source = fs.readFileSync(path.join(__dirname, '../src/lib/call-connection.ts'), 'utf8');
    res.setHeader('Content-Type', 'text/javascript');
    return res.end(ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020,
    } }).outputText);
  }
  const routes = { '/': 'rtc-browser.html', '/suite.js': 'rtc-browser-suite.js' };
  if (!routes[req.url]) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', req.url.endsWith('.js') ? 'text/javascript' : 'text/html');
  res.end(fs.readFileSync(path.join(__dirname, routes[req.url])));
});
const io = new Server(server);
registerCallSignaling(io);
server.listen(3001, '127.0.0.1', () => console.log('WebRTC regression tests: http://127.0.0.1:3001'));
