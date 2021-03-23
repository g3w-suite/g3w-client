const PROTOCOL = 'http';
const HOST = '192.168.1.2';
const PROXY_PORT = '8001';
const LOCAL_PORT = '3000';

const conf = {
  assetsFolder: './assets', //template folder of template repository
  pluginsFolder: './src/plugins', // plugins folder of app plugins
  distFolder: './dist', // G3W-CLIENT main dist folder
  clientFolder: './dist/client', // G3W-CLIENT client dist folder where are compiled
  localServerPort: 3000, // port for local server. If not set local server run on port 3000
  g3w_admin_paths: {
    dev: {
      g3w_admin_plugins_basepath: '../g3w-admin/g3w-admin', // local G3W-ADMIN main path code
      g3w_admin_client_dest_static: '../g3w-admin/g3w-admin/client/static', // local G3W-ADMIN client static path
      g3w_admin_client_dest_template: '../g3w-admin/g3w-admin/client/templates', // local G3W-ADMIN client template folder
    }
  },
  localServerPort: LOCAL_PORT, // port for local server. If not set local server run on port 3000
  // proxy configurazion for local server
  proxy: {
    host: HOST,
    url: `${PROTOCOL}://${HOST}:${PROXY_PORT}/`, // local G3W_ADMIN server and port (where G3W-ADIMN is running)
    urls: ['/api','/ows','/qdjango2_media','/static', '/en'] // urls to proxy referred to G3W-ADMIN
  },
  test: {
    path: '/test/config/groups/'
  },
  dev: {
    plugins: {} // write custom plugin configuration to test client plugin during the initial phase of development when server is not already done
  }
};

module.exports = conf;
