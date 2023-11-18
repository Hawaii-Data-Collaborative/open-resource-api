#! /usr/bin/env bash

echo "[deploy] pushing code ..."
git push
echo "[deploy] scp'ing ..."
scp dist.tar.gz auw1:/var/www/searchengine-backend/
echo "[deploy] ssh'ing ..."
ssh auw1 bash << EOF
cd /var/www/searchengine-backend
echo "[deploy] pulling code ..."
git pull
echo "[deploy] installing dependencies ..."
npm install --production
npx prisma generate
echo "[deploy] uncompressing ..."
mv dist dist-old
tar xzf dist.tar.gz
echo "[deploy] restarting ..."
sudo ./restart.sh
rm -rf dist-old
EOF

echo "[deploy] done"
