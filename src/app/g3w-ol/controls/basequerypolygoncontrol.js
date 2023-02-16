/**
 * @file
 * @since v3.8
 */
import { SPATIALMETHODS, VM } from 'g3w-ol/constants';

const InteractionControl = require('g3w-ol/controls/interactioncontrol');
const { Geometry: { getAllPolygonGeometryTypes } } = require('core/utils/geo');

const VALIDGEOMETRIES = getAllPolygonGeometryTypes();

const BaseQueryPolygonControl = function(options = {}) {

  /**
 * @FIXME add description
 */
  this.layers = options.layers || [];

  /**
   * @FIXME add description
   */
  this.unwatches = [];

  options.visible = this.checkVisible(this.layers);

  options.offline = false;

  options.spatialMethod = options.spatialMethod || SPATIALMETHODS[0];

  options.clickmap = true;

  options.onhover = true;

  options.toggledTool = {
    type: 'spatialMethod',
    how: 'toggled' // or hover
  };

  options.geometryTypes = VALIDGEOMETRIES;

  this.listenLayersChange();

  InteractionControl.call(this, options);
};

ol.inherits(BaseQueryPolygonControl, InteractionControl);

const proto = BaseQueryPolygonControl.prototype;

/**
 * @FIXME add description
 */
proto.listenLayersChange = function() {

  this.unwatches.forEach(unwatch => unwatch());

  this.unwatches.splice(0);

  this.layers
    .filter(layer => VALIDGEOMETRIES.indexOf(-1 !== layer.getGeometryType()))
    .forEach(layer => {
      this.unwatches
        .push(
          VM.$watch(
            () =>  layer.state.visible,
            visible => { this.setEnable(/* need to be visible or selected */ visible && layer.state.selected); }
          )
        );
      }
    );

};

/**
 * @FIXME add description
 */
proto.change = function(layers=[]) {
  this.layers = layers;
  this.setVisible(this.checkVisibile(layers));
  this.setEnable(false);
  this.listenLayersChange();
};

/**
 * @FIXME add description
 */
proto.checkVisible = function(layers) {

  // if no layer or just one
  if (!layers.length || 1 === layers.length) {
    return false;
  }

  const filterable = layers.filter(layer => layer.isFilterable());                                      // get all layers that haven't the geometries above filterable
  const querable   = layers.filter(layer => -1 !== VALIDGEOMETRIES.indexOf(layer.getGeometryType()));   // get all layer that have the valid geometries
  return (1 === querable.length && 1 === filterable.length) ? (querable[0] !== filterable[0]) : (querable.length > 0 && filterable.length > 0);

};

module.exports = BaseQueryPolygonControl;
