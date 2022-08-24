const { version }      = require('./package.json');

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

const G3W_KEYS = {
  // google: '<INSERT HERE YOUR GOOGLE API KEY>',
  // bing: '<INSERT HERE YOUR BING API KEY>'
};

const G3W_ADMIN_PATH = '../g3w-admin/g3w-admin'; // path to G3W-ADMIN main code

let conf = {
  assetsFolder:  './src/assets',      // path to G3W-CLIENT assets folder
  pluginsFolder: './src/plugins', // path to G3W-CLIENT plugins folder
  distFolder:    './dist',        // path to G3W-CLIENT dist folder
  clientFolder:  './dist/client', // path to G3W-CLIENT client folder
  admin_plugins_folder:    G3W_ADMIN_PATH, // path to G3W-ADMIN where are stored all plugin folders
  admin_static_folder:    `${G3W_ADMIN_PATH}/client/static`,    // path to G3W-ADMIN client/static
  admin_templates_folder: `${G3W_ADMIN_PATH}/client/templates`, // path to G3W-ADMIN client/templates
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
  // override "initConfig->group->plugins" attribute for custom plugin development
  plugins: G3W_PLUGINS,
  keys: G3W_KEYS
};

// backward compatibilities (v3.x)
if (version < "4") {
  conf.proxy.urls      = conf.proxy.routes;
  conf.localServerPort = conf.port;
  conf.g3w_admin_paths = {
    dev: {
      g3w_admin_plugins_basepath:     conf.admin_plugins_folder.replace(/\/?$/, '/'),
      g3w_admin_client_dest_static:   conf.admin_static_folder,
      g3w_admin_client_dest_template: conf.admin_templates_folder
    }
  };
}

module.exports = conf;