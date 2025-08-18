/**
 * @file ORIGINAL SOURCE: src/services/map.js@v3.11.10
 * @since 4.0.0
 */
import GUI from 'g3w-app';

GUI.setupControl.zoomtoextent = function() {
  GUI.createMapControl({
    id: 'zoomtoextent',
    options: {
      ol: new ol.control.ZoomToExtent({ extent: GUI.project.state.extent, tipLabel: 'Fit map extent' })
    }
  });
};