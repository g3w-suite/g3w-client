/**
 * @since v3.8
 */
import { SPATIALMETHODS, VM } from 'g3w-ol/constants';

const InteractionControl = require('g3w-ol/controls/interactioncontrol');
const { Geometry: {getAllPolygonGeometryTypes} } = require('core/utils/geo');

const VALIDGEOMETRIES = getAllPolygonGeometryTypes();

const BaseQueryPolygonControl = function(options = {}){
  this.layers = options.layers || [];
  const visible = this.checkVisible(this.layers);

  /**
   * set specific control options
   *
   */
  options.visible = visible;
  options.offline = false;
  options.spatialMethod = options.spatialMethod || SPATIALMETHODS[0];
  options.clickmap = true;
  options.onhover = true;
  options.toggledTool = {
    type: 'spatialMethod',
      how: 'toggled' // or hover
  };
  options.geometryTypes = VALIDGEOMETRIES;
  /** end specific options **/

  this.unwatches = [];
  this.listenLayersChange();
  InteractionControl.call(this, options);
};

ol.inherits(BaseQueryPolygonControl, InteractionControl);

const proto = BaseQueryPolygonControl.prototype;

proto.listenLayersChange = function(){
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
  this.listenLayersChange();
};

proto.checkVisible = function(layers) {
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

module.exports = BaseQueryPolygonControl;
