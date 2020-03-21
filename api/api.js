const compression = require('compression');
const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const path = require('path');

const config = dotenv.config();
if (config.error) {
	throw config.error;
}

// Routes
const routes = {
	identity  : '/',
	execution : '/exec',
	page      : '/page',
};

// Route handlers
const execHandler = require('./execution/index');
const pageHandler = require('./pagination/index');

// Set up logger
const SimpleNodeLogger = require('simple-node-logger');
const logopts = {
	timestampFormat : 'YYYY-MM-DD HH:mm:ss.SSS',
};
const log = SimpleNodeLogger.createSimpleLogger(logopts);
log.setLevel('debug');

// Setup CORS handling
const corsOptions = {
	origin      : function(origin, callback) {
		return callback(null, true);
	},
	credentials : true,
};

// Make server
const port = 3001;
const app = express();
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json()); // to support JSON-encoded bodies
app.use('/static', express.static(path.join(__dirname, 'static')));

// Identity route: Dump name, rank and serial number
app.get(routes.identity, (req, res, next) => {
	log.info(`[GET] Request to identity endpoint.`);
	return res.json({
		service : 'Woogle.ai API',
		version : '0.1',
		message : 'Always better to woogle than google',
	});
});

// Start execution route
app.post(routes.execution, function(req, res, next) {
	log.info(
		`[POST] Request to execute using Url ${req.body.url} and Limit ${req
			.body.limit}`
	);
	return execHandler(req, res, next, log);
});

// Results paging route
app.get(routes.page, (req, res, next) => {
	log.info(`[GET] Request to paginate results for ExID ${req.query.exid}`);
	return pageHandler(req, res, next, log);
});

// Remote quit
app.get(
	[
		'/down',
		'/exit',
	],
	(req, res) => {
		res.sendStatus(200);
		log.info('[GET] Request on remote management route; shutting down...');
		process.exit(0);
	}
);

// Boot
app.listen(port, () =>
	log.info(`[Woogle API v0.1] Listening on port ${port}.`)
);
