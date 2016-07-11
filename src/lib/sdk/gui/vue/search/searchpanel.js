var localize = require('i18n/i18n.service').t;
var resolve = require('core/utils').resolve;
var GUI = require('gui/gui');
var SearchQueryService = require('core/searchqueryservice');
var ListPanel = require('gui/listpanel').ListPanel;
var SearchResultPanelComponent = require('gui/search/results/resultpanel');
var ProjectService = require('core/projectservice').ProjectService;

function Panel(){
  self = this;
  this.config = {};
  this.filter = {};
  this.name = null;
  this.id = null;
  this.querytype = null;
  this.querylayer = null;
  this.panelComponent = null;

  this.init = function(config) {
      this.config = config || {};
      this.name = this.config.name || this.name;
      this.id = this.config.id || this.id;
      this.filter = this.config.options.filter || this.filter;
      this.querytype = this.config.options.querytype || this.querytype;
      this.querylayer = this.config.options.querylayer || this.querylayer;
  };


  this.createInputsFormFromFilter = function() {
    var inputs = [];
    _.forEach(this.filter,function(v,k,obj){
      switch(k) {
        case 'AND':
          if (v.length == 1) {
            inputs.push(v[0].input);
          } else {}
          break;
      };
    })
    return inputs
  };

  this.createPanel = function() {
    var PanelComponent = Vue.extend({
      template: require('./searchpanel.html'),
      data: function() {
          return {
            forminputs: self.createInputsFormFromFilter()
          }
      },
      methods: {
        doSearch: function(event) {
          event.preventDefault();
          console.log(self.querylayer);
          var filterObject = SearchQueryService.createQueryFilterObject(self.querylayer, self.filter);
          //passo l'oggetto filter che avrà stessa struttura per tutti i tipi di chiamate dirette
          //o estratte da configurazione filter del server
          SearchQueryService.doQuerySearch(filterObject);
        }
      }
    });
    return new PanelComponent();
  }
}

SearchQueryService.on("searchresults",function(results){
  var listPanel = new ListPanel({
    name: "Risultati ricerca",
    id: 'nominatim_results',
    list: results,
    listPanelComponent: SearchResultPanelComponent
  });
  GUI.showListing(listPanel);
})

var proto = Panel.prototype;

// viene richiamato dalla toolbar quando il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.onShow = function(container){
  var panel = this.panelComponent = this.createPanel();
  panel.$mount().$appendTo(container);
  localize();
  return resolve(true);
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.onClose = function(){
  var self = this;
  var deferred = $.Deferred();
  self.panelComponent.$destroy(true);
  self.panelComponent = null;
  deferred.resolve();
  return deferred.promise();
};

module.exports = Panel;
