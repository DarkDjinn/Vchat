FROM node:12 as builder
WORKDIR /app
COPY frontend .
RUN npm install && npm run build

FROM node:12
RUN apt-get update && apt-get upgrade -yq
WORKDIR /app
COPY ./backend/package.json ./backend/index.js ./
COPY --from=builder /app/dist ./dist
RUN npm install
CMD npm start