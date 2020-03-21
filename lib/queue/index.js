const AWS = require('aws-sdk');
const _ = require('lodash');
const log = require('../log');
//require('dotenv').config();

// Set the region
AWS.config.update({ region: 'us-west-2' });

// Create an SQS service object
const SQS = new AWS.SQS({ apiVersion: '2012-11-05' });
const QUEUE_URL = process.env.queueurl;

// Note: the case of the props in the following object template
// matter a great deal to SQS when writing to the queue.
const template = {
	DelaySeconds      : 0,
	MessageAttributes : {
		limit       : {
			DataType    : 'Number',
			StringValue : null,
		},
		executionId : {
			DataType    : 'String',
			StringValue : null,
		},
		rootUrl     : {
			DataType    : 'String',
			StringValue : null,
		},
		invocations : {
			DataType    : 'Number',
			StringValue : null,
		},
	},
	MessageBody       : null,
	QueueUrl          : null,
};

const makeQueueMessage = (
	targets,
	limit,
	executionId,
	rootUrl,
	invocations
) => {
	const params = _.cloneDeep(template);
	params.MessageAttributes.limit.StringValue = String(limit);
	params.MessageAttributes.executionId.StringValue = executionId;
	params.MessageAttributes.rootUrl.StringValue = rootUrl;
	params.MessageAttributes.invocations.StringValue = String(invocations);
	params.MessageBody = JSON.stringify(targets);
	params.QueueUrl = QUEUE_URL;
	return params;
};

const sendQueueMessage = (params) => {
	const response = SQS.sendMessage(params).promise();
	return response
		.then((res) => {
			log.meta(`SQS message submitted OK. ${res.MessageId}`);
			return res;
		})
		.catch((err) => {
			log.error(`SQS message rejected. ${err}`);
			return err;
		});
};

module.exports = {
	makeMessage : makeQueueMessage,
	sendMessage : sendQueueMessage,
};
