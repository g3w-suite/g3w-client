var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var GUI = require('gui/gui');
var Component = require('gui/vue/component');
var G3WObject = require('core/g3wobject');

var vueComponentOptions = {
  template: require('./resultpanel.html'),
  methods: {},
  created: function(){
    $("#search-results-table").footable({
      calculateWidthOverride: function(){
        return {
          width: $('#search-results').width()
        }
      }
    });
  }
};

// se lo voglio istanziare manualmente
var InternalComponent = Vue.extend(vueComponentOptions);

function QueryResultComponent(options){
  base(this,options);
  this.id = "result-component";
  this.title = "result";
  this.internalComponent = new InternalComponent;
  merge(this, options);
};

inherit(QueryResultComponent, Component);

module.exports = QueryResultComponent;

