# AllSpark

Add a SQL query or pass in an api and generate graphs, reports and other visualizations in seconds.

## Software Requirements

* Node.js (Minimum 8.9)
* MySQL
* _(Optional)_ Redis

That's pretty much it.

## Setup

### Database

The app uses one database, schema of which can be found in `/config/db-schema.sql` It's a simple phpMyAdmin dump of the databse we are using ourselves. We'll try to keep this updated. You will have to create a database and import the db dump and create two users (one read and one write). Although you can always just have one write user and use it though I recommend against it.

### Configuration File

The repo has a config directory in the root. Look for the `/config/sample.json` file. This file takes a few things like

* The ports for both client and server. (sudo/admin needed for client to run on 80)
* SSL Support (pass in the key file paths in this cofig entry)
* The databse connections (we use two, one for read and other for write)
* Redis configurations options. Though this is optional (but recommended if you don't like melting servers)

Fill in the necessery details in the json file and start your pm2 instances.

## Start Client & Server

### Unix
```
NODE_ENV='env' pm2 start bin/www --name env
```

### Windows
```
$env:NODE_ENV="env"
pm2 start bin/www --name env
```

### Local Development
```
NODE_ENV="dev" npm start
```
