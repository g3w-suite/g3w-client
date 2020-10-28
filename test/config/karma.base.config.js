const { proxy } = require('../../config');
const vendorsFiles = require('./vendors'); // import vendors files
const SERVER = proxy.url;

module.exports = {
  frameworks: ['mocha', 'chai', 'browserify'],
  reporters: ['progress'],
  colors: true,
  singleRun: true,
  browsers: ['ChromeHeadless'],
  autoWatch: false,
  files: [...vendorsFiles, '../specs/**/*.specs.js'],
  preprocessors: {
    '../specs/**/*.specs.js': ['browserify']
  },
  exclude: ['../../node_modules/','../../src/plugins/**/node_modules/'],
  proxies: {
    '/vector/':`${SERVER}vector/`,
    '/api/':`${SERVER}api/`,
    '/ows/':`${SERVER}ows/`,
    '/qdjango2_media/':`${SERVER}qdjango2_media/`,
    '/static/':`${SERVER}static/`,
    '/en/': `${SERVER}en/`,
    '/it/':`${SERVER}it/`,
    '/dist/':`${SERVER}static/`,
  },
  listenAddress: 'localhost',
  proxyReq: function(proxyReq, req, res, options) {
    proxyReq.setHeader('Referer', SERVER);
    proxyReq.setHeader('Origin', SERVER);
    proxyReq.setHeader('Host', 'localhost:8001');
  },
  proxyRes: function(proxyRes, req, res) {
    const {url, method, headers} = req;
    if (req.method == 'GET') {
      const set_cookie = proxyRes.headers['set-cookie'];
      if (set_cookie) res.writeHead(200, {'csrftoken': set_cookie[0].split(';')[0].split('csrftoken=')[1] })
    }
  },
  browserify: {
    debug: true,
    transform: ['stringify', ['babelify', {'babelrc': true}], 'vueify'],
    paths: ["../../src/app/", "../../src/", "../../src/plugins/"]
  },
  concurrency: Infinity
};
