import { SPATIALMETHODS, VM } from 'g3w-ol/constants';
import GUI from 'services/gui';

const { merge } = require('core/utils/ol');
const InteractionControl = require('g3w-ol/controls/interactioncontrol');
const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');
const { Geometry : {
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
        this.selectedLayer = layer;
        this.setEnable(this.isThereVisibleLayerNotSelected());
      } else {
        this.selectedLayer = null;
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
 * @since v3.8 renamed from listenPolygonLayersChange to listenLayersVisibilityChange
 */
proto.listenLayersVisibilityChange = function(){
  this.unwatches.forEach(unwatch => unwatch());
  this.unwatches.splice(0);
  this.layers.forEach(layer => {
    const {state} = layer;
    this.unwatches.push(
      VM.$watch(() =>  state.visible, visible => {
       // check if a selectedLayer i set
        if (null !== this.selectedLayer) {
          // enable control only if current changed visible layer is true or
          // if at least one layer (not selected) is visible
          this.setEnable(this.isThereVisibleLayerNotSelected());
        } else this.setEnable(false);
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
  // store unwatch extenal layer selected or visible
  const unWatches = {};
  // liste addExternalLayer setter event
  CatalogService.onafter('addExternalLayer', ({layer, type}) => {
    if ('vector' === type) {
      //add to externalLayers
      this.externalLayers.push(layer);
      // set list of un watches for layer based on name of layer (unique)
      unWatches[layer.name] = [];
      // check if has a Polygon geometry to check selected property to enable/disable map control
      if (isPolygonGeometryType(layer.geometryType)) {
        // set selectedLayer
        const unWatchSelected = VM.$watch(
          () => layer.selected,
          selected => {
            if (true === selected) {
              this.selectedLayer = layer;
            } else {
              this.selectedLayer = null;
            }
            this.setEnable(this.isThereVisibleLayerNotSelected());  /* need to be visible and selected */
          });
        // add unwatch selected event function
        unWatches[layer.name].push(unWatchSelected);
      }
      // check visible property and get unwatch
      const unWatchVisible = VM.$watch(
        () => layer.visible,
        (visible) => {
          // in case of selected layer on TOC
          this.setEnable(this.isThereVisibleLayerNotSelected())
        });
      unWatches[layer.name].push(unWatchVisible);
    }
    this.setEnable(this.isThereVisibleLayerNotSelected());
  });

  // listen removeExternalLayer setter event
  CatalogService.onafter('removeExternalLayer', ({name, type}) => {
    if ('vector' === type) {
      this.externalLayers = this.externalLayers.filter(layer => {
        if (name !== layer.name)
          return true;
        else {
          if (layer === this.selectedLayer) {
            this.selectedLayer = null;
          }
          return false;
        }
      });
      unWatches[name].forEach(unWatch => unWatch());
      delete unWatches[name];
      this.setEnable(this.isThereVisibleLayerNotSelected());
    }
  });
};

/**
 * @since v3.8 Is at least layer visible not selected
 */
proto.isThereVisibleLayerNotSelected = function(){
  return !!(
    // selected layer need to be set
    this.selectedLayer &&
    // check is selected layer is visible
    // call isVisible in case of project layer or visible property in case of external layer
    ('function' === typeof this.selectedLayer.isVisible ? this.selectedLayer.isVisible() : this.selectedLayer.visible) &&
    (// check in project layers if at least is visible
      this.layers
        .find(layer => layer !== this.selectedLayer && layer.isVisible()) ||
      // check in external layers if layer at least is visible
      this.externalLayers
        .find(externalLayer => externalLayer !== this.selectedLayer && true === externalLayer.visible)
      )
  )
};

module.exports = QueryByPolygonControl;
