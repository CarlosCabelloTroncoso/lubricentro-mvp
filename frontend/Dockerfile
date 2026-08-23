# syntax=docker/dockerfile:1

# ---- build: compila el bundle de produccion de Angular ------------------
FROM node:24.9.0-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- production: nginx sirviendo estaticos + proxy /api -----------------
FROM nginx:1.29-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
