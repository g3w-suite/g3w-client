var inherit = require('sdk/core/utils/utils').inherit;
var G3WObject = require('sdk/core/g3wobject');

function BarStack(){
  this._components = [];
  this.state = {
    components: []
  };
}
inherit(BarStack,G3WObject);

var proto = BarStack.prototype;

proto.push = function(component,parent){
  var self = this;
  component.mount(parent)
  .then(function(){
    self._components.push(panel);
    self.state.components.push({
      id: component.getId(),
      name: component.getName()
    });
  });
};

proto.pop = function(){
  // qui potremo chiedere al pannello se può essere chiuso...
  var self = this;
  var component = this._components.slice(-1)[0];
  component.unmount()
  .then(function(){
    self.state.component.pop();
    self._components.pop();
  });
};

module.exports = BarStack;
