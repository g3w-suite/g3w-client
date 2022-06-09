const G3W_HOST_SCHEMA = 'http';
const G3W_HOST        = '127.0.0.1'; // local development server
const G3W_ADMIN_PORT  = '8000';      // G3W-ADMIN development server
const G3W_CLIENT_PORT = '3000';      // G3W-CLIENT development server

const conf = {
  assetsFolder:  './assets',      // path to G3W-CLIENT assets folder
  pluginsFolder: './src/plugins', // path to G3W-CLIENT plugins folder
  distFolder:    './dist',        // path to G3W-CLIENT dist folder
  clientFolder:  './dist/client', // path to G3W-CLIENT client folder
  admin_plugins_folder:   '../g3w-admin/g3w-admin',                  // path to G3W-ADMIN main code
  admin_static_folder:    '../g3w-admin/g3w-admin/client/static',    // path to G3W-ADMIN client/static
  admin_templates_folder: '../g3w-admin/g3w-admin/client/templates', // path to G3W-ADMIN client/templates
  host: G3W_HOST,
  port: G3W_CLIENT_PORT,
  // proxy configuration for local G3W_ADMIN server (where G3W-ADMIN is running)
  proxy: {
    host: G3W_HOST,
    url: `${G3W_HOST_SCHEMA}://${G3W_HOST}:${G3W_ADMIN_PORT}/`,
    routes: ['/api','/ows','/media','/static', '/en/', '/it/', '/upload/']
  },
  test: {
    path: '/test/config/groups/'
  }
};

module.exports = conf;
