# AllSpark

## Start Client

```
cd ./client
pm2 start 'index.js'  --name client
```

## Start Server

```
cd ./server
NODE_ENV='development' pm2 start './bin/www'  --name server
```