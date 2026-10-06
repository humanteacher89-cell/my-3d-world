# 어느 컨테이너 호스팅(Koyeb, Fly.io, Cloud Run, Hugging Face Spaces 등)에서나 같은 모습으로 돈다
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server.js ./
ENV PORT=8787
EXPOSE 8787
CMD ["node", "server.js"]
