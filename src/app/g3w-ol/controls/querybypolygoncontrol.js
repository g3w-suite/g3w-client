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
  this.listenPolygonLayersChange();
  options.visible = this.checkVisibile(this.layers);
  const _options = {
    offline: false,
    name: "querybypolygon",
    tipLabel: "sdk.mapcontrols.querybypolygon.tooltip",
    label: options.label || "\ue903",
    // function to get selection layer
    onSelectlayer(selectedLayer){
      const selected = selectedLayer.isSelected();
      const geometryType = selectedLayer.getGeometryType();
      const querable = selectedLayer.isQueryable();
      if (selected){
        if (this.getGeometryTypes().indexOf(geometryType) !== -1) {
          this.setEnable(querable ? selectedLayer.isVisible(): querable);
        } else this.setEnable(false, false);
      } else this.setEnable(false, false);
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

proto.listenPolygonLayersChange = function(){
  this.unwatches.forEach(unwatch => unwatch());
  this.unwatches.splice(0);
  const polygonLayers = this.layers.filter(layer => VALIDGEOMETRIES.indexOf(layer.getGeometryType()) !== -1);
  polygonLayers.forEach(layer => {
    const {state} = layer;
    this.unwatches.push(VM.$watch(() =>  state.visible, visible => {
      // need to be visible or selected
      this.setEnable(visible && state.selected);
    }));
  });
};

proto.change = function(layers=[]){
  this.layers = layers;
  const visible = this.checkVisibile(layers);
  this.setVisible(visible);
  this.setEnable(false);
  this.listenPolygonLayersChange();
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
  CatalogService.onafter('addExternalLayer', ({layer, type}) => {
    if ('vector' === type && isPolygonGeometryType(layer.geometryType)) {
      this.externalLayers.push(layer);
      this.unwatches.push(
        VM.$watch(
          () => layer.selected,
          selected => { this.setEnable(selected); /* need to be visible or selected */ })
      );
    }
  });
  CatalogService.onafter('removeExternalLayer', ({name, type}) => {
    if ('vector' === type) {
      this.externalLayers = this.externalLayers.filter(layer => name !== layer.name);
    }
  });
};

module.exports = QueryByPolygonControl;
