/**
 * Eagler WSS Proxy
 * Ponte entre clientes Eaglercraft 1.8.8 (WebSocket/WSS) e um servidor
 * Minecraft Java (TCP puro), como o seu servidor no Aternos.
 *
 * Não requer Java. Roda em Node.js.
 */

const http = require('http');
const net = require('net');
const WebSocket = require('ws');

// ---- Configuração (pode ser sobrescrita por variáveis de ambiente) ----
const LISTEN_PORT = process.env.PORT || 8080;           // porta que o Render fornece
const TARGET_HOST = process.env.TARGET_HOST || 'Davi_Gabriel__.aternos.me';
const TARGET_PORT = parseInt(process.env.TARGET_PORT || '15630', 10);

// ---- Servidor HTTP simples (necessário para o Render considerar o serviço "ativo") ----
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Eagler WSS Proxy online. Alvo: ' + TARGET_HOST + ':' + TARGET_PORT + '\n');
});

// ---- Servidor WebSocket, usando o mesmo servidor HTTP/porta ----
const wss = new WebSocket.Server({ server: httpServer });

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log('[+] Novo cliente Eaglercraft conectado:', clientIp);

  // Abre a conexão TCP real com o servidor Minecraft (Aternos)
  const tcpSocket = net.createConnection(TARGET_PORT, TARGET_HOST, () => {
    console.log('[+] Conectado ao servidor Minecraft:', TARGET_HOST + ':' + TARGET_PORT);
  });

  tcpSocket.setNoDelay(true);

  // Dados vindos do servidor Minecraft -> repassa para o navegador (WebSocket)
  tcpSocket.on('data', (chunk) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(chunk, { binary: true });
    }
  });

  tcpSocket.on('close', () => {
    console.log('[-] Servidor Minecraft encerrou a conexão para', clientIp);
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  });

  tcpSocket.on('error', (err) => {
    console.log('[!] Erro TCP (' + clientIp + '):', err.message);
    try { ws.close(); } catch (e) {}
  });

  // Dados vindos do navegador (WebSocket) -> repassa para o servidor Minecraft
  ws.on('message', (data, isBinary) => {
    if (tcpSocket.writable) {
      tcpSocket.write(data);
    }
  });

  ws.on('close', () => {
    console.log('[-] Cliente desconectado:', clientIp);
    tcpSocket.destroy();
  });

  ws.on('error', (err) => {
    console.log('[!] Erro WS (' + clientIp + '):', err.message);
    tcpSocket.destroy();
  });
});

httpServer.listen(LISTEN_PORT, () => {
  console.log('Eagler WSS Proxy escutando na porta ' + LISTEN_PORT);
  console.log('Encaminhando para ' + TARGET_HOST + ':' + TARGET_PORT);
});
