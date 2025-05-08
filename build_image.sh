#!/bin/bash

cd ..

docker rmi search.auw211.org

docker build --platform linux/amd64 -f search-server/Dockerfile -t search.auw211.org .

docker tag search.auw211.org registry.digitalocean.com/auw211-reg-1/search.auw211.org

docker push registry.digitalocean.com/auw211-reg-1/search.auw211.org
