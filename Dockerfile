# Base image
FROM node:20-alpine AS base
WORKDIR /app

# Install PM2 globally
RUN npm install pm2 -g

# Copy both Express apps
COPY search-server /app/main-app
COPY search-admin-server /app/admin-app

# Copy React build outputs into each Express's `public/` folder
COPY search-client/dist /app/main-app/public
COPY search-admin-client/build /app/admin-app/public

RUN mv /app/main-app/ecosystem.config.js /app/
RUN mv /app/main-app/start.sh /app/

# Install production deps for each
RUN cd main-app && npm install --production
RUN cd admin-app && npm install --production

# Install Meilisearch
RUN wget https://github.com/meilisearch/meilisearch/releases/download/v1.14.0/meilisearch-linux-amd64 -O /app/main-app/meilisearch && \
    chmod +x /app/main-app/meilisearch

# Expose both ports
EXPOSE 3001 3002

# Launch with startup script
CMD ["/app/start.sh"]
