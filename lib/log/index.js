//log.js
const log = (msg) => {
	console.log(msg);
};

const logError = (msg) => {
	log(`[error] ${msg}`);
};

const logMeta = (msg) => {
	log(`[meta] ${msg}`);
};

module.exports = {
	error  : logError,
	meta   : logMeta,
	simple : log,
};
