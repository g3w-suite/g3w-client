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
  // get layer.getConfig().source instead of layer.getSource()
  // because for BaseLayer instance src/app/core/layers/baselayers/baselayer.js,
  // getSource() return ol.source instance and not source
  // configuration object
  return undefined === layers.find((layer) => {
    // case wms external layer
    if (layer instanceof ol.layer.Vector) return;
    if ((layer instanceof ol.layer.Tile) || (layer instanceof ol.layer.Image)) {
      return !sameOrigin(layer.getSource().getUrl(), location);
    } else {
      // project layer
      return layer.getConfig().source && layer.getConfig().source.url && !sameOrigin(layer.getConfig().source.url, location)
    }
  });
};

module.exports = ScreenshotControl;
