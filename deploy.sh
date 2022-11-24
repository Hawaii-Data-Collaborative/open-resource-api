#! /usr/bin/env bash

echo "[deploy] pushing code ..."
git push beta main
echo "[deploy] ssh'ing ..."
ssh wwa bash << EOF
cd /var/www/auwsearch.windwardapps.com/open-resource-api
echo "[deploy] pulling code ..."
git reset --hard
echo "[deploy] installing dependencies ..."
/home/kyle/bin/yarn
echo "[deploy] compiling ..."
npx prisma generate
/home/kyle/bin/yarn build
echo "[deploy] restarting ..."
sudo service auw211api restart
EOF

echo "[deploy] done"
