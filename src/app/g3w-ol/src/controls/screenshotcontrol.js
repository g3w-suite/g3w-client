const OnClickControl = require('./onclickcontrol');
function Screenshotcontrol(options = {}) {
  this.layers = options.layers || [];
  const visible = this.checkVisible(this.layers);
  options.visible = visible;
  options.name = "maptoimage";
  options.tipLabel =  "Screenshot";
  options.label = "\ue90f";
  options.toggled = false;
  OnClickControl.call(this, options);
}

ol.inherits(Screenshotcontrol, OnClickControl);

const proto = Screenshotcontrol.prototype;

proto.change = function(layers=[]){
  const visible = this.checkVisible(layers);
  this.setVisible(visible);
};

proto.checkVisible = function(layers=[]){
  const find = layers.find(layer => layer.isExternalWMS ? layer.isExternalWMS() : false);
  return !find;
};

module.exports = Screenshotcontrol;
