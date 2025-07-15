/**
 * @file ORIGINAL SOURCE: src/map/controls/scalecontrol.js@v3.11.10
 * @since 4.0.0
 */

import GUI             from 'services/gui';
import { getProject }  from 'utils/getProject';
import { RasterLayer } from 'map/layers/layer';

// wait for map ready
GUI.once('ready', async () => {
  const map = GUI.getService('map');
  map.setupControl.overview = async function() {
    if (isMobile.any || !window.initConfig.overviewproject) {
      return;
    }

    try {

      const project = await getProject(window.initConfig.overviewproject);

      map.createMapControl({
        id: 'overview',
        add: false,
        options: {
          ol: new ol.control.OverviewMap({
            view:          new ol.View(map._calculateViewOptions({ project, width: 200, height: 150 })), // hardcoded
            collapsed:     false,
            className:     'ol-overviewmap ol-custom-overviewmap',
            collapseLabel: $(`<span class="${GUI.getFontClass('arrow-left')}"></span>`)[0],
            label:         $(`<span class="${GUI.getFontClass('arrow-right')}"></span>`)[0],
            layers:        Object
              .entries(
                // group layer by multilayerId
                project.getLayersStore().getLayers({ GEOLAYER: true, BASELAYER: false })
                  .reduce((group, l) => {
                    const id = l.getMultiLayerId();
                    group[id] = group[id] || [];
                    group[id].push(l);
                    return group;
                  }, {}) || []
              ).map(([id, layers]) => {
                const mapLayer = new RasterLayer({
                  url:   project.state.WMSUrl,
                  id:    `overview_layer_${id}`,
                  tiled: layers[0].state.tiled,
                });
                layers.reverse().forEach(l => mapLayer.addLayer(l));
                return mapLayer.getOLLayer(true);
              }).reverse()
          }),
          position: 'bl',
        }
      })
      /** @since 3.10.0 Move another bottom left map controls bottom to a left of overview control**/
      document.querySelector('.g3w-map-controls-left-bottom').style.left = '230px';
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if ("class" === mutation.attributeName) {
            document.querySelector('.g3w-map-controls-left-bottom').style.left = mutation.target.classList.contains('ol-collapsed') ? '50px' : '230px';
          }
        });
      });
      observer.observe(document.querySelector('.ol-custom-overviewmap'), { attributes: true });
    } catch (err) {
      console.warn(err)
    }
  }
});