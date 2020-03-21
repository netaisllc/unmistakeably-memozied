const _ = require('lodash');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const log = require('../log');

const checkStatus = (res) => {
	if (res.ok) {
		// res.status >= 200 && res.status < 300
		return res;
	}
	if (res.status >= 400 && res.status < 500) {
		return res;
	}
	log.meta(`Hard fetch error: ${res.status} ${res.statusText}`);
	return Promise.reject(false);
};

const delay = (ms) => new Promise((_) => setTimeout(_, ms));

const decorateLinks = (links, url, rootUrl) => {
	let _links = _.uniq(_.compact(links));

	// Trim trailing /
	if (url.charAt(url.length - 1) === '/') {
		url = url.slice(0, -1);
	}

	let l = _.map(_links, (l) => {
		if (l.startsWith('http')) {
			return l;
		}
		if (l[0] === '/') {
			if (url.includes(rootUrl)) {
				return `${rootUrl}${l}`;
			} else {
				return `${url}${l}`;
			}
		}
		return `${url}/${l}`;
	});
	return l;
};

const filterLinks = (links) => {
	let l = _.filter(links, (link) => {
		const js = 'script:void(';

		if (link === undefined) {
			return false;
		}

		if (link === '/') {
			return false;
		}

		if (link.includes('#')) {
			return false;
		}
		if (link.includes(js)) {
			return false;
		}

		return true;
	});
	return l;
};

const getAnchorTags = ($) => {
	const ao = $('a');
	const keys = Object.keys(ao);
	let links = [];
	_.each(keys, (key) => {
		const n = Number(key);
		if (Number.isInteger(n)) {
			const link = $(ao[key]).attr('href');
			links.push(link);
		}
	});
	return _.uniq(_.sortBy(links));
};

const getTitle = ($) => {
	let t = $('title').text();
	if (t.length > 128) {
		t = t.slice(0, 127);
	}
	return t;
};

const siteScanner = (url, rootUrl) => {
	// Eliminate any query parameters
	let target = url.split('?');
	target = target[0];

	const handler = (body) => {
		// Virtual DOM
		const $ = cheerio.load(body);

		// Pluck page title
		const title = getTitle($);

		// Get page links
		let links = getAnchorTags($);
		links = filterLinks(links);
		links = decorateLinks(links, url, rootUrl);

		return {
			targets : links,
			title   : title,
			url     : target,
		};
	};

	// throttle the scanner for CYA
	return delay(200)
		.then(() => fetch(target))
		.then(checkStatus)
		.then((res) => res.text())
		.then((body) => handler(body))
		.catch((err) => err);
};

module.exports = siteScanner;
