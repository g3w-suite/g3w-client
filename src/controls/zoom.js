/**
 * @file ORIGINAL SOURCE: src/map/controls/zoom.js@v4.0.0
 * @since 4.1.0
 */

import { gettext as _ } from 'g3w-i18n';
import GUI              from 'g3w-app';

// wait for map ready
export default {
  zoom() {
    GUI.createMapControl({
      id: 'zoom',
      options: {
        ol: new ol.control.Zoom({
          zoomInTipLabel: _('Zoom in'),
          zoomOutLabel: _('Zoom out'),
        }),
      }
    });
  }
};