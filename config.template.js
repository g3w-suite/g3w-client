const { version }     = require('./package.json');

const G3W_HOST_SCHEMA  = 'http';
const G3W_HOST         = '127.0.0.1'; // local development server
const G3W_ADMIN_PORT   = '8000';      // G3W-ADMIN development server
const G3W_CLIENT_PORT  = '3000';      // G3W-CLIENT development server
const G3W_PROXY_ROUTES = [            // G3W-ADMIN routes to be proxied while developing
  '/media',
  '/api',
  '/ows',
  '/static',
  '/en/',
  '/it/',
  '/upload/'
];

const G3W_PLUGINS = {                // override "initConfig->group->plugins" attribute for custom plugin development
  // "your-plugin-folder-name": {
  //    baseurl: '../dist',
  //    gid: 'qdjango:1'             // 1 = current project id
  // }
};

if (version < "4") {
  module.exports = {
    assetsFolder:  './assets',        //template folder of template repository
    pluginsFolder: './src/plugins',   // plugins folder of app plugins
    distFolder:    './dist',          // G3W-CLIENT main dist folder
    clientFolder:  './dist/client',   // G3W-CLIENT client dist folder where are compiled
    localServerPort: G3W_CLIENT_PORT, // port for local server. If not set local server run on port 3000
    g3w_admin_paths: {
      dev: {
        g3w_admin_plugins_basepath:     '../g3w-admin/g3w-admin/',                 // local G3W-ADMIN main path code
        g3w_admin_client_dest_static:   '../g3w-admin/g3w-admin/client/static',    // local G3W-ADMIN client static path
        g3w_admin_client_dest_template: '../g3w-admin/g3w-admin/client/templates', // local G3W-ADMIN client template folder
      }
    },
    host: G3W_HOST,
    localServerPort: G3W_CLIENT_PORT, // port for local server. If not set local server run on port 3000
    proxy: {                          // proxy configuration for local server
      host: G3W_HOST,
      url: `${G3W_HOST_SCHEMA}://${G3W_HOST}:${G3W_ADMIN_PORT}/`, // local G3W_ADMIN server and port (where G3W-ADIMN is running)
      urls: G3W_PROXY_ROUTES                                      // urls to proxy referred to G3W-ADMIN
    },
    test: {
      path: '/test/config/groups/'
    },
    createProject: {
      before(project) { /* code here */ },
      after(project) { /* code here */ },
    },
    setCurrentProject: {
      before(project) { /* code here */ },
      after(project) { /* code here */ },
    },
    plugins: G3W_PLUGINS,
  };
} else {
  module.exports = {
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
      routes: G3W_PROXY_ROUTES
    },
    test: {
      path: '/test/config/groups/'
    },
    createProject: {
      before(project) { /* code here */ },
      after(project) { /* code here */ },
    },
    setCurrentProject: {
      before(project) { /* code here */ },
      after(project) { /* code here */ },
    },
    plugins: G3W_PLUGINS,
  };
}