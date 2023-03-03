import { SPATIALMETHODS, VM } from 'g3w-ol/constants';
import GUI from 'services/gui';

const { merge }                  = require('core/utils/ol');
const InteractionControl         = require('g3w-ol/controls/interactioncontrol');
const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');

// TODO: make it easier to understand.. (what variables are declared? which ones are aliased?)
const {
  Geometry : {
    getAllPolygonGeometryTypes,
    isPolygonGeometryType
  }
} = require('core/utils/geo');

const VALIDGEOMETRIES = getAllPolygonGeometryTypes();

const QueryByPolygonControl = function(options={}) {
  const {spatialMethod=SPATIALMETHODS[0]} = options;
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
    name: "querybypolygon",
    tipLabel: "sdk.mapcontrols.querybypolygon.tooltip",
    label: options.label || "\ue903",
    // update selected layer
    onSelectlayer(layer) {
      if (
        layer.isSelected() &&
        layer.isQueryable() &&
        -1 !== this.getGeometryTypes().indexOf(layer.getGeometryType())
      ) {
        this.setSelectedLayer(layer);
        this.setEnable(this.isThereVisibleLayerNotSelected());
      } else {
        this.setSelectedLayer(null);
        this.setEnable(false, false);
      }
    },
    clickmap: true, // set ClickMap
    interactionClass: PickCoordinatesInteraction,
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
  this.setEnable(false);

  this._handleExternalLayers();
};

ol.inherits(QueryByPolygonControl, InteractionControl);

const proto = QueryByPolygonControl.prototype;

/**
 * @since 3.8.0 
 */
proto.listenLayersVisibilityChange = function() {
  this.unwatches.forEach(unwatch => unwatch());
  this.unwatches.splice(0);
  this.layers.forEach(layer => {
    this.unwatches.push(
      VM.$watch(() =>  layer.state.visible, visible => {
       // check if a selectedLayer i set
        if (null !== this.selectedLayer) {
          // enable control only if current changed visible layer is true or
          // if at least one layer (not selected) is visible
          this.setEnable(this.isThereVisibleLayerNotSelected());
        } else {
          this.setEnable(false);
        }
      }));
  });
};

proto.change = function(layers=[]){
  this.layers = layers;
  const visible = this.checkVisibile(layers);
  this.setVisible(visible);
  this.setEnable(false);
  this.listenLayersVisibilityChange();
};

proto.checkVisibile = function(layers) {
  let visible;
  // if no layer or just one
  if (!layers.length || layers.length === 1) visible = false;
  else {
    // geometries to check
    // get all layers that haven't the geometries above filterable
    const filterableLayers = layers.filter(layer => layer.isFilterable());
    // get all layer that have the valid geometries
    const querableLayers = layers.filter(layer => VALIDGEOMETRIES.indexOf(layer.getGeometryType()) !== -1);
    const filterableLength = filterableLayers.length;
    const querableLength = querableLayers.length;
    if (querableLength === 1 && filterableLength === 1){
      visible = filterableLayers[0] !== querableLayers[0];
    } else visible = querableLength > 0 && filterableLength > 0;
  }
  return visible;
};

proto.setMap = function(map) {
  InteractionControl.prototype.setMap.call(this, map);
  this._interaction.on('picked', evt => {
    this.dispatchEvent({
      type: 'picked',
      coordinates: evt.coordinate
    });
    this._autountoggle && this.toggle();
  });
  this.setEnable(false);
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

      // watch `layer.selected` property only on Polygon layers (in order to enable/disable map control)
      if (isPolygonGeometryType(layer.geometryType)) {
        unWatches[layer.name].push(
          VM.$watch(
          () => layer.selected,                                    // watch `layer.selected` property
          selected => {
            this.setSelectedLayer(true === selected ? layer : null);
            this.setEnable(this.isThereVisibleLayerNotSelected()); // layer must be visible and selected.
          })
        );
      }

      unWatches[layer.name].push(
        VM.$watch(
        () => layer.visible,                                       // watch `layer.visible` property
        (visible) => {
          this.setEnable(this.isThereVisibleLayerNotSelected());   // layer must be selected in TOC.
        })
      );

    }

    this.setEnable(this.isThereVisibleLayerNotSelected());

  });

  CatalogService.onafter('removeExternalLayer', ({name, type}) => {
    if ('vector' !== type) {
      return;
    }
    this.externalLayers = this.externalLayers.filter(layer => {
      if (name !== layer.name) {
        return true;
      }
      if (layer === this.selectedLayer) {
        this.setSelectedLayer(null);
      }
      return false;
    });
    unWatches[name].forEach(unWatch => unWatch());
    delete unWatches[name];
    this.setEnable(this.isThereVisibleLayerNotSelected());
  });

};

/**
 * @returns {boolean} wether at least a visible layer not selected
 * 
 * @since 3.8.0
 */
proto.isThereVisibleLayerNotSelected = function(){
  return !!(
    // check if user has selected a layer
    this.selectedLayer &&
    // check if current selected layer is visible
    (
      'function' === typeof this.selectedLayer.isVisible
        ? this.selectedLayer.isVisible()                 // in case of a project project
        : this.selectedLayer.visible                     // in case of external layer
    ) &&
    // check if at least one layer is visible (project or external layer)
    (
      this.layers.find(layer => layer !== this.selectedLayer && layer.isVisible()) ||
      this.externalLayers.find(layer => layer !== this.layer && true === layer.visible)
    )
  )
};

/**
 * @param { unknown | null } layer
 * 
 * @since 3.8.0
 */

proto.setSelectedLayer = function(layer) {
  this.selectedLayer = layer;
};

/**
 * @deprecated since v3.8.0. Will be removed in v4.0.0. Use `QueryByPolygonControl::listenLayersVisibilityChange()` instead.
 */
proto.listenPolygonLayersChange = function() {
  this.listenLayersVisibilityChange();
};

module.exports = QueryByPolygonControl;
