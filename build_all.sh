#! /usr/bin/env bash

set -e

cd ../search-admin-client
echo "[build_all] building search-admin-client"
./build.sh

cd ../search-client
echo "[build_all] building search-client"
./build.sh

cd ../search-server
echo "[build_all] building search-server"
./build.sh

echo "[build_all] building and pushing docker image"
./build_image.sh
