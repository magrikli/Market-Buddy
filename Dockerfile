# Build stage
FROM node:20-alpine AS builder

# Build arguments for version info
ARG GIT_COMMIT_HASH=dev
ARG BUILD_TIME=""

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Write version info to a file that the server can read
RUN echo "{\"commitHash\":\"${GIT_COMMIT_HASH}\",\"buildTime\":\"${BUILD_TIME}\"}" > version.json

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy version info file
COPY --from=builder /app/version.json ./version.json

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose the port (internally 5000, map externally to 7013)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "dist/index.cjs"]
