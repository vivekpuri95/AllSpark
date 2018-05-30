class Settings extends Map {

	constructor(setting) {

		super(setting.map(x => [x.key, x]));
	}

	get(key) {
		return super.has(key) ? super.get(key).value : undefined;
	}
}

module.exports = Settings;