FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npx prisma generate

EXPOSE 5000
ENV NODE_ENV=production

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
