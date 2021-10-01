const OnClickControl = require('./onclickcontrol');
function geoScreenshotControl(options = {}) {
  this.layers = options.layers || [];
  const visible = this.checkVisible(this.layers);
  options.visible = visible;
  options.name = "maptoimagegeo";
  options.tipLabel =  "Geo Screenshot";
  options.label = "\ue900";
  options.toggled = false;
  OnClickControl.call(this, options);
}

ol.inherits(geoScreenshotControl, OnClickControl);

const proto = geoScreenshotControl.prototype;

proto.change = function(layers=[]){
  const visible = this.checkVisible(layers);
  this.setVisible(visible);
};

proto.checkVisible = function(layers=[]){
  const find = layers.find(layer => layer.isExternalWMS ? layer.isExternalWMS() : false);
  return !find;
};

module.exports = geoScreenshotControl;
