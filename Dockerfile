# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies (rebuilds native modules for this stage)
RUN npm ci --omit=dev && apk del python3 make g++

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Note: Migrations are handled via drizzle-kit push before deployment
# No migrations folder needed in production

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
