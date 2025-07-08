/**
 * @file ORIGINAL SOURCE: src/services/map.js@v3.11.10
 * @since 4.0.0
 */

import { t as _ } from 'g3w-i18n';
import GUI        from 'services/gui';

GUI.once('ready', async () => {
  const map = GUI.getService('map');
  map.setupControl.zoombox = function() {
    if (isMobile.any){
      return;
    }
    map.createMapControl({
      id: 'zoombox',
      options: {
        tipLabel:         _('Zoom to box'),
        interactionClass: ol.interaction.DragBox,
        cursorClass:      'ol-crosshair',
        onSetMap({ setter, map }) {
          if ('after' === setter) {
            // zoom box
            this._startCoordinate = null;
            this._interaction.on('boxstart', e => this._startCoordinate = e.coordinate);
            this._interaction.on('boxend',   e => {
              this.dispatchEvent({ type: 'zoomend', extent: ol.extent.boundingExtent([this._startCoordinate, e.coordinate]) });
              this._startCoordinate = null;
            });
          }
        },
      }
    });
    map.getMapControlByType('zoombox').on('zoomend', e => map.viewer.fit(e.extent) );
  };
});