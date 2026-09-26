# Proxy WSS Eaglercraft 1.8.8 → Aternos

Este projeto é um **proxy WebSocket Secure (WSS)** que permite que um cliente
**Eaglercraft 1.8.8** (que roda dentro do navegador) se conecte ao seu
servidor **Minecraft Paper 1.8.8 hospedado no Aternos**:

```
Davi_Gabriel__.aternos.me:15630
```

## Por que isso é necessário?

Um navegador **não consegue** abrir uma conexão TCP crua (o protocolo nativo
do Minecraft Java). Ele só sabe falar WebSocket. Por isso é preciso um
componente "tradutor" no meio do caminho:

```
Navegador (Eaglercraft)  --wss://-->  ESTE PROXY  --TCP comum-->  Aternos
```

Este proxy pega cada byte que chega pelo WebSocket e reenvia, sem modificar,
para o servidor Minecraft via uma conexão TCP normal (a mesma que qualquer
cliente Java oficial usaria) — e faz o caminho inverso também. Ele cobre o
uso de **"Direct Connect" / "Conectar diretamente"** do Eaglercraft 1.8.8
clássico.

> **Importante — limite honesto desta solução:** este proxy cobre entrar e
> jogar normalmente (chat, movimentação, inventário, combate, etc.). Ele
> **não** implementa recursos exclusivos do ecossistema **EaglercraftX**
> (ícone de MOTD animado na lista de servidores, injeção de skins/capas
> customizadas via plugin, voice chat). Esses recursos dependem do plugin
> oficial **EaglerXServer**, que precisa rodar dentro de um proxy Java
> (BungeeCord/Velocity, com Java 17+) na frente do seu servidor — uma
> estrutura bem mais pesada, desnecessária apenas para jogar. Se um dia você
> quiser esses extras, o projeto oficial é
> https://github.com/lax1dude/eaglerxserver.

## Pré-requisito no lado do Aternos

O Eaglercraft não faz o login autenticado da Mojang. Por isso o servidor de
destino precisa estar em **modo offline/cracked** (`online-mode: false`).
O Aternos já usa esse modo por padrão, então normalmente você não precisa
mudar nada — mas se você alterou isso manualmente, confira em **Aternos →
Configurações do Servidor → Cracked** que a opção está **ativada (verde)**.

---

## 1. Estrutura final do projeto

```
eaglercraft-wss-proxy/
├── server.js          → código do proxy (Node.js)
├── package.json        → dependências do projeto (biblioteca "ws")
├── Dockerfile           → receita para o Render construir o container
├── render.yaml          → configuração de deploy automático (Blueprint)
├── .gitignore           → arquivos que não devem ir para o GitHub
├── .env.example         → exemplo de variáveis de ambiente
└── README.md            → este arquivo
```

Nenhum arquivo binário/JAR é necessário. Você **não precisa instalar** Node.js
nem Java no seu computador — tudo roda na hospedagem gratuita.

---

## 2. Passo a passo: colocar os arquivos no GitHub

Você já tem o repositório `eagler` criado. Vamos subir os arquivos por lá
usando só o site do GitHub (sem terminal, sem Git instalado).

1. Baixe todos os arquivos que preparei (veja o botão/lista de arquivos
   fornecido junto com esta mensagem) para uma pasta no seu computador.
2. Entre no GitHub e abra o repositório `eagler`.
3. Clique no botão **"Add file"** (perto do canto superior direito da lista
   de arquivos) e depois em **"Upload files"**.
4. Arraste **todos** os arquivos baixados (`server.js`, `package.json`,
   `Dockerfile`, `render.yaml`, `.gitignore`, `.env.example`, `README.md`)
   para a área de upload do GitHub.
   - Atenção: arquivos que começam com ponto (`.gitignore`, `.env.example`)
     às vezes ficam "escondidos" no seu explorador de arquivos. Ative a
     opção "mostrar arquivos ocultos" do seu sistema operacional para
     encontrá-los, ou simplesmente arraste a pasta inteira — o GitHub
     também aceita isso.
