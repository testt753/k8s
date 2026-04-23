FROM node:22-alpine

WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
RUN mkdir -p /usr/src/app/uploads && chown -R node:node /usr/src/app/uploads
USER node
ENV UPLOAD_DIR=/usr/src/app/uploads
EXPOSE 3000
CMD ["node", "src/server.js"]