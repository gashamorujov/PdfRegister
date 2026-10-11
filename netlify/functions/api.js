'use strict';

const serverless = require('serverless-http');
const app = require('../../server/src/index.js');

exports.handler = serverless(app);
