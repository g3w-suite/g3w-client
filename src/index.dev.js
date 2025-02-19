/**
 * @file Development entry point (app.min.js)
 * @since v3.8
 */
import localforage from 'localforage';
import { waitFor } from 'utils/waitFor';
import { VM }      from 'g3w-eventbus';
import shpwrite    from '@mapbox/shp-write';

// expose global variables
import 'g3w-globals';

// apply dev config overrides (config.js)
(require('../config').devConfig || (() => { })).call();

// print some debug info
window.g3wsdk.info();

// custom header links
g3wsdk.core.ApplicationService.once('initconfig', () => {
  initConfig.header_custom_links = [
    // modal button (icon + i18n)
    {
      "i18n":   true,
      "icon":   "fas fa-plus",
      "title":  "mapcontrols.add_layer_control.header",
      "type":   "modal",
      "target": "#modal-addlayer",
    },
    // modal button (icon + i18n)
    {
      "i18n":   true,
      "icon":   "fas fa-window-maximize",
      "title":  "changemap",
      "type":   "modal",
      "target": "#modal-changemap",
    },
    // external link (with visible text)
    {
      "i18n":   false,
      "text":   "<i class='fas fa-bug'></i> <span hidden>Create a new issue</span>",
      "title":  "Report a bug",
      "url":    "https://github.com/g3w-suite",
      "target": "_blank",
    },
    // custom content (image + modal)
    {
      "i18n":    false,
      "title":   'Forecast',
      "img":     'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📈</text></svg>',
      "content": '<iframe src="https://www.3bmeteo.com/moduli_esterni/italia_7_giorni/ffffff/fc9b2a/5e5e5e/ffffff/it" style="width: 100%;min-height: 655px;border: none;"></iframe>',
      "type":    'modal'
    }
  ];
});

