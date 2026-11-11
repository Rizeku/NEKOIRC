const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const tls = require('tls');

const IRC_HOST = 'nekosec.irc-server.org';
const IRC_PORT = 6697;

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = filePath.split('?')[0];
  filePath = path.join(__dirname, 'public', filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT' && !path.extname(filePath)) {
        fs.readFile(path.join(__dirname, 'public', 'index.html'), (err2, data2) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data2);
        });
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.mp3': 'audio/mpeg',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.json': 'application/json',
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Klient připojen, navazuji TLS spojení s IRC...');

  const ircSocket = tls.connect({
    host: IRC_HOST,
    port: IRC_PORT,
    servername: IRC_HOST,
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
  }, () => {
    console.log('TLS spojení s IRC navázáno, protokol:', ircSocket.getProtocol());
  });

  ircSocket.on('data', (data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(data.toString('utf8'));
    }
  });

  ircSocket.on('error', (err) => {
    console.error('IRC chyba:', err.message, 'kód:', err.code);
    if (ws.readyState === ws.OPEN) {
      ws.send(`ERROR ${err.message}\r\n`);
    }
  });

  ircSocket.on('close', () => {
    console.log('IRC spojení uzavřeno');
    if (ws.readyState === ws.OPEN) ws.close();
  });

  ws.on('message', (msg) => {
    if (ircSocket.writable) {
      ircSocket.write(msg.toString());
    }
  });

  ws.on('close', () => {
    console.log('Klient odpojen, uzavírám IRC spojení');
    ircSocket.destroy();
  });
});

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`NEKOIRC běží na portu ${port}`);
  console.log(`Otevřete http://localhost:${port} (lokálně) nebo https://nekoirc.onrender.com (produkce)`);
});
