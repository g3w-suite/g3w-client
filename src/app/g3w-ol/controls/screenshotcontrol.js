import GUI from 'services/gui';

const { sameOrigin } = require('core/utils/utils');
const OnClickControl = require('g3w-ol/controls/onclickcontrol');

/**
 * @FIXME prevent tainted canvas error
 * 
 * Because the pixels in a canvas's bitmap can come from a variety of sources,
 * including images or videos retrieved from other hosts, it's inevitable that
 * security problems may arise. As soon as you draw into a canvas any data that
 * was loaded from another origin without CORS approval, the canvas becomes
 * tainted.
 * 
 * A tainted canvas is one which is no longer considered secure, and any attempts
 * to retrieve image data back from the canvas will cause an exception to be thrown.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image
 */
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

  if (this.isVisible()) {
    GUI.getService('map').onafter('loadExternalLayer', this._addLayer.bind(this));
  }

  /** @TODO prevent tainted canvas error  */
  //GUI.getService('map').onafter('unloadExternalLayer', this._removeLayer.bind(this));
}

ol.inherits(ScreenshotControl, OnClickControl);

const proto = ScreenshotControl.prototype;

/**
 * @since 3.8.3 
 */
proto._addLayer = function(layer) {
  if (this.isVisible()) {
    this.layers.push(layer);
    this.change(this.layers);

    /** @TODO prevent tainted canvas error  */
    //layer.on('change:visible', () => this.change(this.layers));
  }
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
  return !layers.some(isCrossOrigin);
};

function isCrossOrigin(layer) {
  if (isVectorLayer(layer)) return;
  const source_url = isImageLayer(layer)
    ? layer.getSource().getUrl()
    : layer.getConfig().source && layer.getConfig().source.url;
  return source_url && !sameOrigin(source_url, location);
}

function isVectorLayer(layer) {
  return layer instanceof ol.layer.Vector;
}

function isImageLayer(layer) {
  return (layer instanceof ol.layer.Tile || layer instanceof ol.layer.Image);
}

module.exports = ScreenshotControl;
