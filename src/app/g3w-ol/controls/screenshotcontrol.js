const OnClickControl = require('g3w-ol/controls/onclickcontrol');

function ScreenshotControl(options = {}) {
  this.layers = options.layers || [];
  const visible = this.checkVisible(this.layers);
  options.visible = visible;
  options.name = options.name || "maptoimage";
  options.tipLabel =  options.tipLabel|| "Screenshot";
  options.label = options.label || "\ue90f";
  options.toggled = false;
  OnClickControl.call(this, options);
}

ol.inherits(ScreenshotControl, OnClickControl);

const proto = ScreenshotControl.prototype;

proto.change = function(layers=[]){
  const visible = this.checkVisible(layers);
  this.setVisible(visible);
};

proto.checkVisible = function(layers=[]){
  const find = layers.find(layer => layer.isExternalWMS ? layer.isExternalWMS() : false);
  return !find;
};

module.exports = ScreenshotControl;
