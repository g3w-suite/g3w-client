/**
 * @file test your local JS code (development) against a remote server (production)
 * @since 4.1.0
 */

// run tests in sequential order
[
	require('./map/demo-311'),
	require('./map/expression'),
	require('./map/statistic'),
	require('./map/timeseries'),
].reduce((promise, test) => promise.then(test), Promise.resolve());