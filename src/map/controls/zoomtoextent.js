/**
 * @file ORIGINAL SOURCE: src/services/map.js@v3.11.10
 * @since 4.0.0
 */
import { gettext as _ } from 'g3w-i18n';
import GUI              from 'services/gui';

GUI.once('ready', async () => {
  const map = GUI.getService('map');
  map.setupControl.zoomtoextent = function() {
    map.createMapControl({
      id: 'zoomtoextent',
      options: {
        ol: new ol.control.ZoomToExtent({ extent: map.project.state.extent, tipLabel: _('Fit map extent') })
      }
    });
  };
});