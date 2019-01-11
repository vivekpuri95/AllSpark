FROM node:8.9.4
RUN apt-get -y update && \
    apt-get -y upgrade && \
    apt-get install -y build-essential byobu curl git htop man unzip vim wget libssl-dev net-tools apache2 mysql-client libappindicator1 fonts-liberation libasound2 libgconf-2-4 libnspr4 libxss1 libnss3 xdg-utils libappindicator3-1 lsb-release software-properties-common python3-setuptools python3-dev && \
    easy_install3 -U pip && \
    wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && dpkg -i google-chrome*.deb && \
    ln -s /usr/bin/google-chrome /usr/bin/chrome && npm install pm2 -g

RUN mkdir -p /apps/node-apps/allspark

COPY requirements.txt /apps/node-apps/allspark/requirements.txt
RUN cd /apps/node-apps/allspark && pip3 install -r requirements.txt

COPY package.json /apps/node-apps/allspark/package.json
RUN cd /apps/node-apps/allspark && npm install

COPY . /apps/node-apps/allspark

WORKDIR /apps/node-apps/allspark