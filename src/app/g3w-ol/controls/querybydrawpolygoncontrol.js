/**
 * @since v3.8
 */
import { SPATIALMETHODS, VM } from 'g3w-ol/constants';
import GUI from 'services/gui';
const { merge } = require('core/utils/ol');
const InteractionControl = require('g3w-ol/controls/interactioncontrol');
const { getAllPolygonGeometryTypes } = require('core/utils/geo').Geometry;

const VALIDGEOMETRIES = getAllPolygonGeometryTypes();

const QueryByDrawPolygonControl = function(options={}) {
  const {spatialMethod=SPATIALMETHODS[0]} = options;
  this.layers = options.layers || [];
  this.unwatches = [];
  this.listenPolygonLayersChange();
  options.visible = this.checkVisibile(this.layers);
  const _options = {
    offline: false,
    name: "querybydrawpolygon",
    tipLabel: "sdk.mapcontrols.querybydrawpolygon.tooltip",
    customClass: GUI.getFontClass('draw'),
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
    interactionClass: ol.interaction.Draw,
    interactionClassOptions: {
      type: 'Polygon'
    },
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
};

ol.inherits(QueryByDrawPolygonControl, InteractionControl);

const proto = QueryByDrawPolygonControl.prototype;

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
  this._interaction.on('drawend', evt => {
    this.dispatchEvent({
      type: 'drawend',
      feature: evt.feature
    });
    this._autountoggle && this.toggle();
  });
};

module.exports = QueryByDrawPolygonControl;
