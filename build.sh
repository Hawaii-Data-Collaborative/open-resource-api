#! /usr/bin/env bash

echo "[build] compiling ..."
yarn build
echo "[build] compressing ..."
tar czf dist.tar.gz dist
echo "[build] done"
