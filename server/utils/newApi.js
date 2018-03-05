const zlib = require('zlib');
const mysql = require('../www/mysql').MySQL;
const fs = require('fs');
const pathSeparator = require('path').sep;
const {resolve} = require('path');

class API {

	constructor() {

		this.mysql = mysql;

    }

	static setup() {

		API.endpoints = new Map;

		async function walk(directory) {

			for(const file of fs.readdirSync(directory)) {

				const path = resolve(directory, file).replace(/\//g, pathSeparator);

				if(fs.statSync(path).isDirectory()) {
					walk(path);
					continue;
				}

				if(!path.endsWith('.js'))
					continue;

				const module = require(path);

				for(const key in module) {

					// Make sure the endpoint extends API class
					if(module.hasOwnProperty(key) && module[key] && module[key].prototype && module[key].prototype.__proto__.constructor == API)
						API.endpoints.set([path.slice(0, -3), key].join(pathSeparator), module[key]);
				}
			}
		}

		walk(__dirname + '/../www');
	}

	static serve() {

		return async function(request, response) {

            try {

                const
                	url = request.url.replace(/\//g, pathSeparator),
                	path = resolve(__dirname + '/../www') + pathSeparator + url.substring(4, url.indexOf('?') < 0 ? undefined : url.indexOf('?'));

                if (!API.endpoints.has(path))
                    throw 'Endpoint not found! <br><br>'+path+' <br><br>' + Array.from(API.endpoints.keys()).join('<br>');

                const obj = new (API.endpoints.get(path))();

                obj.request = request;
                let host = request.headers.host.split(':')[0];

				if(host.includes('localhost')) {
					host = 'allspark.jugnoo.in';
				}

                obj.account = global.account[host];

                obj.result = await obj[path.split(pathSeparator).pop()]();

                await obj.gzip();

                response.set({'Content-Encoding': 'gzip'});
                response.set({'Content-Type': 'application/json'});
                response.send(obj.result);
            }

            catch (e) {
                console.log('Error in endpoint execution', e);
                response.send(e);
            }

        }
	}

	async gzip() {

		return new Promise((resolve, reject) => {
			zlib.gzip(JSON.stringify(this.result), (error, result) => {

				if(error)
					reject(['API response gzip compression failed!', error]);

				else  {
					this.result = result;
					resolve();
				}
			});
		});
	}

}

module.exports = API;
API.setup();