const path = require('path');
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
  files: [...vendorsFiles, path.join(__dirname,'../specs/**/*.specs.js')],
  preprocessors: {
    [path.join(__dirname,'../specs/**/*.specs.js')]: ['browserify']
  },
  exclude: [path.join(__dirname,'../../node_modules/'),path.join(__dirname,'../../src/plugins/**/node_modules/')],
  proxies: {
    '/api/':`${SERVER}api/`,
    '/ows/':`${SERVER}ows/`,
    '/vector/':`${SERVER}vector/`,
    '/qdjango2_media/':`${SERVER}qdjango2_media/`,
    '/static/':`${SERVER}static/`,
    '/en/': `${SERVER}en/`,
    '/it/':`${SERVER}it/`,
    '/dist/':`${SERVER}static/`,
  },
  listenAddress: proxy.host,
  hostname: proxy.host,
  proxyReq: function(proxyReq, req, res, options) {
    proxyReq.setHeader('Referer', SERVER);
    proxyReq.setHeader('Origin', SERVER);
    proxyReq.setHeader('Host', proxy.host);
  },
  proxyRes: function(proxyRes, req, res) {
    const {url, method, headers} = req;
    const contentDisposition = proxyRes.headers['content-disposition'];
    if (contentDisposition) {
      const fileName = contentDisposition.split('filename=')
      if (proxyRes.statusCode == 200)
        return proxyRes
    }
    if (req.method == 'GET') {
      const set_cookie = proxyRes.headers['set-cookie'];
      if (set_cookie) res.writeHead(200, {'csrftoken': set_cookie[0].split(';')[0].split('csrftoken=')[1] })
    }
  },
  browserify: {
    debug: true,
    transform: ['stringify', ['babelify', {'babelrc': true}], 'vueify'],
    paths: [path.join(__dirname,"../../src/app/"), path.join(__dirname,"../../src/"), path.join(__dirname,"../../src/plugins/")]
  },
  concurrency: Infinity
};
