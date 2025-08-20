/**
 * @file ORIGINAL SOURCE: src/map/controls/scaleline.js@v4.0.0
 * @since 4.1.0
 */

import GUI from 'g3w-app';

export default {
  scaleline() {
    GUI.createMapControl({
      id: 'scaleline',
      add: false,
      options: {
        ol: new ol.control.ScaleLine(),
        position: 'br',
      }
    });
  }
};

