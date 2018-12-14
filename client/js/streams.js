"use strict";

class DataStreams extends Map {

	async load({force = false} = {}) {

		if(this.size && !force)
			return;

		const response = await API.call('reports/report/list');

		this.clear();

		for(const stream of response) {

			stream.id = stream.query_id;
			delete stream.query_id;

			this.set(stream.id, stream);
		}
	}
}

class DataStream {

	constructor(stream) {

		for(const key in stream) {
			this[key] = stream[key];
		}

		this.options = this.format;
		delete this.format;

		this.filters = new DataStreamFilters(this);
	}

	async fetch({parameters = {}, download = false} = {}) {

		parameters = new URLSearchParams(parameters);

		parameters.set('query_id', this.id);

		for(const filter of this.filters.values()) {

			const value = filter.value;

			if(Array.isArray(value)) {

				for(const item of value) {
					parameters.append(DataStreamFilters.placeholderPrefix + filter.placeholder, item);
				}

			} else {
				parameters.set(DataStreamFilters.placeholderPrefix + filter.placeholder, value);
			}
		}

		let response = {};

		const options = {
			method: 'POST',
		};

		try {
			response = await API.call('reports/engine/report', parameters.toString(), options);
		}
		catch(e) {}

		if(download) {
			return response;
		}

		this.originalResponse = response;
	}

	process() {

		if(!this.originalResponse || !this.originalResponse.data) {
			return [];
		}

		let response = [];

		const data = this.transformations.run(this.originalResponse.data);

		for(const _row of data) {

			const row = new DataSourceRow(_row, this);

			if(!row.skip) {
				response.push(row);
			}
		}

		if(this.postProcessors.selected) {
			response = this.postProcessors.selected.processor(response);
		}

		if(response.length && this.columns.sortBy && response[0].has(this.columns.sortBy.key)) {

			response.sort((a, b) => {

				const
					first = a.get(this.columns.sortBy.key).toString().toLowerCase(),
					second = b.get(this.columns.sortBy.key).toString().toLowerCase();

				let result = 0;

				if(!isNaN(first) && !isNaN(second)) {
					result = first - second;
				}

				else if(first < second) {
					result = -1;
				}

				else if(first > second) {
					result = 1;
				}

				if(parseInt(this.columns.sortBy.sort) === 0) {
					result *= -1;
				}

				return result;
			});
		}

		return response;
	}
}

class DataStreamFilters extends Map {

	constructor(stream) {

		super();

		this.stream = stream;

		if(!this.stream.filters || !this.stream.filters.length) {
			return;
		}

		for(const filter of this.stream.filters) {
			this.set(filter.placeholder, new DataStreamFilter(filter, this.stream));
		}

		this.value = this.default_value || '';

		if(!isNaN(parseFloat(this.offset))) {

			if(DataSourceFilter.types[this.type] == 'date') {
				this.value = new Date(Date.now() + this.offset * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
			}

			if(DataSourceFilter.types[this.type] == 'month') {
				const date = new Date();
				this.value = new Date(Date.UTC(date.getFullYear(), date.getMonth() + this.offset, 1)).toISOString().substring(0, 7);
			}
		}
	}
}

class DataStreamFilter {

	constructor(filter, source) {

		DataStreamFilter.placeholderPrefix = 'param_';

		for(const key in filter) {
			this[key] = filter[key];
		}

		this.source = source;
	}
}