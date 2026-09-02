# Multi-Stage Dockerfile for NexaAttend Express Backend API

# Stage 1: Build & Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy node_modules and code
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Expose API Port
EXPOSE 5000

USER node

CMD ["node", "server.js"]
