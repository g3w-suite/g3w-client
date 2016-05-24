var boostrap = require('g3w-base-app/bootstrap');
var Nominatim = require('g3w/core/geocodingservice').Nominatim;
var GeocodingListPanelComponent = require('g3w/gui/geocoding/listpanel');
var ListPanel = require('g3w/gui/listpanel').ListPanel;
var GUI = require('g3w/gui/gui');

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
  
  config.getWmsUrl = function(project){
    return config.server.urls.ows+'/'+config.group.id+'/'+project.type+'/'+project.id;
  };
  config.getProjectConfigUrl = function(project){
    return config.server.urls.config+'/'+config.group.id+'/'+project.type+'/'+project.id;
  }
  
  if (config.client.debug){
    Vue.config.debug = true;
  }
  
  boostrap(config);
  
  Nominatim.on("results",function(result,query){
    var listPanel = new ListPanel({
      name: "Risultati ricerca '"+query+"'",
      id: 'nominatim_results',
      list: result,
      listPanelComponent: GeocodingListPanelComponent
    });
    GUI.showListing(listPanel);
  })
});
