const { version } = require('./package.json');

let conf = {
  pluginsFolder:          './src/plugins',                                  // path to G3W-CLIENT plugins folder
  admin_plugins_folder:   '../g3w-admin/g3w-admin',                         // path to G3W-ADMIN plugins folder
  admin_overrides_folder: '../g3w-suite-docker/config/g3w-suite/overrides', // path to G3W-SUITE overrides folder
  docker_plugins_folder:  '../g3w-suite-docker/shared-volume/plugins',      // path to G3W-SUITE plugins folder
  plugins:                [                                                 // override "initConfig->group->plugins" attribute for custom plugin development
    // "your-plugin-folder-name-1",
    // "your-plugin-folder-name-2",
    // "your-plugin-folder-name-3",
  ],
  proxy:                  'https://dev.g3wsuite.it/',                       // remote server url to be proxied
  /**
   * @deprecated since 4.1.0, use index.dev.js instead.
   */
  devConfig() {
    if (g3wsdk.version.version.localeCompare('4.1.0', undefined, { numeric: true }) < 0) {
      g3wsdk.core.ApplicationService.once('ready', () => { });
      g3wsdk.core.ApplicationService.once('initconfig', () => {
        initConfig.group.plugins = Object.assign(initConfig.group.plugins || {}, conf.plugins.reduce((a, v) => ({ ...a, [v]: { ...initConfig.group.plugins[v], gid: initConfig.group.initproject, baseUrl: initConfig.staticurl }}), {}));
      });
      //Every time a new iframe is created, listen for messages
      g3wsdk.gui.GUI.on('iframe:message', (w, e) => { 
        //Once app is ready, send a message to the iframe
        if (e.data.action === 'app:ready') {
          w.postMessage({ // test MESSAGE sent to "Open in iframe" map control
            id: null,
            action: 'app:getcenter',                                        // or 'app:getextent'
            data: { epsg: 4326 }	
          }, '*')
        }
      });
      g3wsdk.gui.GUI.once('ready', () => { console.log('ready'); });
      // dark mode
      g3wsdk.gui.GUI.isReady().then(() => {
        document.querySelector('nav').style.setProperty('--skin-color', '#212c31');
      });
      document.body.style.setProperty('--bgcolor', '#212c31');
    }
  }
};

// backward compatibilities (v3.x)
if (version < '4') {
  conf.assetsFolder = (version.localeCompare('3.7.0', undefined, { numeric: true, sensitivity: 'case' }) < 0 ? './assets' : './src/assets');
  conf.plugins      = conf.plugins.reduce((a, v) => ({ ...a, [v]: { gid: 'qdjango:1', baseurl: './dist' }}), {});
  conf.host         =  '127.0.0.1';
  conf.port         = '3000';
  conf.proxy        = { host: '127.0.0.1', url: 'http://127.0.0.1:8000/' };
  conf.test         = { path: '/test/config/groups/' };
}

module.exports = conf;