var inherit = require('./utils').inherit;
var StoreProvider = require('./storeprovider');
var ProjectService = require('g3w/core/projectservice');
var ol3helpers = require('g3w-ol3/src/g3w.ol3').helpers;

function MapService(){
  var self = this;
  this.viewer;
  this.store = {};
  
  ProjectService.on('projectset',function(){
    //self.loadViewer();
  });
  
  this.setupViewer = function(config){
    this.viewer = ol3helpers.createViewer({
      view: {
        center: [1253231.22, 5430565.5017],
        zoom: 12  
      }
    });
    this.viewer.addBaseLayer('OSM');
  };
  this.setupViewer();
  
  this.showViewer = function(elId){
    this.viewer.setTarget(elId);
  }
};

inherit(ProjectService,StoreProvider);

module.exports = new MapService
