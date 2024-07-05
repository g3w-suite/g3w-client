/**
 * @file
 * @since v3.8
 */
import { SPATIAL_METHODS }            from 'app/constant';
import { getAllPolygonGeometryTypes } from 'utils/getAllPolygonGeometryTypes';

const InteractionControl              = require('g3w-ol/controls/interactioncontrol');

module.exports = class BaseQueryPolygonControl extends InteractionControl {
  constructor(options = {}) {
    super({
      ...options,
      offline:          false,
      onSelectlayer:    options.onSelectlayer,
      clickmap:         true,
      interactionClass: options.interactionClass,
      spatialMethod:    undefined !== options.spatialMethod ? options.spatialMethod : SPATIAL_METHODS[0],
      toggledTool:      { type: 'spatialMethod', how: 'toggled' /* or hover */ },
      onhover:          true,
      geometryTypes:    getAllPolygonGeometryTypes()
    });
  }
}