5. Role até o final da página, escreva uma mensagem tipo
   `"proxy wss inicial"` no campo de commit, e clique em
   **"Commit changes"**.
6. Pronto — os arquivos já estão no seu repositório `eagler`.

---

## 3. Passo a passo: conectar o GitHub ao Render (hospedagem gratuita)

Escolhi o **Render** (render.com) porque ele oferece, no plano gratuito, sem
cartão de crédito:
- Deploy direto a partir de um repositório do GitHub;
- Domínio próprio pronto (`algumacoisa.onrender.com`) já com **HTTPS/WSS
  automático** — você não precisa comprar domínio nem configurar certificado;
- Suporte a WebSocket e a Docker.

O único ponto de atenção do plano gratuito é que o serviço **"dorme"** depois
de ~15 minutos sem uso e demora uns 30-60 segundos para "acordar" na primeira
conexão seguinte — o que é perfeitamente aceitável no seu caso, já que você
só vai usar o proxy enquanto estiver jogando.

### Criando a conta e o serviço

1. Acesse **https://render.com** e clique em **"Get Started"** (ou
   "Sign Up").
2. Escolha **"Sign up with GitHub"** e autorize o Render a acessar sua conta
   do GitHub (você pode limitar o acesso apenas ao repositório `eagler`
   quando o GitHub perguntar quais repositórios liberar).
3. Dentro do painel do Render, clique em **"New +"** no canto superior
   direito e escolha **"Blueprint"**.
4. Selecione o repositório **`eagler`** na lista (se não aparecer, clique em
   "Configure account" e libere o repositório).
5. O Render vai detectar automaticamente o arquivo `render.yaml` que está no
   repositório e mostrar o serviço `eaglercraft-wss-proxy` pronto para criar,
   já no **plano Free**.
6. Clique em **"Apply"** (ou "Create New Resources").
7. Aguarde a mensagem de build/deploy terminar (acompanhe pela aba **"Logs"**
   do serviço). Quando aparecer no log algo como:
   ```
   Proxy WSS Eaglercraft 1.8.8 iniciado
   Ouvindo em: 0.0.0.0:xxxx
   Encaminhando para: Davi_Gabriel__.aternos.me:15630
   ```
   o proxy está no ar.

> Caso o Render não detecte o `render.yaml` automaticamente, crie o serviço
> manualmente: **New + → Web Service → conecte o repositório `eagler` →
> Environment: "Docker" → Plan: "Free" → Create Web Service**. O Render vai
> usar o `Dockerfile` do repositório sozinho.

### Variáveis de ambiente (caso precise revisar/alterar)

No painel do serviço, aba **"Environment"**, confira/edite:

| Variável      | Valor                          |
|---------------|---------------------------------|
| `TARGET_HOST` | `Davi_Gabriel__.aternos.me`    |
| `TARGET_PORT` | `15630`                         |

O `render.yaml` já cadastra essas duas automaticamente. A variável `PORT` é
definida pelo próprio Render — não mexa nela.

---

## 4. Como "iniciar" o proxy

Você não precisa clicar em nada para "ligar" o proxy toda vez: uma vez feito
o deploy, o Render mantém o serviço publicado e ele acorda sozinho assim que
alguém tenta se conectar (com a demora de alguns segundos citada acima, se
estiver "dormindo"). Basta:

1. Ligar o seu servidor no painel do **Aternos** normalmente (clicar em
   "Start"), como você já faz hoje.
2. Abrir o cliente Eaglercraft e conectar usando o endereço wss (próximo
   passo). O Render vai "acordar" o container sozinho.

---

## 5. Qual será a URL WSS final

Depois do deploy, o Render mostra no topo da página do serviço uma URL
parecida com:

```
https://eaglercraft-wss-proxy-xxxx.onrender.com
```

(o `xxxx` é um sufixo aleatório gerado pelo Render, ou pode não existir,
dependendo do nome estar livre).

