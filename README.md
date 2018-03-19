# AllSpark

## Start Client

```
cd client
PORT=8081 HTTP=1 pm2 start index.js --name client
```

## Start Server

```
cd server
NODE_ENV='dev' pm2 start bin/www --name server
```