/**
 * @file
 * @since v3.8
 */
import { SPATIALMETHODS, VM } from 'g3w-ol/constants';
import GUI from 'services/gui';

const { merge }                  = require('core/utils/ol');
const InteractionControl         = require('g3w-ol/controls/interactioncontrol');

// TODO: make it easier to understand.. (what variables are declared? which ones are aliased?)
const {
  Geometry : {
    getAllPolygonGeometryTypes,
    isPolygonGeometryType
  }
} = require('core/utils/geo');

const VALIDGEOMETRIES = getAllPolygonGeometryTypes();

const BaseQueryPolygonControl = function(options = {}) {

  const {
    spatialMethod=SPATIALMETHODS[0],
    name,
    tipLabel,
    label,
    onSelectlayer,
    enabled=true,
    interactionClass
  } = options;
  this.layers = options.layers || [];

  /**
   * @type {unknown[]}
   *
   * @since 3.8.0
   */
  this.externalLayers = [];

  this.unwatches = [];

  this.listenLayersVisibilityChange();

  options.visible = this.checkVisibile(this.layers);

  /**
   * Store current selected layer
   *
   * @since 3.8.0
   */
  this.selectedLayer = null;

  const _options = {
    offline: false,
    name,
    tipLabel,
    label,
    // update selected layer
    onSelectlayer,
    clickmap: true, // set ClickMap
    interactionClass,
    spatialMethod,
    toggledTool:{
      type: 'spatialMethod',
      how: 'toggled' // or hover
    },
    onhover: true
  };
  options = merge(options,_options);
  options.geometryTypes = VALIDGEOMETRIES;
  InteractionControl.call(this, options);
  //starting disabled
  this.setEnable(enabled);

  this._handleExternalLayers();
};

ol.inherits(BaseQueryPolygonControl, InteractionControl);

const proto = BaseQueryPolygonControl.prototype;

/**
 * @param { unknown | null } layer
 *
 * @since 3.8.0
 */

proto.setSelectedLayer = function(layer) {
  this.selectedLayer = layer;
};

proto.change = function(layers=[]){
  this.layers = layers;
  const visible = this.checkVisibile(layers);
  this.setVisible(visible);
  this.setEnable(false);
  this.listenLayersVisibilityChange();
};

/**
 * @since v3.8
 * @param layers
 * @returns {boolean}
 *
 * @override to subclass
 */
proto.checkVisibile = function(layers) {
  return false
};

/**
 * Handle temporary layers added by `addlayers` map control (Polygon or Multipolygon)
 *
 * @listens CatalogService~addExternalLayer
 * @listens CatalogService~removeExternalLayer
 *
 * @since 3.8.0
 */
proto._handleExternalLayers = function() {
  const CatalogService = GUI.getService('catalog');

  // store unwatches of extenal layers (selected or visible)
  const unWatches = {};

  CatalogService.onafter('addExternalLayer', ({layer, type}) => {

    if ('vector' === type) {

      // update `this.externalLayers`
      this.externalLayers.push(layer);

      // set list of un watches for layer based on name of layer (unique)
      unWatches[layer.name] = [];

      //call handle add ExternalLayer
      'function' === typeof this.handleAddExternalLayer && this.handleAddExternalLayer(layer, unWatches);
    }

  });

  CatalogService.onafter('removeExternalLayer', ({name, type}) => {
    if ('vector' !== type) {
      return;
    }
    this.externalLayers = this.externalLayers.filter(layer => {
      if (name !== layer.name) {
        'function' === typeof this.handleRemoveExternalLayer && this.handleRemoveExternalLayer(layer);
        return true;
      }
      if (layer === this.selectedLayer) {
        this.setSelectedLayer(null);
      }
      return false;
    });
    unWatches[name].forEach(unWatch => unWatch());
    delete unWatches[name];
  });

};

/**
 * @since v3.8
 */
proto.listenLayersVisibilityChange = function(){
  /**
   * @override by subclass
   */
};

/**
 * @since v3.8
 */
proto.watchLayer = function(expOrFn, callback){
  return VM.$watch(expOrFn, callback)
};

/**
 * @since v3.8
 */
proto.isSelectedLayerVisible = function(){
  return (
    'function' === typeof this.selectedLayer.isVisible
      ? this.selectedLayer.isVisible()                 // in case of a project project
      : this.selectedLayer.visible                     // in case of external layer
  )
};

module.exports = BaseQueryPolygonControl;
