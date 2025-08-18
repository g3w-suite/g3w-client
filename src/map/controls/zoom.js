/**
 * @file ORIGINAL SOURCE: src/services/map.js@v3.11.10
 * @since 4.0.0
 */

import { gettext as _ } from 'g3w-i18n';
import GUI              from 'g3w-app';

// wait for map ready
GUI.setupControl.zoom = function() {
  GUI.createMapControl({
    id: 'zoom',
    options: {
      ol: new ol.control.Zoom({
        zoomInTipLabel: _('Zoom in'),
        zoomOutLabel: _('Zoom out'),
      }),
    }
  });
};