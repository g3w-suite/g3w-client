/**
 * @file Development entry point (app.min.js)
 * @since v3.8
 */
import localforage from 'localforage';

// include backward compatibilies
import './deprecated';

// expose global variables
import './globals';

// apply dev config overrides (config.js)
(require('../config').devConfig || (() => { })).call();

// print some debug info
window.g3wsdk.info();

// dev layers
g3wsdk.core.ApplicationService.once('initconfig', () => {

  const pid = initConfig.id;

  // DBTM Multiscala
  const url  = "http://www502.regione.toscana.it/geoscopio_qg/cgi-bin/qgis_mapserv?map=dbtm_rt.qgs&"
  const wms = JSON.parse(localStorage.getItem('externalwms') || '{}');
  wms[pid]  = wms[pid] || { urls: [], wms: {} };
  wms[pid]  = {
    urls: wms[pid].urls.length ? wms[pid].urls : [{ url, id: "DBTM" }],
    wms: Object.keys(wms[pid].wms).length ? wms[pid].wms : { [url]: [{
      url,
      "name":     "DBTM",
      "layers":   [ "DBTM_DataBaseTopograficoMultiscala" ],
      "epsg":     "EPSG:25832",
      "position": "bottom",
      "visible":  false,
      "opacity":  1
    }]}
  };
  localStorage.setItem('externalwms', JSON.stringify(wms));

  // Piazza Leopoldo
  localforage.getItem('externalLayers').then(externalLayers => {
    externalLayers  = externalLayers || {};
    externalLayers["piazza-leopoldo.kml"] = externalLayers["piazza-leopoldo.kml"] || {
      "features": "{\"type\":\"FeatureCollection\",\"features\":[{\"type\":\"Feature\",\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[[[1252005.710667936,5433256.404732778,0],[1251977.6609369165,5433254.067255179,0],[1251945.5206201253,5433223.680046592,0],[1251947.8580977095,5433192.124099195,0],[1251992.2701718165,5433153.555719045,0],[1252019.7355334398,5433136.609006568,0],[1252068.822562715,5433129.596573813,0],[1252109.14405105,5433141.86833112,0],[1252124.9220247425,5433158.815043615,0],[1252123.1689165544,5433194.461576776,0],[1252103.8847264862,5433224.8487853855,0],[1252054.213327815,5433247.639191819,0],[1252005.710667936,5433256.404732778,0]]]},\"properties\":{\"name\":\"Piazza Leopoldo\"},\"id\":0}]}",
      "options": {
          "crs":      "EPSG:3857",
          "type":     "kml",
          "position": "top",
          "color":    { "rgba": { "r": 255, "g": 0, "b": 0, "a": 1 } },
          "field":    "name",
          "opacity":  1,
          "visible":  true
      }
    };
    localforage.setItem('externalLayers', externalLayers);
  });
});

// run app (index.prod.js)
require('./index.prod');

// custom map control: "Open in iframe"
g3wsdk.gui.GUI.once('ready', () => {
  g3wsdk.gui.GUI.getService('map').once('ready', function() {
    this.createMapControl('onclick',
    {
      id:            "OPENIFRAME",
      options: {
        add:         true,
        clickmap:    false,
        name:        'OPENIFRAME',
        tipLabel:    'Open in iframe',
        customClass: g3wsdk.gui.GUI.getFontClass('plugin'),
        onclick() {
          const w = window.open('about:blank', '_blank', `fullscreen=yes`);
          w.document.write(`<!doctype HTML><html><head><title>Test Iframe</title><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;display:block;}</style></head><body><iframe src="${location.href}"></iframe></body></html>`);
          // send message to iframe when app is ready
          w.addEventListener('message', e => {
            if (e.data.action === 'app:ready') {
              setTimeout(() => g3wsdk.gui.GUI.emit('iframe:message', w.document.querySelector('iframe').contentWindow, e), 2000)
            }
          }, false);
          // prevent page refresh (eg. CTRL+R)
          w.onbeforeunload = () => w.close();
        }
      },
    });
  });
});

window.GUI         = g3wsdk.gui.GUI,
window.localforage = localforage;