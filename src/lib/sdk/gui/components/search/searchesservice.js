var inherit = require('g3w/core//utils').inherit;
var G3WObject = require('g3w/core/g3wobject');
var WidgetsService = require('g3w/core/widgetsservice');
var GUI = require('g3w/gui/gui');
var Panel = require('./searchpanel');
function SearchesService(){
  var self = this;
  this.state = {
    elements: []
  };
  this.showSearchPanel = function(panelConfig) {
    var panel = new Panel();// creo panello search
    panel.init(panelConfig);//inizializzo pannello serach
    GUI.showPanel(panel);
  };
  this.stop = function(){
    var deferred = $.Deferred();
    deferred.resolve();
    return deferred.promise();
  };
};

// Make the public service en Event Emitter
inherit(SearchesService,G3WObject);

module.exports = new SearchesService
