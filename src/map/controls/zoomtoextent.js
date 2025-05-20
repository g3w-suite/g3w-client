/**
 * @file ORIGINAL SOURCE: src/services/map.js@v3.11.10
 * @since 4.0.0
 */

import GUI from 'services/gui';

GUI.once('ready', async () => {
  const map = GUI.getService('map');
  await (new Promise(res => map.once('setupcontrol:zoomtoextent', res)));
  map.createMapControl({
    id: 'zoomtoextent',
    options: {
      ol: new ol.control.ZoomToExtent({ extent: map.project.state.initextent })
    }
  });
});