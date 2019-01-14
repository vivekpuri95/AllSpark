FROM vivekpuri/allspark-base

RUN mkdir -p /apps/node-apps/allspark /apps/node-apps/allspark/bigquery_files /apps/node-apps/allspark/excel_exports

COPY requirements.txt /apps/node-apps/allspark/requirements.txt
RUN cd /apps/node-apps/allspark && pip3 install -r requirements.txt

COPY package.json /apps/node-apps/allspark/package.json
RUN cd /apps/node-apps/allspark && npm install

COPY . /apps/node-apps/allspark

WORKDIR /apps/node-apps/allspark