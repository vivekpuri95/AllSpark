const API = require("../../utils/api");
const headlessChrome = require('../../utils/headless-chrome');
const fs = require('fs');
const child_process = require('child_process');

exports.pdf = class DownloadPdf extends API {

	async pdf() {

		const chrome = new headlessChrome();

		await chrome.setup();

		const page = await chrome.browser.newPage();

		await page.goto(
			this.request.query.url,
			{waitUntil: ['networkidle2', 'load']}
		);

		await page.setViewport({width: 1600, height: 1080});

		// Check Directory exists and if not then make dir.
		if(!fs.existsSync('/tmp/Allspark')) {
			child_process.execSync('mkdir /tmp/Allspark');
		}

		// Render the visualization.
		await page.evaluate(async () => {

			const visibleVisuliaztions = page.list.get(page.currentDashboard).visibleVisuliaztions;

			const promiseList = [];

			for(const report of visibleVisuliaztions) {
				promiseList.push(report.visualizations.selected.render());
			}

			await Promise.all(promiseList);
		});

		// Wait until the graphs animations rendered.
		await new Promise(resolve => setTimeout(resolve, 1800));

		// Preparing for download.
		const fileName = Math.random() + '.' + this.request.query.type;

		if(this.request.query.type == 'pdf') {

			await page.pdf({path: `/tmp/Allspark/${fileName}`, format: 'A4', scale: 0.5});
		}
		else if(this.request.query.type == 'png') {

			await page.screenshot({
				path: `/tmp/Allspark/${fileName}`,
				type: 'jpeg',
				fullPage: true,
			});
		}
		else if(this.request.query.type == 'jpeg') {

			await page.screenshot({
				path: `/tmp/Allspark/${fileName}`,
				type: 'jpeg',
				quality: 80,
				fullPage: true,
			});
		}

		await page.close();

		await this.response.sendFile(`/tmp/Allspark/${fileName}`);

		// Delete the file generated.
		setTimeout(() => {
			child_process.execSync(`rm /tmp/Allspark/${fileName}`);
		}, 30000);

		throw({pass: true});
	}
}