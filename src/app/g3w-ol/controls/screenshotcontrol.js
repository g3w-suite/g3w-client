import GUI from 'services/gui';
const { sameOrigin } = require('core/utils/utils');
const OnClickControl = require('g3w-ol/controls/onclickcontrol');

function ScreenshotControl(options = {}) {
  options = {
    name: "maptoimage",
    tipLabel: "Screenshot",
    label: "\ue90f",
    toggled: false,
    visible: false,
    layers: [],
    ...options
  };

  this.layers     = options.layers;
  options.visible = this.checkVisible(this.layers);

  OnClickControl.call(this, options);

  GUI.getService('map').onafter('loadExternalLayer', this._addLayer.bind(this));
  GUI.getService('map').onafter('unloadExternalLayer', this._removeLayer.bind(this));
}

ol.inherits(ScreenshotControl, OnClickControl);

const proto = ScreenshotControl.prototype;

/**
 * @since 3.8.3 
 */
proto._addLayer = function(layer) {
  this.layers.push(layer);
  this.change(this.layers);
  layer.on('change:visible', () => this.change(this.layers));
};

/**
 * @since 3.8.3 
 */
proto._removeLayer = function(layer) {
  this.layers = this.layers.filter(l => l !== layer);
  this.change(this.layers);
};

proto.change = function(layers = []) {
  this.setVisible(this.checkVisible(layers));
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
proto.checkVisible = function(layers = []) {
  return layers.some((layer) => {
    if (isVectorLayer(layer) || !layer.getVisible()) return;
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
