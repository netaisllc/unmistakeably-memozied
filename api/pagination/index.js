// GET /page handler
const _ = require('lodash');
const faunadb = require('faunadb');
const q = faunadb.query;

// Helpers

// Create datastore client
const client = new faunadb.Client({
	secret : process.env.datastore,
});

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

const getNext = async (exid, after) => {
	const documents = await client.query(
		q.Call(q.Function('PagesByExidWithAfter'), exid, after)
	);
	return pluck(documents, exid);
};

const getPrev = async (exid, before) => {
	const documents = await client.query(
		q.Call(q.Function('PagesByExidWithBefore'), exid, before)
	);
	return pluck(documents, exid);
};

const isNumber = (value) => {
	return typeof value === 'number' && isFinite(value);
};

const pluck = (documents, exid) => {
	// Make a more friendly shape for ui
	if (!documents.data) {
		return [];
	}
	return {
		after  : documents.after ? extractRefValue(documents.after) : null,
		before : documents.before ? extractRefValue(documents.before) : null,
		data   : _.map(documents.data, (doc) => doc.data),
		exid   : exid,
	};
};

// Main - - - - - - - - - - - - - - - - - - - - - - - -
const pageHandler = async (req, res, next, log) => {
	// Validate query properties
	if (!req.query.exid) {
		return res.status(422).json({ errors: { exid: 'cannot be empty' } });
	}
	if (!req.query.after && !req.query.before) {
		return res
			.status(422)
			.json({ errors: 'Either After and Before must be declared' });
	}

	let afterRef = req.query.after || undefined;
	let beforeRef = req.query.before || undefined;
	let executionId = req.query.exid;

	if (afterRef) {
		log.info('Pagination request is AFTER using ', afterRef);
		let results = await getNext(executionId, afterRef);
		return res.status(200).json(results);
	} else {
		log.info('Pagination request is BEFORE using ', beforeRef);
		let results = await getPrev(executionId, beforeRef);
		return res.status(200).json(results);
	}
};

module.exports = pageHandler;
