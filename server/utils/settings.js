class Settings extends Map {

	constructor(setting = []) {

		if(!Array.isArray(setting))
			return;

		super(setting.map(x => [x.key, x]));
	}

	get(key) {
		return super.has(key) ? super.get(key).value : undefined;
	}
}

module.exports = Settings;