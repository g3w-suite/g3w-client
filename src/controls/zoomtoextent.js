/**
 * @file ORIGINAL SOURCE: src/map/controls/zoomtoextent.js@v4.0.0
 * @since 4.1.0
 */

import GUI from 'g3w-app';

export default {
  zoomtoextent() {
    GUI.createMapControl({
      id: 'zoomtoextent',
      options: {
        ol: new ol.control.ZoomToExtent({ extent: GUI.project.state.extent, tipLabel: 'Fit map extent' })
      }
    });
  }
};