'use strict';

const _ = require('lodash');
const faunadb = require('faunadb');
const log = require('./lib/log');
const q = faunadb.query;
const queue = require('./lib/queue');
const siteScanner = require('./lib/scanner');

module.exports.main = async (event, context) => {
	let attributes;
	let blockSize = process.env.blocksize;
	let executionId;
	let invocations;
	let limit;
	let newTargets = [];
	let rootUrl;
	let urls;

	const client = new faunadb.Client({
		secret : process.env.datastore,
	});

	// Helpers - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	const authorityToOperate = async () => {
		// Request permission to proceed. (Result is a boolean reflecting the comparison
		// of Limit and Current Saved PageCount for the execution Id.)
		log.meta(
			`ATO request using limit of ${limit} and execution Id of ${executionId}`
		);
		try {
			const res = await client.query(
				q.Call(q.Function('ATO'), executionId, limit)
			);
			if (res === false) {
				log.meta('ATO denied');
				return Promise.reject('ATO denied');
			}
			log.meta('ATO granted');
			return res;
		} catch (error) {
			log.error(`ATO ${error}`);
			Promise.reject(error);
		}
	};

	const conclude = (msg) => {
		log.meta(msg);
		return msg;
	};

	const concludeWithError = (error) => {
		let msg = `RunCrawlerCycle @taskStack: ${error}`;
		log.error(msg);
		return new Error(error);
	};

	const makePagePromises = (pages) => {
		let pagePromises = [];
		_.each(pages, (p) => {
			// Save array of child links per page to the big collection
			if (p && p.targets && p.targets.length > 0) {
				newTargets = _.concat(newTargets, p.targets);
			}

			// Handle datastore document
			if (p.title && !p.title.includes('404')) {
				let page = {
					data : {
						children  : p.targets.length || 0,
						exid      : executionId,
						logId     : context.logStreamName,
						requestId : context.awsRequestId,
						title     : p.title,
						url       : p.url,
					},
				};

				log.meta(`Page ${JSON.stringify(page)}`);

				pagePromises.push(savePage(executionId, limit, page));
			}
		});
		log.meta(`Number of page promises: ${pagePromises.length}`);
		return pagePromises;
	};

	const makeQueuePromises = (targets) => {
		// Helpers - - - - - - - - - - - - -
		const filter = (ta) => {
			let t = ta.toLowerCase();
			if (t.includes('.atom')) return false;
			if (t.includes('.jpeg')) return false;
			if (t.includes('.jpg')) return false;
			if (t.includes('.mp4')) return false;
			if (t.includes('.net')) return false;
			if (t.includes('.ogg')) return false;
			if (t.includes('.pdf')) return false;
			if (t.includes('.png')) return false;
			if (t.includes('.rss')) return false;
			if (t.includes('.txt')) return false;
			if (t.includes('.wmv')) return false;
			if (t.includes('.xml')) return false;
			if (t.includes('</a')) return false;
			if (t.includes('<a')) return false;
			if (t.includes('javascript:')) return false;
			if (t.includes('mailto:')) return false;
			if (t.includes('tel:')) return false;
			if (t.includes('watch?')) return false;
			return true;
		};

		const develop = (targets) => {
			let promises = [];
			if (!targets || targets.length === 0) {
				return promises;
			}

			let filtered = _.filter(targets, filter);
			filtered = _.uniq(filtered);
			let chunked = _.chunk(filtered, blockSize);

			_.each(chunked, (ch) => {
				invocations = invocations + 1;
				const msg = queue.makeMessage(
					ch,
					limit,
					executionId,
					rootUrl,
					invocations
				);
				log.meta('SQS message payload: ' + JSON.stringify(msg));
				promises.push(queue.sendMessage(msg));
			});
			return promises;
		};
		// - - - - -- - - - - - - - - - - - -
		// May have already reached page doc limit. If so, it's sloppy to make
		// any more SQS messages to trigger add'l lambdas that won't do anything.
		let ato = authorityToOperate();
		return ato.then((res) => develop(targets)).catch((err) => []);
	};

	const makeScanPromises = (urls) => {
		// Make array of promises per urls to scan
		let promises = [];
		const iterator = (url) => {
			promises.push(siteScanner(url, rootUrl));
			return true;
		};

		if (urls.length > 0) {
			_.each(urls, iterator);
		}
		return promises;
	};

	const runAllPromises = (promises, context) => {
		if (!promises || promises.length === 0) {
			return Promise.resolve([]);
		}
		return Promise.all(promises)
			.then((results) => {
				log.meta(
					`${context} promise results ${JSON.stringify(results)}`
				);
				return results;
			})
			.catch((error) => {
				log.error(`${context} promise error ${error}`);
				return new Error(error);
			});
	};

	const runCrawlerCycle = (urls) => {
		// Promise to scan each url read from the queue event
		let promises = makeScanPromises(urls);

		if (promises.length > 0) {
			// Execute scan url promises
			let task = runScanPromises(promises);
			return task
				.then((results) => makePagePromises(results))
				.then((promises) => runPagePromises(promises))
				.then(() => makeQueuePromises(newTargets))
				.then((promises) => runQueuePromises(promises))
				.then(() => conclude('OK: Normal end of job.'))
				.catch((error) => concludeWithError(error));
		} else {
			conclude('OK: No scans.');
		}
	};

	const runPagePromises = (promises) => {
		return runAllPromises(promises, 'RunPagePromises');
	};

	const runQueuePromises = (promises) => {
		return runAllPromises(promises, 'RunQueuePromises');
	};

	const runScanPromises = (promises) => {
		return runAllPromises(promises, 'RunScanPromises');
	};

	const savePage = async (executionId, limit, page) => {
		// UDF:: Call(Function('Save'), exid, limit, data)
		const res = await client.query(
			q.Call(q.Function('Save'), executionId, limit, page)
		);
		if (res === false) {
			log.meta(`Page failed ${page.data.url}`);
			return Promise.reject('ATO denied');
		}
		log.meta(`Page saved ${page.data.url} response ${JSON.stringify(res)}`);
		return page.data.url;
	};
	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

	// Extract message content from queue event object
	for (const { messageAttributes, body } of event.Records) {
		urls = JSON.parse(body);
		attributes = messageAttributes;
	}

	// Limit is the hard seek count of pages specified by the end-user; seeded by
	// app server from UI; always forwarded to each new queue message.
	limit = attributes.limit.stringValue
		? Number(attributes.limit.stringValue)
		: 1;

	// Execution id is the string value used to collect all the page documents written to datastore.
	// Seeded by app server who generates it; always forwarded to each new queue message.
	executionId = attributes.executionId.stringValue
		? attributes.executionId.stringValue
		: 'no-op';

	// Root url is the url that begins the cycle. Seeded by app server.
	rootUrl = attributes.rootUrl.stringValue
		? attributes.rootUrl.stringValue
		: 'http://www.example.com';

	// Invocations is an extra measure of safety vs runaways. Seeded by app server.
	invocations =
		!attributes.invocations.stringValue ||
		attributes.invocations.stringValue === '0'
			? 1
			: Number(attributes.invocations.stringValue);

	if (invocations > Number(process.env.invokelimit)) {
		log.meta(
			`${invocations} invocations exceeds limit of ${process.env
				.invokelimit}. Safety stop.`
		);
		return 'Halted: Too many function invocations';
	}

	log.meta(
		`Started with limit of ${limit}, execution Id of ${executionId}, and root of ${rootUrl}`
	);

	// Do we authority-to-operate (ATO)?  ATO results from comparing the page count currently
	// stored vs the specified limit. Page count < limit equal ATO, otherwise halt.
	const aot = authorityToOperate();
	return aot
		.then((res) => {
			// We can proceed, so now do the main crawler workflow
			return runCrawlerCycle(urls);
		})
		.catch((err) => {
			// When the AOT promise rejects we're at the limit or a problem
			// like a network error has occurred. Bottom line: stop.
			log.error(`Main ${err}`);
			return err;
		});
};
