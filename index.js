'use strict';

// Vercel detects this root entry point and runs the existing Express application.
// Static assets remain in /public and are served by the platform CDN.
module.exports = require('./server/src/index.js');
