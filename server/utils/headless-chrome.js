const puppeteer = require('puppeteer');

class HeadlessChrome {

	async setup() {

		if(!HeadlessChrome.browser) {

			HeadlessChrome.browser = await puppeteer.launch({
				headless: true,
				args: ['--window-size=1920,1080'],
			});
		}

		this.browser = HeadlessChrome.browser;
	}
}

module.exports = HeadlessChrome;