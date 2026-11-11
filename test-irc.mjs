import tls from 'node:tls';

const IRC_HOST = 'nekosec.irc-server.org';
const IRC_PORT = 6697;

console.log('Node verze:', process.version);
console.log('Pokus o připojení k', IRC_HOST, IRC_PORT);

const socket = tls.connect({
  host: IRC_HOST,
  port: IRC_PORT,
  servername: IRC_HOST,
  rejectUnauthorized: true,
  minVersion: 'TLSv1.2',
}, () => {
  console.log('✔ TLS spojení navázáno');
  console.log('  Protokol:', socket.getProtocol());
  console.log('  Certifikát:', socket.getPeerCertificate().subject);
  socket.end();
});

socket.on('error', (err) => {
  console.error('✘ Chyba:', err.message);
  console.error('  Kód:', err.code);
});

socket.on('close', () => {
  console.log('Spojení uzavřeno');
  process.exit(0);
});

setTimeout(() => {
  console.error('✘ Timeout');
  process.exit(1);
}, 10000);