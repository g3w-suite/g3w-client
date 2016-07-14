var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var t = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var Component = require('gui/vue/component');
var GUI = require('gui/gui');
var ProjectsRegistry = require('core/project/projectsregistry');
var ProjectService = require('core/project/projectservice').ProjectService;
var SearchesService = require('core/search/searchesservice');

var vueComponentOptions = {
   template: require('./search.html'),
   data: function() {
    	return {
    	  searches: SearchesService.state
    	};
   },
   methods: {
    showSearchPanel: function(search) {
        var panel = SearchesService.showSearchPanel(search);
    }
  }
};

// se lo voglio istanziare manualmente
var InternalComponent = Vue.extend(vueComponentOptions);
// se lo voglio usare come componente come elemento html
//Vue.component('g3w-search',vueComponentOptions);

/* COMPONENTI FIGLI */
/* FINE COMPONENTI FIGLI */

/* INTERFACCIA PUBBLICA */
function SearchComponent(options){
  this.id = "search-component";
  this.title = "search";
  this.InternalComponent = InternalComponent;
  merge(this,options);
  this.initService = function() {
    //inizializzo il servizio
    SearchesService.init()
  };
}
inherit(SearchComponent, Component);

module.exports = SearchComponent;
