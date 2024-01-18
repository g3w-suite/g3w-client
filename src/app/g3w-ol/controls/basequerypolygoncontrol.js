/**
 * @file
 * @since v3.8
 */
import { SPATIAL_METHODS } from 'app/constant';
import { mergeOptions }    from 'utils/mergeOptions';

const InteractionControl = require('g3w-ol/controls/interactioncontrol');
const { Geometry }       = require('utils/geo');

const VALIDGEOMETRIES    = Geometry.getAllPolygonGeometryTypes();

const BaseQueryPolygonControl = function(options = {}) {

  const {
    spatialMethod=SPATIAL_METHODS[0],
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

  options = mergeOptions(options, default_options);

  options.geometryTypes = VALIDGEOMETRIES;

  InteractionControl.call(this, options);
};

ol.inherits(BaseQueryPolygonControl, InteractionControl);

module.exports = BaseQueryPolygonControl;