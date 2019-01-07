#!/bin/bash
environment="$1"
cd /apps/node-apps/allspark/
sleep 5
cp config/sample.json config/$environment.json
sed -i "s|8080|3001|g" config/$environment.json
sed -i "s|mysql-host|mysql-local|g" config/$environment.json
sed -i "s|mysql-read|root|g" config/$environment.json
sed -i "s|mysql-write|root|g" config/$environment.json
sed -i "s|mysql-pass|password|g" config/$environment.json
sed -i "s|env-db|"$environment"_allspark|g" config/$environment.json

NODE_ENV="$environment" pm2 start bin/www --name "$environment"
cd /apps/node-apps/allspark/kato-allspark-companion
#NODE_ENV="$environment" pm2 start bin/www --name "$environment-comp"
sleep 15
curl http://localhost:3001/api/v2/setup/run
pm2 restart all && pm2 logs