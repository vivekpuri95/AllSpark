# AllSpark

## Start Client

```
cd client
PORT=8081 HTTPS=0 pm2 start index.js --name client
```

## Start Server

```
cd server
NODE_ENV='dev' pm2 start bin/www --name server
```