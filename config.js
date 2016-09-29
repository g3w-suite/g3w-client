var conf = {
  distFolder: './dist',
  g3w_admin_dest: '../g3w-admin/g3w-admin/client/static/g3w-client',
  proxy: {
    url: 'http://localhost:8000/',
    urls: ['/api','/ows','/qdjango2_media','static']
  }
};

module.exports = conf;
