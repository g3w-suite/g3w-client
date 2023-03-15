/**
 * @file
 * @since v3.8
 */
import { SPATIALMETHODS } from 'g3w-ol/constants';

const InteractionControl = require('g3w-ol/controls/interactioncontrol');
const { merge }          = require('core/utils/ol');
const { Geometry }       = require('core/utils/geo');

const VALIDGEOMETRIES    = Geometry.getAllPolygonGeometryTypes();

const BaseQueryPolygonControl = function(options = {}) {

  const {
    spatialMethod=SPATIALMETHODS[0],
    onSelectlayer,
    interactionClass
  } = options;

  const default_options = {
    offline: false,
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

  options = merge(options, default_options);

  options.geometryTypes = VALIDGEOMETRIES;

  InteractionControl.call(this, options);
};

ol.inherits(BaseQueryPolygonControl, InteractionControl);

module.exports = BaseQueryPolygonControl;