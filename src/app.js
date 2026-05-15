const http = require('http');
const fs = require('fs');
const path = require('path');
const { repositories } = require('./repositories');
const { CareService } = require('./services/careService');
const { createCareController } = require('./controllers/careController');
const { createRouter } = require('./routes/router');

const publicDir = path.join(__dirname, '..', 'public');

function serveStatic(req, res) {
  if (req.url.startsWith('/auth/magic/')) {
    const token = req.url.split('/').pop();
    res.writeHead(302, { Location: `/?magicToken=${token}` });
    res.end();
    return true;
  }

  const pathname = req.url === '/' || req.url.startsWith('/?') ? '/index.html' : req.url;
  const safePath = pathname.split('?')[0];
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }

  const ext = path.extname(filePath);
  const contentType =
    ext === '.html' ? 'text/html' : ext === '.css' ? 'text/css' : ext === '.js' ? 'application/javascript' : 'text/plain';

  res.writeHead(200, { 'Content-Type': contentType });
  res.end(fs.readFileSync(filePath));
  return true;
}

function createApp() {
  const service = new CareService(repositories);
  const controller = createCareController(service);
  const router = createRouter(controller);

  return http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url.startsWith('/api/')) {
      router(req, res);
      return;
    }

    if (!serveStatic(req, res)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
}

module.exports = { createApp };
