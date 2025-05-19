#!/bin/sh

echo "$GOOGLE_APPLICATION_CREDENTIALS_JSON" > /app/main-app/google-private-key.json

export GOOGLE_APPLICATION_CREDENTIALS=google-private-key.json

cd /app

pm2-runtime start ecosystem.config.js
