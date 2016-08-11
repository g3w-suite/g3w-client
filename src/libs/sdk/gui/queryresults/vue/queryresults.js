var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var Component = require('gui/vue/component');
var G3WObject = require('core/g3wobject');
var QueryResultsService = require('gui/queryresults/queryresultsservice');

var vueComponentOptions = {
  template: require('./queryresults.html'),
  data: function() {
    return {
      results: {}
    }
  },
  methods: {},
  created: function() {
    //codice qui
  }
};

// se lo voglio istanziare manualmente
var InternalComponent = Vue.extend(vueComponentOptions);

function QueryResultsComponent(options){
  base(this,options);
  this.id = "queryresults";
  this.title = "Query Results";
  this._service = new QueryResultsService();
  this.internalComponent = new InternalComponent;
  merge(this, options);
};

inherit(QueryResultsComponent, Component);

module.exports = QueryResultsComponent;

