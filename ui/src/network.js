import axios from 'axios';

const HOSTPORT = '159.89.141.106:3001';

// Private
const _error = (err) => {
	if (err.response) {
		// The request was made and the server responded with a status code
		// that falls out of the range of 2xx
		console.log(err.response.data);
		console.log(err.response.status);
		console.log(err.response.headers);
	} else if (err.request) {
		// The request was made but no response was received
		// `error.request` is an instance of XMLHttpRequest in the browser and an instance of
		// http.ClientRequest in node.js
		console.log(err.request);
	} else {
		// Something happened in setting up the request that triggered an Error
		console.log('Error', err.message);
	}
	return err;
};

const _get = async (url) => {
	return axios
		.get(url)
		.then((res) => {
			return res.data;
		})
		.catch((err) => {
			return Promise.reject(err);
		});
};

const _post = (url, payload) => {
	const options = {
		data   : payload,
		method : 'post',
		url    : url,
	};
	return axios(options)
		.then((res) => {
			return res.data;
		})
		.catch((err) => {
			return Promise.reject(err);
		});
};

// Public
export const backward = async (exid, ref) => {
	if (exid && ref) {
		return await _get(`http://${HOSTPORT}/page?exid=${exid}&before=${ref}`);
	}
};

export const forward = async (exid, ref) => {
	if (exid && ref) {
		return await _get(`http://${HOSTPORT}/page?exid=${exid}&after=${ref}`);
	}
};

export const startCrawl = async (url, limit) => {
	return await _post(`http://${HOSTPORT}/exec`, {
		url   : url,
		limit : limit,
	});
};
