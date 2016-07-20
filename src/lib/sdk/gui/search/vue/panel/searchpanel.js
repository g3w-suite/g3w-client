var inherit = require('core/utils/utils').inherit;
var localize = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var GUI = require('gui/gui');
var SearchQueryService = require('core/search/searchqueryservice');
var ListPanel = require('gui/listpanel').ListPanel;
var Panel = require('gui/panel');
var SearchResultPanelComponent = require('gui/search/vue/results/resultpanel');

//componente vue pannello search
var SearchPanelComponet = Vue.extend({
  template: require('./searchpanel.html'),
  data: function() {
    return {
      forminputs: [],
      filterObject: {},
      formInputValues : []
    }
  },
  methods: {
    doSearch: function(event) {
      self = this;
      event.preventDefault();
      //al momento molto farragginoso ma da rivedere
      //per associazione valore input
      _.forEach(this.filterObject.filterObject, function(v,k){
        _.forEach(v, function(input, index){
          _.forEach(input, function(v, k, obj){
            _.forEach(v, function(v, k, obj){
              obj[k] = self.formInputValues[index].value;
            });
          });
        });
      });
      SearchQueryService.doQuerySearch(this.filterObject);
    }
  }
});

//costruttore del pannello e del suo componente vue
function SearchPanel() {
  self = this;
  this.config = {};
  this.filter = {};
  this.name = null;
  this.id = null;
  this.querytype = 'standard';
  this.querylayerid = null;
  this.InternalPanel = new SearchPanelComponet();
  //funzione inizializzazione
  this.init = function(config) {
      this.config = config || {};
      this.name = this.config.name || this.name;
      this.id = this.config.id || this.id;
      this.filter = this.config.options.filter || this.filter;
      this.querytype = this.config.options.querytype || this.querytype;
      this.querylayerid = this.config.options.querylayerid || this.querylayerid;
      //vado a riempire gli input del form del pannello
      this.fillInputsFormFromFilter();
      //creo e assegno l'oggetto filtro
      var filterObjFromConfig = SearchQueryService.createQueryFilterFromConfig(this.filter);
      //alla fine creo l'ggetto finale del filtro da passare poi al queryWMSprovider
      this.InternalPanel.filterObject = SearchQueryService.createQueryFilterObject(this.querylayerid, filterObjFromConfig);
  };

  //funzione che popola gli inputs che ci saranno nel form del pannello ricerca
  //oltre costruire un oggetto che legherà i valori degli inputs del form con gli oggetti
  //'operazionali' del filtro
  this.fillInputsFormFromFilter = function() {
    var id = 0;
    var formValue;
    _.forEach(this.filter,function(v,k,obj) {
      _.forEach(v, function(input){
        //sempre nuovo oggetto
        formValue = {};
        //inserisco l'id all'input
        input.id = id
        formValue.value = null;
        //popolo gli inputs:
        // valori
        self.InternalPanel.formInputValues.push(formValue);
        //input
        self.InternalPanel.forminputs.push(input);
        id+=1;
      });
    });
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
