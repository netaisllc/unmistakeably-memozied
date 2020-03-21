// POST /exec handler
const _ = require('lodash');
const faunadb = require('faunadb');
const fetch = require('node-fetch');
const moment = require('moment');
const promisePoller = require('promise-poller').default;
const q = faunadb.query;
const queue = require('../../lib/queue');
const { v4: uuidv4 } = require('uuid');

let executionId;
let invocations;
let limit;
let poller;
let rootUrl;
let urls;
let url;

const execHandler = async (req, res, next, log) => {
	// Create datastore client
	const client = new faunadb.Client({
		secret : process.env.datastore,
	});

	// Helpers - - - - - - - - - - - - - - - - - - - - - - -

	// Check current crawl's progress
	const checkProgress = async () => {
		// UDF:: Call(Function("CompletionPending"), exid, limit) -> returns Promise of boolean
		try {
			const pending = await client.query(
				q.Call(q.Function('CompletionPending'), executionId, limit)
			);
			if (pending === true) {
				log.info(`? Completion pending ${moment().format()}`);
				return Promise.reject('pending');
			}
			log.info(`! Completion reached ${moment().format()}`);
			return true;
		} catch (err) {
			log.error(`checkProgress failed: ${err}`);
			return err;
		}
	};

	const extractRefValue = (refObj) => {
		let str = JSON.stringify(refObj);
		let ref = [];
		_.each(str, (l) => {
			if (isNumber(parseInt(l, 10))) {
				ref.push(l);
			}
		});
		return ref.join('');
	};

	const isNumber = (value) => {
		return typeof value === 'number' && isFinite(value);
	};

	const getPages = async (exid) => {
		/* UDF :: Call(Function("PagesByExid"), exid) -> returns object with @data prop
	 *	which is an array of page document objects having this layout:
	 *
	 *	{
	 *		ref: Ref(Collection("pages"), "260112347782185481"),
	 *		ts: 1584321315460000,
	 *		data: {
	 *			children: 100,
	 *			exid: 'c70127de-acc1-4b58-87d3-d18e1e4830bf',
	 *			title: 'AUSA Breakfasts | Association of the United States Army',
	 *			url: 'https://www.ausa.org/events/ausa-breakfasts'
	 *		}
     *	}
	 *
	 *  It may also contain an @after and/or @before property which contain Refs for 
	 *  pagination. After relates to Next and Before relates to Previous.
	 */
		try {
			const documents = await client.query(
				q.Call(q.Function('PagesByExid'), exid)
			);
			if (documents.data) {
				return pluck(documents, exid);
			}
			return [];
		} catch (err) {
			log.error(`getPages failed: ${err}`);
			return err;
		}
	};

	const pluck = (documents, exid) => {
		// Make a more friendly shape for ui
		if (!documents.data) {
			return [];
		}
		return {
			after  : documents.after ? extractRefValue(documents.after) : null,
			before : documents.before
				? extractRefValue(documents.before)
				: null,
			data   : _.map(documents.data, (doc) => doc.data),
			exid   : exid,
		};
	};

	// Trigger crawler execution
	const triggerCrawler = async (reqUrl, reqLimit) => {
		// Prep queue seed
		executionId = uuidv4();
		invocations = '1';
		limit = reqLimit;
		rootUrl = reqUrl;
		urls = [
			rootUrl,
		];
		const params = queue.makeMessage(
			urls,
			limit,
			executionId,
			rootUrl,
			invocations
		);

		try {
			// Write seed message to queue
			return await queue.sendMessage(params);
		} catch (err) {
			log.error(`triggerCraleer @sendQueue failed: ${err}`);
			return err;
		}
	};
	//  - - - - - - - - - - - - - - - - - - - - - - - - - - -

	// Validate body properties
	if (!req.body.url) {
		return res.status(422).json({ errors: { url: 'cannot be empty' } });
	}
	if (!req.body.limit) {
		return res.status(422).json({ errors: { limit: 'cannot be empty' } });
	}
	if (isNaN(Number(req.body.limit))) {
		return res
			.status(422)
			.json({ errors: { limit: 'must be an integer' } });
	}

	url = `http://${req.body.url}`;
	limit = Number(req.body.limit);

	// Validate url
	try {
		const test = await fetch(url);
		log.info(`[PROOF GET] ${url} ${test.status} ${test.statusText}`);
		if (test.status === '404') {
			return res.status(404).json({ errors: { url: url } });
		}
	} catch (error) {
		log.error(`[PROOF GET] ${url} ${error}`);
		return res.status(400).json({ errors: { url: url } });
	}

	try {
		// Start a crawl on url with limit
		await triggerCrawler(url, limit);
	} catch (err) {
		log.error(`Invoke of fn triggerCrawler failed: ${err}`);
		process.exit(-1);
	}

	// Start poll
	log.info(`[CRAWL] Url ${rootUrl} Limit ${limit}, ExId ${executionId}`);
	poller = promisePoller({
		taskFn   : checkProgress,
		interval : 2500,
		retries  : 128, // ~ 5 minutes
	});

	// Handle master poll promise results
	return (
		poller
			// Get first segment of results
			.then(() => getPages(executionId))
			.then((pages) => res.status(200).json(pages))
			.catch((err) => {
				log.error('[MASTER POLLER] promise rejected ', err);
				return res.status(500).json({ errors: err });
			})
	);
};

module.exports = execHandler;
