# AllSpark

## Start Client

```
cd ./client
PORT=8080 pm2 start 'index.js'  --name client
```

## Start Server

```
cd ./server
NODE_ENV='development' pm2 start './bin/www'  --name server
```