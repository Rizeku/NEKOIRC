const http = require('http');
const { WebSocketServer } = require('ws');
const tls = require('tls');

const IRC_HOST = 'nekosec.irc-server.org';
const IRC_PORT = 6697;

// HTTP server – Render vyžaduje, abychom naslouchali na HTTP portu
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('NEKOIRC Backend is running');
});

// WebSocket server navázaný na HTTP server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Klient připojen, navazuji TLS spojení s IRC...');

  const ircSocket = tls.connect({
    host: IRC_HOST,
    port: IRC_PORT,
    servername: IRC_HOST,
    // ⚠️ DOČASNĚ: certifikát serveru vypršel, pro testování přeskočeno ověření
    // Po obnovení certifikátu správcem serveru změňte zpět na true!
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
  }, () => {
    console.log('TLS spojení s IRC navázáno, protokol:', ircSocket.getProtocol());
  });

  // IRC server → prohlížeč
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

  // Prohlížeč → IRC server
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

// KLÍČOVÉ: Naslouchat na 0.0.0.0 a portu z proměnné prostředí
const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`NEKOIRC backend běží na portu ${port}`);
});