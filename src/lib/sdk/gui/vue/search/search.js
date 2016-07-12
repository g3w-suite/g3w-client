var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var t = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var Component = require('gui/vue/component');
var GUI = require('gui/gui');
var ProjectsRegistry = require('core/project/projectsregistry');
var ProjectService = require('core/project/projectservice').ProjectService;

var vueComponentOptions = {
   template: require('./search.html'),
    data: function() {
    	return {
        };
    },
    methods: {
	}
}

// se lo voglio istanziare manualmente
var InternalComponent = Vue.extend(vueComponentOptions);
// se lo voglio usare come componente come elemento html
Vue.component('g3w-search',vueComponentOptions);

/* COMPONENTI FIGLI */
/* FINE COMPONENTI FIGLI */

/* INTERFACCIA PUBBLICA */
function SearchComponent(options){
  base(this,options);
  this.id = "search-component";
  this.title = "Ricerca";
  this.InternalComponent = InternalComponent;
}
inherit(SearchComponent,Component);

module.exports = SearchComponent;
