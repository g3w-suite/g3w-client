/**
 * @file Development entry point (app.min.js)
 * @since v3.8
 */

// include backward compatibilies
import './deprecated';

// expose global variables
import './globals';

// apply dev config overrides (config.js)
(require('../config').devConfig || (() => { })).call();

// run app (index.prod.js)
require('./index.prod');
