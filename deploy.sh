#! /usr/bin/env bash

echo "[deploy] pushing code ..."
git push beta main
echo "[deploy] compiling ..."
yarn build
echo "[deploy] compressing ..."
tar czf dist.tar.gz dist
echo "[deploy] scp'ing ..."
scp dist.tar.gz wwa:/var/www/auwsearch.windwardapps.com/open-resource-api/
echo "[deploy] ssh'ing ..."
ssh wwa bash << EOF
cd /var/www/auwsearch.windwardapps.com/open-resource-api
echo "[deploy] pulling code ..."
git reset --hard
echo "[deploy] installing dependencies ..."
/home/kyle/bin/yarn
npx prisma generate
echo "[deploy] uncompressing ..."
mv dist dist-old
tar xzf dist.tar.gz
echo "[deploy] restarting ..."
sudo service auw211api restart
rm -rf dist-old
EOF

echo "[deploy] done"
