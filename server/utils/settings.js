class Settings extends Map{

	constructor(setting) {

		super(setting.map(x => [x.key, x]));
	}

	get(key) {

		let obj = this.get(key);

		return obj.value;
	}

}

module.exports = Settings;