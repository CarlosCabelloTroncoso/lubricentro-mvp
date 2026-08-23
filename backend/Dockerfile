# syntax=docker/dockerfile:1

# ---- deps: dependencias completas (dev incluidas) para compilar --------
FROM node:24.9.0-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compila TypeScript -> dist/ ---------------------------------
FROM deps AS build
WORKDIR /app
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
# migrate.ts busca ./migrations junto al .js compilado (dist/db/migrations);
# tsc no copia .sql, asi que se copian a mano para que el runner los encuentre
# sin necesitar el arbol src/ completo en la imagen final.
RUN cp -r src/db/migrations dist/db/migrations

# ---- production: solo dependencias de runtime + dist compilado ---------
FROM node:24.9.0-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Usuario sin privilegios: la imagen oficial de node ya trae "node" (uid 1000).
USER node

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "dist/server.js"]