// dev layers (from local storage)
g3wsdk.core.ApplicationService.once('initconfig', () => {

  const pid = initConfig.projects.find(p => initConfig.initproject === p.gid).id;

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

  // piazza-leopoldo.kml
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

// dev layers (modal-addlayer)
g3wsdk.gui.GUI.once('ready', async () => {

  await waitFor(() => GUI.getService('map'), 1000);
  await GUI.getService('map').isReady();

  // $('#modal-addlayer').modal('show');

  const map = GUI.getService('map');
  const q = document.querySelector.bind(document);

  // set modal options
  const setOption = async (el, value) => {
    el = '#modal-addlayer ' + el;
    await waitFor(() => q(el), 1000);
    q(el).value = value;
    q(el).dispatchEvent(new Event('input'));
    q(el).dispatchEvent(new Event('change'));
  }

  // add file layer
  const setFile = async (file, epsg) => {
    await waitFor(() => !q('#add-layer-type').value, 5000);
    if (map.getLayerByName(file.name)) {
      return console.assert(!map.getLayerByName(file.name), `Unable to add layer: ${file.name}`);
    }
    setTimeout(() => console.assert(map.getLayerByName(file.name), `Unable to add layer: ${file.name}`), 2500);
    await setOption('#add-layer-type', 'file');
    await setOption('#projection-layer', epsg);
    await waitFor(() => q('#addcustomlayer input[type="file"]'), 1000);
    const data = new DataTransfer();
    data.items.add(file);
    q('#addcustomlayer input[type="file"]').files = data.files;
    q('#addcustomlayer input[type="file"]').dispatchEvent(new Event('change'));
    await waitFor(() => q('.modal-footer .btn.btn-success') && !q('.modal-footer .btn.btn-success').disabled, 1000);
    q('.modal-footer .btn.btn-success').click();
    window.addEventListener("beforeunload", () => { map.getLayerByName(file.name) && map.removeExternalLayer(file.name); });
  }

  // add wms layer
  const setWms = async (wms) => {
    await waitFor(() => !q('#add-layer-type').value, 5000);
    await setOption('#add-layer-type', 'wms');
    await setOption('#add_wms_url', wms.url);
    await setOption('#add_wms_name', wms.id);
    await waitFor(() => q('.modal-content .btn.btn-success') && !q('.modal-content .btn.btn-success').disabled, 1000);
    q('.modal-content .btn.btn-success').click();
    await waitFor(() => q('#g3w-wms-layers'), 5000);
    $('#g3w-wms-layers').select2('open');
    $('#select2-g3w-wms-layers-results li:nth-child(1)').trigger('mouseup');
    await waitFor(() => q('.modal-footer .btn.btn-success') && !q('.modal-footer .btn.btn-success').disabled, 1000);
    await setOption('#position-layer', 'bottom');
    await setOption('#g3w-wms-visible', false);
    await setOption('#g3w-wms-opacity', 0.85);
    const wms_name = q('#g3w-wms-layer-name').value;
    await waitFor(() => q('.modal-footer .btn.btn-success') && !q('.modal-footer .btn.btn-success').disabled, 1000);
    q('.modal-footer .btn.btn-success').click();
    window.addEventListener("beforeunload", () => { map.getLayerByName(wms_name) && map.removeExternalLayer(wms_name); });
  };

  // export layer to zip
  const zipFile = async name => {
    await waitFor(async () => name in (await localforage.getItem('externalLayers')), 1000);
    const externalLayers = await localforage.getItem('externalLayers');
    const blob           = await shpwrite.zip(
      JSON.parse(externalLayers[name].features),
      {
        outputType:    "blob",
        folder:         name,
        prj:            externalLayers[name].options.crs,
        types: {
          point:        name,
          mulipoint:    name,
          polygon:      name,
          multipolygon: name,
          line:         name,
          polyline:     name,
          multiline:    name,
        },
      }
    );
    return new File([blob], name.replace('.kml', '.zip'), { type: 'application/zip' });
  };

  // points-xy.csv
  await setFile(
    new File([`Name,X,Y,
A,11.2470052,43.7914696
B,11.2472371,43.7912777
C,11.2474811,43.7910709`],
    'points-xy.csv',
    { type: 'text/plain' }),
    'EPSG:4326'
  );

  // points-wkt.csv
  await setFile(
    new File([`Name,WKT,
A,"POINT (11.2470052 43.7914696)"
B,"POINT (11.2472371 43.7912777)"
C,"POINT (11.2474811 43.7910709)"`],
    'points-wkt.csv',
    { type: 'text/plain' }),
    'EPSG:4326'
  );

  // piazza-leopoldo.zip
  await setFile(
    await zipFile('piazza-leopoldo.kml'),
    'EPSG:3857'
  );

  // ORTOFOTO
  await setWms({
    id: 'ORTOFOTO',
    url: 'https://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap/wms?map=wmsofc&map_resolution=91&language=ita&'
  });

});

/**
 * Custom editing control: "Edit in iframe"
 * 
 * @see https://github.com/g3w-suite/g3w-client/pull/736
 */
g3wsdk.core.plugin.PluginsRegistry.onafter('registerPlugin', plugin => {
  if (!plugin && 'editing' !== plugin.name) {
    return;
  }
  VM.$watch(
    () => g3wsdk.core.ApplicationState.sidebar.contentsdata,
    (data = []) => data
      .filter(d => 'editing-panel' === d.content.id)
      .forEach(d => {
        const tolboxes = d.content.internalPanel.$el.querySelector('#toolboxes');
        let iframe_btn = document.querySelector('#edit_in_iframe');
        if (!tolboxes || iframe_btn) {
          return;
        }
        tolboxes.insertAdjacentHTML('afterend', `<p><a href="#" id="edit_in_iframe">&#x270f; Edit in iframe</a></p>`);
        iframe_btn = document.querySelector('#edit_in_iframe');
        iframe_btn.addEventListener('click', () => {
          const w = window.open('about:blank', '_blank', `fullscreen=yes`);
          w.document.write(`<!doctype HTML><html><head><title>Test Iframe</title><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;display:block;}</style></head><body><iframe src="${location.href}"></iframe></body></html>`);
          //Listen message from application
          w.addEventListener('message', e => {
            if ('app:ready' === e.data.action) {
              // send message to iframe every time iframe send a message con contentWindow
              w.document.querySelector('iframe').contentWindow.postMessage({
                id:      null,
                action: 'editing:add',
                data: {
                  // only visible toolboxes
                  qgs_layer_id: Array.from(editing_tolboxes.children).filter(item => item.classList.contains('toolbox') && 'none' !== item.style.display).map(item => item.id.split('id_toolbox_')[1]),
                  properties: { },
                }
              }, '*');
            }
          }, false);
          // prevent page refresh (eg. CTRL+R)
          w.onbeforeunload = () => w.close();
        });
      })
  );
});

/**
 * Custom map control: "Open in iframe"
 */
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
        customClass: 'fa fa-window-restore',
        onclick() {
          const w = window.open('about:blank', '_blank', `fullscreen=yes`);
          w.document.write(`<!doctype HTML><html><head><title>Test Iframe</title><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;display:block;}</style></head><body><iframe src="${location.href}"></iframe></body></html>`);
          // send message to iframe every time ifrema send a message con contentWindow
          w.addEventListener('message', e => {
            //Emit iframe:message to handle the message in config.js file
            setTimeout(() => g3wsdk.gui.GUI.emit('iframe:message', w.document.querySelector('iframe').contentWindow, e), 2000)
          }, false);
          // prevent page refresh (eg. CTRL+R)
          w.onbeforeunload = () => w.close();
        }
      },
    });
  });
});

// run app (index.prod.js)
require('./index.prod');

window.GUI         = g3wsdk.gui.GUI;
window.localforage = localforage;