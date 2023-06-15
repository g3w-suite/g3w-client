import GUI from 'services/gui';
const { sameOrigin } = require('core/utils/utils');
const OnClickControl = require('g3w-ol/controls/onclickcontrol');

function ScreenshotControl(options = {}) {
  this.layers = options.layers || [];
  options.visible = this.checkVisible(this.layers);
  options.name = options.name || "maptoimage";
  options.tipLabel =  options.tipLabel|| "Screenshot";
  options.label = options.label || "\ue90f";
  options.toggled = false;
  OnClickControl.call(this, options);
  // Listen when a new externalLayer is add to map
  GUI.getService('map').onafter('loadExternalLayer', (layer)=> {
    this.layers.push(layer);
    this.change(this.layers);
  })
  // Listen when a externalLayer is remove to map
  GUI.getService('map').onafter('unloadExternalLayer', (layer)=> {
    this.layers = this.layers.filter(_layer => _layer !== layer);
    this.change(this.layers);
  })
}

ol.inherits(ScreenshotControl, OnClickControl);

const proto = ScreenshotControl.prototype;

proto.change = function(layers=[]){
  const visible = this.checkVisible(layers);
  this.setVisible(visible);
};

/**
 * Check visibility for map control based on layers URLs.
 * 
 * Allow to print external WMS layers only when they have
 * same origin URL of current application in order to avoid
 * CORS issue while getting map image.
 * 
 * Layers that don't have a source URL are excluded (eg. base layers)
 * 
 * @param {array} layers
 * 
 * @returns {boolean}
 */
proto.checkVisible = function(layers=[]) {
  return undefined === layers.find((layer) => {
    if (isVectorLayer(layer)) return;
    const source_url = isImageLayer(layer)
      ? layer.getSource().getUrl()
      : layer.getConfig().source && layer.getConfig().source.url;
    return source_url && !sameOrigin(source_url, location);
  });
};

function isVectorLayer(layer) {
  return layer instanceof ol.layer.Vector;
}

function isImageLayer(layer) {
  return (layer instanceof ol.layer.Tile || layer instanceof ol.layer.Image);
}


module.exports = ScreenshotControl;
