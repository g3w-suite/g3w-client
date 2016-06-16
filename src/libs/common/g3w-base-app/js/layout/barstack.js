var inherit = require('g3w/core/utils').inherit;
var G3WObject = require('g3w/core/g3wobject');

function BarStack(){
  this._panels = [];
  this.state = {
    panels: []
  };
}
inherit(BarStack,G3WObject);

var proto = BarStack.prototype;

proto.push = function(panel,container){
  var self = this;
  return panel.onShow(container)
  .then(function(){
    self._panels.push(panel);
    self.state.panels.push({
      id: panel.id,
      name: panel.name
    });
  });
};

proto.pop = function(){
  // qui potremo chiedere al pannello se può essere chiuso...
  var self = this;
  var panel = this._panels.slice(-1)[0];
  return panel.onClose()
  .then(function(){
    self.state.panels.pop();
    self._panels.pop();
  });
};

module.exports = BarStack;
