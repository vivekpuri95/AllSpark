const puppeteer = require('puppeteer');

class HeadlessChrome {

	static async setup() {

		if(!HeadlessChrome.browser) {

			return HeadlessChrome.browser = await puppeteer.launch({
				headless: true, args: [`--window-size=1920,1080`]
			});
		}

		return HeadlessChrome.browser;
	}
}

module.exports = HeadlessChrome;