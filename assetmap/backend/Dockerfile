# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package management files
COPY package.json package-lock.json* ./

# Install dependencies (including devDependencies to compile TypeScript)
RUN npm ci

# Copy configuration and source files
COPY tsconfig.json ./
COPY src ./src

# Build the project (compiles TypeScript to dist/)
RUN npm run build

# Stage 2: Create production runtime image
FROM node:22-alpine AS runner

WORKDIR /app

# Run in production mode
ENV NODE_ENV=production
ENV PORT=3000

# Copy package management files
COPY package.json package-lock.json* ./

# Install only production dependencies (no devDependencies, keeps image tiny)
RUN npm ci --only=production

# Copy compiled files from the builder stage
COPY --from=builder /app/dist ./dist
# Copy migrations files so the server can run migration checks if needed
COPY --from=builder /app/src/db/migrations ./dist/db/migrations

# Expose backend port
EXPOSE 3000

# Start server
CMD ["node", "dist/index.js"]