Para usar no Eaglercraft, troque `https://` por `wss://`:

```
wss://eaglercraft-wss-proxy-xxxx.onrender.com
```

Essa é a URL final que você vai usar dentro do jogo. Copie exatamente como
aparece no painel do Render (o domínio real pode variar um pouco do exemplo
acima).

---

## 6. Onde colocar essa URL no Eaglercraft 1.8.8

1. Abra o cliente Eaglercraft 1.8.8 no navegador.
2. Na tela inicial, clique em **"Multiplayer"** (ou "Direct Connect" /
   "Conectar diretamente", dependendo da versão da interface).
3. No campo **"Server Address"** (endereço do servidor), cole a URL WSS
   completa, por exemplo:
   ```
   wss://eaglercraft-wss-proxy-xxxx.onrender.com
   ```
4. Clique em **"Join Server"** / **"Connect"**.

---

## 7. Como testar a conexão com o Aternos

1. **Teste 1 — o proxy está de pé?**
   Abra em uma aba do navegador a URL `https://` (sem o `wss`, e sem porta)
   do seu serviço Render, por exemplo:
   `https://eaglercraft-wss-proxy-xxxx.onrender.com`
   Você deve ver uma página de texto simples dizendo
   `"Proxy WSS Eaglercraft está ONLINE."`. Se aparecer isso, o proxy Node.js
   está rodando corretamente na hospedagem.

2. **Teste 2 — o Aternos está ligado?**
   Entre no painel do Aternos e confirme que o status do servidor está
   **"Online"** (verde). Se estiver desligado, o proxy vai conseguir
   responder no Teste 1, mas a conexão do jogo vai falhar/cair rapidamente,
   porque ele não consegue abrir a conexão TCP até o Aternos.

3. **Teste 3 — jogar de fato.**
   Com o Aternos ligado e o Teste 1 funcionando, entre no Eaglercraft e use
   a URL `wss://...` como descrito no passo 6. Se a primeira tentativa
   demorar/falhar, aguarde uns 30-60 segundos (o Render pode estar
   "acordando" o serviço) e tente de novo.

4. **Acompanhar logs em tempo real.**
   No painel do Render, aba **"Logs"**, você verá mensagens como:
   ```
   [+] Cliente Eaglercraft conectado (a.b.c.d). Abrindo TCP para Davi_Gabriel__.aternos.me:15630...
   [+] TCP conectado ao servidor Minecraft (...) para a.b.c.d
   ```
   Isso confirma, na prática, que o proxy recebeu sua conexão e conseguiu
   falar com o Aternos.

---

## Solução de problemas comuns

- **"Connection refused" / cai na hora:** o servidor no Aternos está
  desligado. Ligue-o no painel do Aternos antes de tentar conectar.
- **Demora muito para conectar na primeira vez:** normal no plano gratuito
  do Render — o container estava "dormindo" e precisa "acordar". Espere e
  tente novamente.
- **"End of stream" ou desconexão logo após entrar:** confirme que o
  servidor Aternos está mesmo com `online-mode` desativado (Aternos →
  Configurações → opção "Cracked" ativada) e que a versão do software é
  realmente Paper **1.8.8** (mesma versão de protocolo do cliente
  Eaglercraft 1.8.8).
- **Quero ícone de MOTD animado / skins customizadas / voice chat:** isso
  exige o plugin oficial `EaglerXServer` rodando em BungeeCord/Velocity, uma
  estrutura mais pesada (Java 17+) — fora do escopo mínimo deste proxy. Veja
  https://github.com/lax1dude/eaglerxserver se quiser evoluir para isso no
  futuro.

---

## Rodando localmente (opcional, apenas se você mudar de ideia sobre não
instalar nada no seu PC)

```bash
npm install
TARGET_HOST=Davi_Gabriel__.aternos.me TARGET_PORT=15630 node server.js
```

O proxy vai escutar em `http://localhost:8080` (sem TLS — use apenas para
testes locais com `ws://`, nunca para jogar de verdade pela internet).
