var inherit = require('core/utils/utils').inherit;
var localize = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var GUI = require('gui/gui');
var SearchQueryService = require('core/search/searchqueryservice');
var ListPanel = require('gui/listpanel').ListPanel;
var Panel = require('gui/panel');
var SearchResultPanelComponent = require('gui/search/vue/results/resultpanel');
var ProjectService = require('core/project/projectservice').ProjectService;

//componente vue pannello search
var SearchPanelComponet = Vue.extend({
  template: require('./searchpanel.html'),
  data: function() {
    return {
      //forminputs: self.createInputsFormFromFilter()
    }
  },
  methods: {
    doSearch: function(event) {
      event.preventDefault();
      var filterObject = SearchQueryService.createQueryFilterObject(self.querylayer, self.filter);
      //passo l'oggetto filter che avrà stessa struttura per tutti i tipi di chiamate dirette
      //o estratte da configurazione filter del server
      SearchQueryService.doQuerySearch(filterObject);
    }
  }
});

function SearchPanel() {
  self = this;
  this.config = {};
  this.filter = {};
  this.name = null;
  this.id = null;
  this.querytype = null;
  this.querylayer = null;
  this.InternalPanel = SearchPanelComponet;
  //funzione inizializzazione
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
};

inherit(SearchPanel, Panel);

//search query
SearchQueryService.on("searchresults",function(results){
  var listPanel = new ListPanel({
    name: "Risultati ricerca",
    id: 'nominatim_results',
    list: results,
    listPanelComponent: SearchResultPanelComponent
  });
  GUI.showListing(listPanel);
});

module.exports = SearchPanel;
