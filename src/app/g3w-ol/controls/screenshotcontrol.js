import GUI from 'services/gui';

const { sameOrigin } = require('utils');
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
module.exports = class ScreenshotControl extends OnClickControl {

  constructor(options = {}) {
    options.layers = undefined !== options.layers ? options.layers : []; 

    super({
      name: "maptoimage",
      tipLabel: "Screenshot",
      label: "\ue90f",
      toggled: false,
      visible: true, // set initial to true
      layers: [],
      ...options
    });

    this.layers= options.layers;

    //set visibility based on layers
    this.setVisible(this.checkVisible(this.layers));

    //only if is visible (no CORS issue) need to listen add/remove layer
    if (this.isVisible()) {
      //listen add/remove External Layer event to check visibility of the control
      GUI.getService('map').onafter('loadExternalLayer', this._addLayer.bind(this));
      GUI.getService('map').onafter('unloadExternalLayer', this._removeLayer.bind(this));
    }
  }

  /**
   * Called when a new layer is added to Project (eg. wms or vector layer)
   * 
   * @since 3.8.3
   *
   */
  _addLayer(layer) {
    this.layers.push(layer);
    this.change(this.layers);
    layer.on('change:visible', () => this.change(this.layers));
  }

  /**
   * Called when a layer is removed from Project
   * 
   * @since 3.8.3 
   */
  _removeLayer(layer) {
    this.layers = this.layers.filter(l => l !== layer);
    this.change(this.layers);
  }

  /**
   * Called when a layer is added or removed
   * 
   * @param layers
   */
  change(layers = []) {
    this.setVisible(this.checkVisible(layers));
  }

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
  checkVisible(layers = []) {
    //need to be visible. If it was not visible an CORS issue was raise.
    // Need to reload and remove layer
    return this.isVisible() && !layers.some(isCrossOrigin);
  }

}

/**
 * Check if a layer has a Cross Origin source URI
 * 
 * @param layer
 * 
 * @returns {boolean} `true` whether the given layer could cause CORS issues (eg. while printing raster layers). 
 */
function isCrossOrigin(layer) {
  let source_url;

  // skip levels that can't cause CORS issues
  if (isHiddenLayer(layer) || isVectorLayer(layer)) {
    return false;
  }
  
  // check raster layers (OpenLayers)
  if (isImageLayer(layer)) { 
    source_url = layer.getSource().getUrl();
    return source_url && !sameOrigin(source_url, location);
  }

  // check if layer has external property to true (Ex. core/layers/imagelayer.js instance)
  if (isExternalImageLayer(layer)) { 
    source_url = layer.getConfig().source.url;
    return source_url && !sameOrigin(source_url, location);
  }

  return false;
}

function isHiddenLayer(layer) {
  return layer.getVisible && !layer.getVisible();
}

function isVectorLayer(layer) {
  return layer instanceof ol.layer.Vector;
}

function isImageLayer(layer) {
  return (layer instanceof ol.layer.Tile || layer instanceof ol.layer.Image);
}

/**
 * @see https://github.com/g3w-suite/g3w-client/issues/475
 */
function isExternalImageLayer(layer) {
  return layer.getConfig().source && layer.getConfig().source.external;
}