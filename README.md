# AllSpark

## Start Client & Server

```
NODE_ENV='env' pm2 start client/index.js --name env-client
NODE_ENV='env' pm2 start server/bin/www --name env-server
```