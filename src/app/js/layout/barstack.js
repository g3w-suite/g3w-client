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
  panel.onShow(container);
  this._panels.push(panel);
  this.state.panels.push({
    id: panel.id,
    name: panel.name
  });
};

proto.pop = function(){
  // qui potremo chiedere al pannello se può essere chiuso...
  var panel = this._panels.slice(-1)[0];
  if (panel.onClose()) {
    this.state.panels.pop();
    this._panels.pop();
  }
};

module.exports = BarStack;
