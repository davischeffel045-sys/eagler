# Imagem base leve com Node.js 20
FROM node:20-alpine

WORKDIR /app

# Copia apenas os manifestos primeiro (melhora cache de build)
COPY package.json ./

# Instala dependências de produção
RUN npm install --omit=dev

# Copia o restante do código
COPY server.js ./

# Porta interna (o Render injeta a variável PORT automaticamente,
# esse EXPOSE é apenas documentativo)
EXPOSE 8080

# Variáveis padrão (podem ser sobrescritas no painel do Render)
ENV TARGET_HOST=Davi_Gabriel__.aternos.me
ENV TARGET_PORT=15630

CMD ["node", "server.js"]
