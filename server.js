/**
 * Proxy WebSocket Secure (WSS) <-> TCP para Eaglercraft 1.8.8
 * ---------------------------------------------------------------
 * Um navegador NUNCA consegue abrir um socket TCP puro (o protocolo
 * nativo do Minecraft Java). Ele só sabe falar WebSocket (ws/wss).
 * Por isso este componente existe: ele recebe a conexão WebSocket
 * vinda do cliente Eaglercraft e a "traduz" 1:1 em bytes crus,
 * repassando-os para o servidor Minecraft real via uma conexão TCP
 * comum (a mesma que qualquer cliente Java oficial usaria).
 *
 * Fluxo:
 *   Navegador (Eaglercraft) --wss://-->  ESTE PROXY  --TCP-->  Aternos
 *
 * Requisitos no servidor Minecraft de destino:
 *   - Deve aceitar conexões offline/cracked (online-mode: false),
 *     pois o cliente Eaglercraft não faz o login autenticado da Mojang.
 *     O Aternos já usa esse modo por padrão.
 *
 * Este proxy NÃO substitui o EaglerXServer. Ele cobre o caso de uso
 * de "Direct Connect" (entrar e jogar) do Eaglercraft clássico 1.8.8.
 * Recursos exclusivos do ecossistema EaglercraftX (ícone de MOTD
 * animado, skins customizadas via plugin, voice chat, etc.) exigem
 * o plugin EaglerXServer rodando dentro de um proxy Java (BungeeCord/
 * Velocity) na frente do próprio servidor — algo mais pesado e que
 * não é necessário apenas para jogar.
 */

const http = require('http');
const net = require('net');
const WebSocket = require('ws');

// ---------------------------------------------------------------
// Configuração (pode ser sobrescrita por variáveis de ambiente,
// definidas no painel do Render em Environment)
// ---------------------------------------------------------------
const PORT = process.env.PORT || 8080;
const TARGET_HOST = process.env.TARGET_HOST || 'Davi_Gabriel__.aternos.me';
const TARGET_PORT = parseInt(process.env.TARGET_PORT || '15630', 10);
const TCP_CONNECT_TIMEOUT_MS = 15000;
const WS_PING_INTERVAL_MS = 25000;

let totalConexoes = 0;

// ---------------------------------------------------------------
// Servidor HTTP simples (usado pelo Render para "health check" e
// para você confirmar no navegador que o proxy está de pé)
// ---------------------------------------------------------------
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(
    'Proxy WSS Eaglercraft está ONLINE.\n' +
    `Encaminhando para: ${TARGET_HOST}:${TARGET_PORT}\n` +
    `Conexões atendidas desde o início: ${totalConexoes}\n` +
    'Use o endereço wss:// deste serviço no cliente Eaglercraft (Direct Connect).\n'
  );
});

const wss = new WebSocket.Server({ server: httpServer });

wss.on('connection', (ws, req) => {
  totalConexoes++;
  const clientIp = req.socket.remoteAddress;
  console.log(`[+] Cliente Eaglercraft conectado (${clientIp}). Abrindo TCP para ${TARGET_HOST}:${TARGET_PORT}...`);

  let tcpConnected = false;
  let closed = false;

  const tcpSocket = new net.Socket();
  tcpSocket.setNoDelay(true);
  tcpSocket.setTimeout(TCP_CONNECT_TIMEOUT_MS);

  const closeAll = (motivo) => {
    if (closed) return;
    closed = true;
    if (motivo) console.log(`[-] Encerrando conexão (${clientIp}): ${motivo}`);
    clearInterval(pingInterval);
    try { tcpSocket.destroy(); } catch (e) {}
    try {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    } catch (e) {}
  };

  tcpSocket.connect(TARGET_PORT, TARGET_HOST, () => {
    tcpConnected = true;
    tcpSocket.setTimeout(0); // remove timeout de conexão, já conectado
    console.log(`[+] TCP conectado ao servidor Minecraft (${TARGET_HOST}:${TARGET_PORT}) para ${clientIp}`);
  });

  // Dados vindos do servidor Minecraft -> repassa para o navegador
  tcpSocket.on('data', (data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data, { binary: true });
    }
  });

  tcpSocket.on('timeout', () => {
    closeAll('tempo esgotado ao conectar no servidor Minecraft (ele está desligado/offline no Aternos?)');
  });

  tcpSocket.on('close', () => {
    closeAll('servidor Minecraft encerrou a conexão TCP');
  });

  tcpSocket.on('error', (err) => {
    closeAll(`erro TCP: ${err.message}`);
  });

  // Dados vindos do navegador (Eaglercraft) -> repassa para o servidor Minecraft
  ws.on('message', (msg) => {
    if (tcpConnected && !tcpSocket.destroyed) {
      // msg já chega como Buffer para frames binários
      tcpSocket.write(Buffer.isBuffer(msg) ? msg : Buffer.from(msg));
    }
  });

  ws.on('close', () => {
    closeAll('cliente Eaglercraft desconectou');
  });

  ws.on('error', (err) => {
    closeAll(`erro WebSocket: ${err.message}`);
  });

  // Ping periódico para manter a conexão viva e detectar quedas
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.ping(); } catch (e) {}
    } else {
      clearInterval(pingInterval);
    }
  }, WS_PING_INTERVAL_MS);
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('==============================================');
  console.log(' Proxy WSS Eaglercraft 1.8.8 iniciado');
  console.log(` Ouvindo em: 0.0.0.0:${PORT}`);
  console.log(` Encaminhando para: ${TARGET_HOST}:${TARGET_PORT}`);
  console.log('==============================================');
});
