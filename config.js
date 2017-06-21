var conf = {
  distFolder: './dist',
  clientFolder: './dist/g3w-client',
  g3w_admin_plugins_basepath: '../g3w-admin/g3w-admin',
  g3w_admin_client_dest_base: '../g3w-admin/g3w-admin/client/static/',
  proxy: {
    url: 'http://localhost:8000/',
    urls: ['/api','/ows','/qdjango2_media','/static', '/en']
  }
};

module.exports = conf;
