var conf = {
  distFolder: './dist', // g3w-client dist folder
  clientFolder: './dist/client', // g3w-client client dist folder
  localServerPort: 3000, // port for local server. If not set local server run on port 3000
  g3w_admin_plugins_basepath: '../g3w-admin-dev/g3w-admin', // local g3w-admin maain path code
  g3w_admin_client_dest_static: '../g3w-admin-dev/g3w-admin/client/static', // local g3w-admin client static path
  g3w_admin_client_dest_template: '../g3w-admin-dev/g3w-admin/client/templates',
  // proxy configurazion for local server
  proxy: {
    url: 'http://localhost:8000/', // local g3w-admin server and port
    urls: ['/api','/ows','/qdjango2_media','/static', '/en'] // urls to proxy referred to g3w-admin
  }
};

module.exports = conf;
