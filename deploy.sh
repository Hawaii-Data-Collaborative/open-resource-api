#! /usr/bin/env bash

instance=${1:-production}
echo "[deploy] instance=$instance"

if [[ $instance == "production" ]]; then
  host=auw1
  dir=/var/www/searchengine-backend
elif [[ $instance == "beta" ]]; then
  host=hdc1
  dir=/home/hdc/apps/auw211/backend
else
  echo "[deploy] invalid instance $instance"
  exit 1
fi

echo "[deploy] host=$host dir=$dir"

echo "[deploy] pushing code ..."
git push
echo "[deploy] scp'ing ..."
scp dist.tar.gz $host:$dir/
echo "[deploy] ssh'ing ..."
ssh $host bash << EOF
cd $dir
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
