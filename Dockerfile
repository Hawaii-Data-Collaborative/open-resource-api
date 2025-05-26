# Build stage for dependencies
FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL dependencies
RUN apt-get update && apt-get install -y openssl libssl-dev wget && rm -rf /var/lib/apt/lists/*

# Copy package files first to leverage Docker cache
COPY search-server/package*.json /app/main-app/
COPY search-admin-server/package*.json /app/admin-app/

# Install dependencies
RUN cd main-app && npm install --production
RUN cd admin-app && npm install --production

# Copy application code for building
COPY search-server/prisma /app/main-app/prisma
COPY search-server/scripts /app/main-app/scripts
COPY search-server/src /app/main-app/src
COPY search-server/templates /app/main-app/templates
COPY search-server/.env /app/main-app/.env
COPY search-server/LAST_SYNC /app/main-app/LAST_SYNC

COPY search-admin-server/src /app/admin-app/src
COPY search-admin-server/prisma /app/admin-app/prisma
COPY search-admin-server/.env /app/admin-app/.env

# Generate Prisma client and build applications
RUN cd main-app && npx prisma generate && npm run build && rm -rf src
RUN cd admin-app && npx prisma generate

# Install Meilisearch
RUN wget https://github.com/meilisearch/meilisearch/releases/download/v1.14.0/meilisearch-linux-amd64 -O /app/main-app/meilisearch && \
    chmod +x /app/main-app/meilisearch && \
    # Clean up
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/*

# Final stage
FROM node:20-slim
WORKDIR /app

# Install OpenSSL dependencies and wget
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

# Install PM2 globally
RUN npm install pm2 -g

# Copy built files
COPY --from=builder /app/main-app /app/main-app
COPY --from=builder /app/admin-app /app/admin-app

# Copy scripts
COPY search-server/start.sh /app/start.sh
COPY search-server/ecosystem.config.js /app/ecosystem.config.js

# Copy frontend files
COPY search-client/dist /app/main-app/public
COPY search-admin-client/build /app/admin-app/public

# Expose ports
EXPOSE 8080

# Launch with startup script
CMD ["/app/start.sh"]
