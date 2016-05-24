var boostrap = require('g3w-base-app/bootstrap');

$(function (){
  var plugins = require('./js/plugins');
  var tools = require('./js/tools');
  
  var config = {
    client: {
      debug: true,
      local: false
    },
    server: {
        urls: {
          ows: '/ows',
          api: '/api',
          config: '/api/config',
          staticurl: ''
        }
    },
    group: null,
    plugins: plugins,
    tools: tools,
    templates: {
      app: require('./templates/app.html'),
      sidebar: require('./templates/sidebar.html'),
      floatbar: require('./templates/floatbar.html'),
    }
  };
  
  if (config.client.debug){
    Vue.config.debug = true;
  }
  
  boostrap(config);
});
