/**
 * @file
 * @since v3.8
 */
import { SPATIALMETHODS, VM } from 'g3w-ol/constants';

const InteractionControl = require('g3w-ol/controls/interactioncontrol');
const { merge }          = require('core/utils/ol');
const { Geometry }       = require('core/utils/geo');

const VALIDGEOMETRIES    = Geometry.getAllPolygonGeometryTypes();

const BaseQueryPolygonControl = function(options = {
    spatialMethod=SPATIALMETHODS[0],
    name,
    tipLabel,
    label,
    onSelectlayer,
    enabled=true,
    interactionClass
  } = {}) {

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
 * @since v3.8.0
 * @param layers
 * @returns {boolean}
 *
 * @override to subclass
 */
proto.checkVisibile = function(layers) {
  return false
};

/**
 * @since v3.8.0
 */
proto.listenLayersVisibilityChange = function(){
  /**
   * @override by subclass
   */
};

/**
 * @since v3.8.0
 */
proto.watchLayer = function(expOrFn, callback){
  return VM.$watch(expOrFn, callback)
};

/**
 * @since v3.8.0
 */
proto.isSelectedLayerVisible = function(){
  return (
    'function' === typeof this.selectedLayer.isVisible
      ? this.selectedLayer.isVisible()                 // in case of a project project
      : this.selectedLayer.visible                     // in case of external layer
  )
};

module.exports = BaseQueryPolygonControl;
