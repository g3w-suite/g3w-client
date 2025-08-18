/**
 * @file ORIGINAL SOURCE: src/services/map.js@v3.11.10
 * @since 4.0.0
 */

import GUI from 'g3w-app';

GUI.setupControl.zoombox = function() {
  if (isMobile.any){
    return;
  }
  GUI.createMapControl({
    id: 'zoombox',
    options: {
      tipLabel:         'Zoom to box',
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
  GUI.getMapControlByType('zoombox').on('zoomend', e => GUI.viewer.fit(e.extent) );
};