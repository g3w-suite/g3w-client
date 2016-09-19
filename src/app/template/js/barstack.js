var inherit = require('sdk/core/utils/utils').inherit;
var G3WObject = require('sdk/core/g3wobject');

function BarStack(){
  this.state = {
    closable: true,
    panels: []
  }
  /*this.state = {
    panels: []
  };*/
}

inherit(BarStack,G3WObject);

var proto = BarStack.prototype;

proto.push = function(panel, parent, options){
  var self = this;
  options = options || {};
  var append = !_.isNil(options.append) ? options.append : false;
  this.state.closable = !_.isNil(options.closable) ? options.closable : true;
  this.remove(panel); // nel caso esista già prima lo rimuovo
  panel.mount(parent, append)
  .then(function(){
    $(parent).localize();
    self.state.panels.push(panel);
  });
};

proto.pop = function(){
  // qui potremo chiedere al pannello se può essere chiuso...
  var self = this;
  if (this.state.panels.length) {
    var panel = this.state.panels.slice(-1)[0];
    panel.unmount()
    .then(function(){
      //self.state.panels.pop();
      self.state.panels.pop();
    });
  }
};

proto.remove = function(panel) {
  var self = this;
  var idxToRemove = null;
  var id = panel.getId();
  _.forEach(this.state.panels, function(_panel,idx) {
    if (_panel.getId() == id) {
      idxToRemove = idx;
    };
  });
  if (!_.isNull(idxToRemove)) {
    var _panel = self.state.panels[idxToRemove];
    _panel.unmount()
    .then(function() {
      self.state.panels.splice(idxToRemove,1);
    });
  }
};

proto.getLength = function() {
  return this.state.panels.length;
};

module.exports = BarStack;
