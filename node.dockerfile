FROM node:8.9.4
RUN apt-get -y update && \
    apt-get -y upgrade && \
    apt-get install -y build-essential && \
    apt-get install -y byobu curl git htop man unzip vim wget libssl-dev net-tools && \
    apt-get install -y apache2 && apt-get install -y mysql-client && npm install pm2 -g

RUN mkdir -p /apps/node-apps/allspark

COPY . /apps/node-apps/allspark

WORKDIR /apps/node-apps/allspark

#CMD bash startpm2.sh staging && pm2 logs
#CMD NODE_ENV='demo' pm2 start bin/www --name demo && pm2 logs