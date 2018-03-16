# AllSpark

## Start Client

```
PORT=80 pm2 start client/index.js --name client
```

## Start Server

```
NODE_ENV='dev' pm2 start server/bin/www --name server
```