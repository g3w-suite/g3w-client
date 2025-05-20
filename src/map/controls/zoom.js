/**
 * @file ORIGINAL SOURCE: src/services/map.js@v3.11.10
 * @since 4.0.0
 */

import GUI from 'services/gui';

// wait for map ready
GUI.once('ready', async () => {
  const map = GUI.getService('map');
  await (new Promise(res => map.once('setupcontrol:zoom', res)));
  map.createMapControl({ id: 'zoom', options: { ol: new ol.control.Zoom() } });
});