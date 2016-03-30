var conf = {
  g3w_admin_dest: '../g3w-admin/g3w-admin/client/static/g3w-client',
  proxy: {
    url: 'http://localhost:8000/',
    urls: ['/api','/ows']
  }
};

module.exports = conf;
