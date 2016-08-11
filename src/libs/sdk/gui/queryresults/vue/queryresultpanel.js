var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var Component = require('gui/vue/component');
var G3WObject = require('core/g3wobject');

var vueComponentOptions = {
  template: require('./queryresultpanel.html'),
  data: function() {
    return {
      results: {}
    }
  },
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

function QueryResultPanel(options){
  base(this,options);
  this.id = "result-component";
  this.title = "result";
  this.internalComponent = new InternalComponent;
  merge(this, options);
};

inherit(QueryResultPanel, Component);

module.exports = QueryResultPanel;

