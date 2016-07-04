var boostrap = require('g3w-client-common/bootstrap');
var Nominatim = require('g3w/core/geocodingservice').Nominatim;
var GeocodingListPanelComponent = require('g3w/gui/geocoding/listpanel');
var ListPanel = require('g3w/gui/listpanel').ListPanel;
var GUI = require('g3w/gui/gui');

var config = require('./config/config.js');

$(function (){  
  config.getWmsUrl = function(project){
    return config.server.urls.ows+'/'+config.group.id+'/'+project.type+'/'+project.id;
  };
  config.getProjectConfigUrl = function(project){
    return config.server.urls.config+'/'+config.group.id+'/'+project.type+'/'+project.id;
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
