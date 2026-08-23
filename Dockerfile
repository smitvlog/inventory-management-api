# ==============================================================================
# Stage 1: Build & Compile TypeScript Code
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copy configuration and source files
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma Client & compile TypeScript to dist/
RUN npx prisma generate
RUN npm run build

# ==============================================================================
# Stage 2: Production Runtime
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npx prisma generate

# Copy compiled JavaScript output from builder stage
COPY --from=builder /app/dist ./dist

# Use non-root node user for container security
USER node

EXPOSE 3000

CMD ["node", "dist/server.js"]
