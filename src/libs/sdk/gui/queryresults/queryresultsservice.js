var inherit = require('core/utils/utils').inherit;
var GUI = require('gui/gui');
var G3WObject = require('core/g3wobject');

function QueryResultsService(){
  var self = this;
  this.init = function(options) {
    //codice qui
  };
  this.state = {
    results: []
  };
  this.showResults = function() {
    //codice qui
  };
  this.setResults = function(results) {
    this.state.results = results;
  };
};

// Make the public service en Event Emitter
inherit(QueryResultsService, G3WObject);

module.exports = QueryResultsService;
