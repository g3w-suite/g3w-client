var inherit = require('core/utils/utils').inherit;
var GUI = require('gui/gui');
var ProjectService = require('core/project/projectservice').ProjectService;
var G3WObject = require('core/g3wobject');
var SearchPanel = require('gui/search/vue/panel/searchpanel');

function SearchesService(){
  var self = this;
  this.init = function(searchesObject) {
    var searches = searchesObject || ProjectService.state.project.search;
    this.state.searches = searches;
  };
  this.state = {
    searches: [],
    panels: {}
  };
  this.showSearchPanel = function(panelConfig) {
    var id = panelConfig.id;
    var panel = this.state.panels[id];
    //verifico se già esiste il pannello altrimenti lo creo
    if (!panel) {
      panel = new SearchPanel();// creo panello search
      panel.init(panelConfig);//inizializzo pannello serach
      this.state.panels[id] = panel;
    };
    GUI.showPanel(panel);
    return panel;
  };
  this.cleanSearchPanels = function() {
    this.state.panels = {};
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