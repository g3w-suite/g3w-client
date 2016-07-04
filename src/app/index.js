var boostrap = require('g3w-sdk-client-common/bootstrap');
var GUI = require('g3w-sdk/gui/gui');
var config = require('./config/config.js');
var ApplicationService = require('g3w-sdk/core/applicationservice');

$(function (){  
  config.getWmsUrl = function(project){
    return config.server.urls.ows+'/'+config.group.id+'/'+project.type+'/'+project.id;
  };
  config.getProjectConfigUrl = function(project){
    return config.server.urls.config+'/'+config.group.id+'/'+project.type+'/'+project.id;
  }
  boostrap(config);
});
