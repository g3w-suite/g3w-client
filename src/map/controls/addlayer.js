/**
 * @file ORIGINAL SOURCE: src/services/map.js@v3.11.10
 * @since 4.0.0
 */

import GUI from 'g3w-app';

// wait for map ready
GUI.setupControl.addlayer = GUI.setupControl.addlayers = function () {
  Object
    .keys(window.initConfig.mapcontrols)
    .filter(type => ['addlayers', 'addlayer'].includes(type))
    .forEach(type => {
      if (!isMobile.any && !GUI.getMapControlByType('addlayer')) {
        GUI.createMapControl({
          id: 'addlayer',
          options: {
            tipLabel: 'Add Layer',
            onSetMap(e) {
              if ('after' === e.setter) {
                $(this.element).on('click', () => GUI.showAddLayerModal());
              }
            }
          },
        });
      }
    });
};