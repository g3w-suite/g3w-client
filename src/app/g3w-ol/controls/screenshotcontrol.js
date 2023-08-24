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
    visible: true, // set initial to true
    layers: [],
    ...options
  };

  this.layers     = options.layers;

  OnClickControl.call(this, options);

  //set visibility based on layers
  this.setVisible(this.checkVisible(this.layers));

  //only if is visible (no CORS issue) need to listen add/remove layer
  if (this.isVisible()) {
    //listen add/remove External Layer event to check visibility of the control
    GUI.getService('map').onafter('loadExternalLayer', this._addLayer.bind(this));
    GUI.getService('map').onafter('unloadExternalLayer', this._removeLayer.bind(this));
  }
}

ol.inherits(ScreenshotControl, OnClickControl);

const proto = ScreenshotControl.prototype;

/**
 * Method call when new layer is add to Project
 * Example wms or vector layer
 * @since 3.8.3
 *
 */
proto._addLayer = function(layer) {
  this.layers.push(layer);
  this.change(this.layers);
  layer.on('change:visible', () => this.change(this.layers));
};

/**
 * Method call when a layer is removed from Project
 * @since 3.8.3 
 */
proto._removeLayer = function(layer) {
  this.layers = this.layers.filter(l => l !== layer);
  this.change(this.layers);
};

/**
 * Method call when layer is add/removed to/from project
 * @param layers
 */
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
  //need to be visible. If it was not visible an CORS issue was raise.
  // Need to reload and remove layer
  return this.isVisible() && !layers.some(isCrossOrigin);
};

/**
 * Check if layer has CORS issue
 * @param layer
 * @returns {boolean}
 */
function isCrossOrigin(layer) {
  let source_url;                                                             // store eventually layer url
  let is_coors = false;
  if (isVectorLayer(layer)) {                                                 // skip vector layers
    is_coors = false;
  } else if (layer.getVisible && !layer.getVisible()) {                       // skip hidden layers
    is_coors = false;
  } else if (isImageLayer(layer)) {                                           // check raster layers
    source_url = layer.getSource().getUrl();
    is_coors   = source_url && !sameOrigin(source_url, location);             //case OL raster layer
  } else if (layer.getConfig().source && layer.getConfig().source.external) { // check external (project/wms) layers (raster)
    source_url = layer.getConfig().source.url;
    is_coors   = source_url && !sameOrigin(source_url, location);
  }

  return is_coors;
}

function isVectorLayer(layer) {
  return layer instanceof ol.layer.Vector;
}

function isImageLayer(layer) {
  return (layer instanceof ol.layer.Tile || layer instanceof ol.layer.Image);
}

module.exports = ScreenshotControl;
