var inherit = require('sdk/core/utils/utils').inherit;
var G3WObject = require('sdk/core/g3wobject');

function BarStack(){
  this._panels = [];
  this.state = {
    panels: []
  };
}
inherit(BarStack,G3WObject);

var proto = BarStack.prototype;

proto.push = function(panel, parent){
  var self = this;
  panel.mount(parent)
  .then(function(){
    self._panels.push(component);
    self.state.panels.push({
      id: panel.getId(),
      name: panel.getName()
    });
  });
};

proto.pop = function(){
  // qui potremo chiedere al pannello se può essere chiuso...
  var self = this;
  var panel = this._panels.slice(-1)[0];
  panel.unmount()
  .then(function(){
    self.state.panels.pop();
    self._panels.pop();
  });
};

module.exports = BarStack;
