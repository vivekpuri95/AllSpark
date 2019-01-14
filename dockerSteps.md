# Install via Docker

## STEPS:
1. Assuming docker and docker-compose is Installed
	```
	mkdir docker-db-setup && cd docker-db-setup
	curl https://gist.githubusercontent.com/janurag/cb3f944525d9a6f4aa1b26ee0fb6eaf9/raw/e9ffa1563470f9e601c8c523ac634f36cc629d53/docker-compose.yml --output docker-compose.yml && ls
	```
2. If you have mysql already installed on system then remove below lines from docker-compose.yml
	```
	volumes:
	     - /var/lib/mysql:/var/lib/mysql
	```

	Run:
	```
	docker-compose up -d
	cd ..
	git clone https://github.com/Jungle-Works/AllSpark -b develop
	cd AllSpark && npm install
	```

3. Modify  variables in `docker-compose.yml` and `startpm2.sh` file 

4. For Single Sign-on, clone companion repo inside Allspark repo i.e. 
	`
	git clone https://bitbucket.org/scopeworker/kato-allspark-companion.git -b develop
	cd kato-allspark-companion && npm install
	`

	Make modifications to `sample.json` of both repos.
	Run `cd ..`  and come out of kato-allspark-companion folder
	Update `config.py` as per your needs

	`
	docker-compose up -d
	`


5. [Enable http2](https://www.mysterydata.com/how-to-enable-http-2-for-apache-in-cwp-with-mod_http2-module/)

6. [Check companion repo](https://<example.com>/kato/api/hello)





