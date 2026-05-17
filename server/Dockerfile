FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm config set registry http://registry.npmjs.org/ && npm install
COPY . .
RUN npx prisma generate
RUN npm run build
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
