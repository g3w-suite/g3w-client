var inherit = require('core/utils/utils').inherit;
var GUI = require('gui/gui');
var ProjectService = require('core/project/projectservice').ProjectService;
var G3WObject = require('core/g3wobject');

function SearchesService(){
  var self = this;
  this.init = function() {
    this.state.searches = ProjectService.state.project.search;
  }
  this.state = {
    searches: []
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
inherit(SearchesService, G3WObject);

module.exports = new SearchesService();