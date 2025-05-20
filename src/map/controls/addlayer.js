/**
 * @file ORIGINAL SOURCE: src/services/map.js@v3.11.10
 * @since 4.0.0
 */

import GUI from 'services/gui';

// wait for map ready
GUI.once('ready', async () => {
  const map = GUI.getService('map');

  await Promise.any([
    new Promise(res => map.once('setupcontrol:addlayer', res)),
    new Promise(res => map.once('setupcontrol:addlayers', res))
  ]);

  Object
    .keys(window.initConfig.mapcontrols)
    .filter(type => ['addlayers', 'addlayer'].includes(type))
    .forEach(type => {
      if (!isMobile.any && !map.getMapControlByType('addlayer')) {
        map.createMapControl({
          id: 'addlayer',
          options: {
            tipLabel: "sdk.mapcontrols.addlayer.tooltip",
            onSetMap(e) {
              if ('after' === e.setter) {
                $(this.element).on('click', () => GUI.getService('map').showAddLayerModal());
              }
            }
          },
        });
      }
    })
});

