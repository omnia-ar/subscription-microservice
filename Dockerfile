# --- Etapa 1: builder ---
FROM node:20-alpine AS builder

WORKDIR /srv
ENV NODE_ENV=development

# Copiar archivos de dependencias primero (para aprovechar cache)
COPY package.json ./

# Instalar dependencias (incluyendo dev)
RUN npm install

# Copiar el resto del código
COPY . .

# (Opcional) Si usás TypeScript, descomentá esta línea:
# RUN npm run build


# --- Etapa 2: runtime ---
FROM node:20-alpine AS runtime

WORKDIR /srv
ENV NODE_ENV=production

# Copiar solo lo necesario desde el builder
COPY --from=builder /srv/package.json ./
COPY --from=builder /srv/node_modules ./node_modules
COPY --from=builder /srv/src ./src
# COPY --from=builder /srv/dist ./dist   # si usás build

# Exponer puerto del microservicio (Cloud Run usa 8080 por defecto)
EXPOSE 8080

# Healthcheck opcional (ajustar endpoint si cambia)
HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD wget -qO- http://localhost:8080/health || exit 1

# Comando de arranque
CMD ["node", "src/server.js"]
