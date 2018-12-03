const API = require("../../utils/api");
const headlessChrome = require('../../utils/headless-chrome');
const fs = require('fs');
const child_process = require('child_process');

exports.pdf = class DownloadPdf extends API {

	async pdf() {

		const
			browser = await this.browser(),
			page = await browser.newPage();

		await page.goto(`${this.request.body.url}`,
			{waitUntil: ['networkidle2','domcontentloaded']}
		);

		await page.setViewport({width: 1600,height: 1080});

		//Check file exists and if not then make dir;
		if(!fs.existsSync('/tmp/Allspark')) {
			child_process.execSync('mkdir /tmp/Allspark');
		}

		//get the width of headless chrome so that the viewports can be changed;
		const clientWidth = await page.evaluate(() => {

			return document.querySelector('body').clientWidth;
		});

		//render the visualization.
		await page.evaluate(async () => {

			const visibleVisuliaztions = page.list.get(page.currentDashboard).visibleVisuliaztions;

			for(const report of visibleVisuliaztions) {
				await report.visualizations.selected.render();
			}
		});

		//Wait until the graphs animations rendered;
		await new Promise(resolve => {setTimeout(() => {resolve()}, 1800)});

		//preparing for download;
		const fileName = Math.random() + '.pdf';

		await page.pdf({path: `/tmp/Allspark/${fileName}`, format: 'A4', scale: 0.5});

		await this.response.sendFile(`/tmp/Allspark/${fileName}`);

		//delete the file generated;
		setTimeout(() => {
			child_process.execSync(`rm /tmp/Allspark/${fileName}`);
		},2000);

		throw({'pass': true});
	}

	async browser() {

		return await headlessChrome.setup();
	}
}