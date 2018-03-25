# AllSpark

## Start Client & Server

```
NODE_ENV='environment' pm2 start client/index.js --name environment-client
NODE_ENV='environment' pm2 start server/bin/www --name environment-server
```