# Multi-stage Dockerfile for the NexaAttend Express API (TypeScript)

# Stage 1: install all deps and compile TypeScript
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# Stage 2: minimal runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 5000
USER node

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q --spider http://localhost:5000/api/health || exit 1

CMD ["node", "dist/server.js"]
