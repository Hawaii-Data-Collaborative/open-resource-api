# 1) Base image
FROM node:20-alpine AS base
WORKDIR /app

# 2) Install PM2 globally
RUN npm install pm2 -g

# 4) Copy both Express apps
COPY . /app/main-app
COPY ../search-admin-server /app/admin-app

# 5) Copy React build outputs into each Express's `public/` folder
COPY ../search-client/dist /app/main-app/public
COPY ../search-admin-client/build /app/admin-app/public

# 6) Install production deps for each
RUN cd main-app && npm install --production
RUN cd admin-app && npm install --production

# 7) Install Meilisearch
RUN cd main-app && curl -L https://install.meilisearch.com | sh && ./meilisearch --master-key=dY2amaK4QVUabL4NfDcqC

# 8) Copy PM2 config
COPY ecosystem.config.js /app/ecosystem.config.js

# 9) Expose both ports
EXPOSE 3001 3002

# 10) Launch with PM2 runtime (keeps container alive; auto-restarts on crash)
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
