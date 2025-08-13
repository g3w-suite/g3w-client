/**
 * @file ORIGINAL SOURCE: src/map/controls/scalecontrol.js@v3.11.10
 * @since 4.0.0
 */

import GUI from 'services/gui';

// wait for map ready
const map = GUI;

map.setupControl.scaleline = function() {
  map.createMapControl({
    id: 'scaleline',
    add: false,
    options: {
      ol: new ol.control.ScaleLine(),
      position: 'br',
    }
  });
};

