FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./

RUN npm install

COPY backend ./
COPY frontend ./

RUN mkdir -p data

EXPOSE 3001

CMD ["node", "server.js"]