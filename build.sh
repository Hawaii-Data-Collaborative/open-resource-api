#! /usr/bin/env bash

echo "[build] compiling ..."
yarn build
echo "[build] compressing ..."
COPYFILE_DISABLE=1 tar -cz --no-xattrs -f dist.tar.gz dist
echo "[build] done"
