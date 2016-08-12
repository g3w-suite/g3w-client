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

proto.push = function(panel, parent, append){
  var self = this;
  var append = append || false;
  var substitute = false;
  var id = panel.getId();
  _.forEach(self.state.panels, function(_panel) {
    if (_panel.id == id) {
      substitute = true;
      self._panels[_panel.position].unmount();
      self._panels[_panel.position] = panel;
    };
  });
  panel.mount(parent, append)
  .then(function(){
    if (!substitute) {
      var position = self._panels.push(panel) - 1;
      self.state.panels.push({
          id: panel.getId(),
          title: panel.getTitle(),
          position: position
      });
    }
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
