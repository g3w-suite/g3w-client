/**
 * @file Development entry point (app.min.js)
 * @since v3.8
 */
import { idb }     from 'utils/idb';
import { waitFor } from 'utils/waitFor';
import shpwrite    from '@mapbox/shp-write';

// expose global variables
import 'g3w-globals';

import CONF from '../config.js';

// apply dev config overrides (config.js)
(CONF.devConfig || (() => { })).call();

// print some debug info
window.g3wsdk.info();

// add a custom PAGELENGTH (ref: Table.vue)
g3w.constants.PAGELENGTHS.unshift(2);

// override "initConfig->group->plugins" attribute for custom plugin development
g3w.app.once('initconfig', () => {
  initConfig.plugins = Object.assign(initConfig.plugins || {}, CONF.plugins.reduce((a, v) => ({ ...a, [v]: { ...initConfig.plugins[v], gid: initConfig.initproject, baseUrl: initConfig.staticurl }}), {}));
});

// Test MESSAGE sent to "Open in iframe" map control
g3w.app.once('iframe:message', (w, e) => { w.postMessage({
  id: null,
  action: 'app:getcenter',                                        // or 'app:getextent'
  data: { epsg: 4326 }	
}, '*') });

g3w.app.once('ready', () => { console.log('ready'); });

// add 20 layer styles
g3w.app.once('app-ready', () => {
  g3w.state.project.state.layers.forEach(l => (l.styles || []).push(...Array(20).fill().map((_, i) => ({ name: `style_${i}`, current: false}))));
});

// dark mode
g3w.app.isReady().then(() => {
  document.querySelector('nav').style.setProperty('--skin-color', '#212c31');
});
document.body.style.setProperty('--bgcolor', '#212c31');

// custom header links
g3w.app.once('initconfig', () => {
  initConfig.header_custom_links = [
    // modal button (icon + i18n)
    {
      "i18n":   true,
      "icon":   "fas fa-plus",
      "title":  "Add Layer",
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

// custom context menu items
g3w.app.on('map:context-menu', menu => {
  const xyz = () => {
    const view   = g3w.app.getMap().getView();
    const coords = ol.proj.toLonLat(view.getCenter(), view.getProjection());
    const lon    = coords[0].toFixed(6);
    const lat    = coords[1].toFixed(6);
    const zoom   = Math.round(g3w.app.getMap().getView().getZoom()) || 17;
    return { lat, lon, zoom };
  };
  menu.items.push({
    label: 'View on Panoramax',
    icon: 'fas fa-road',
    position: 10,
    cbk: () => {
      const { lat, lon, zoom } = xyz();
      window.open(`https://explore.panoramax.fr/?map=${zoom}/${lat}/${lon}`, '_blank');
    }
  });
  menu.items.push({
    label: 'View on external map',
    icon: 'external-link',
    position: 100,
    children: [
      {
        label: 'Apple',
        cbk: () => {
          const { lat, lon, zoom } = xyz();
          window.open(`http://maps.apple.com?center=${lat},${lon}&z=${zoom}`, '_blank');
        },
      },
      {
        label: 'Bing',
        cbk: () => {
          const { lat, lon, zoom } = xyz();
          window.open(`https://www.bing.com/maps/?cp=${lat}~${lon}&lvl=${zoom}`, '_blank');
        },
      },
      {
        label: 'Google',
        cbk: () => {
          const { lat, lon, zoom } = xyz();
          window.open(`https://www.google.com/maps/@${lat},${lon},${zoom}z`, '_blank');
        },
      },
      {
        label: 'HERE',
        cbk: () => {
          const { lat, lon, zoom } = xyz();
          window.open(`https://wego.here.com?map=${lat},${lon},${zoom}`, '_blank');
        },
      },
      {
        label: 'Mapillary',
        cbk: () => {
          const { lat, lon, zoom } = xyz();
          window.open(`https://www.mapillary.com/app/?lat=${lat}&lng=${lon}&z=${zoom}`, '_blank');
        },
      },
      {
        label: 'Mapy.cz',
        cbk: () => {
          const { lat, lon, zoom } = xyz();
          window.open(`https://mapy.com/it/turisticka?x=${lat}&y=${lon}&z=${zoom}`, '_blank');
        },
      },
      {
        label: 'Meteo blu',
        cbk: () => {
          const { lat, lon } = xyz();
          window.open(`https://www.meteoblue.com/en/weather/week/${lat}N${lon}E`, '_blank');
        },
      },
      {
        label: 'OSM',
        cbk: () => {
          const { lat, lon, zoom } = xyz();
          window.open(`https://www.openstreetmap.org/#map=${zoom}/${lat}/${lon}`, '_blank');
        },
      },
      {
        label: 'Waze',
        cbk: () => {
          const { lat, lon, zoom } = xyz();
          window.open(`https://ul.waze.com/ul?ll=${lat},${lon}&zoom=${zoom}`, '_blank');
        },
      },
      {
        label: 'Wikimapia',
        cbk: () => {
          const { lat, lon, zoom } = xyz();
          window.open(`https://wikimapia.org/#lang=en&lat=${lat}&lon=${lon}&z=${zoom}`, '_blank');
        },
      },
      {
        label: 'Yandex',
        cbk: () => {
          const { lat, lon, zoom } = xyz();
          window.open(`https://yandex.com/maps?ll=${lon},${lat}&z=${zoom}`, '_blank');
        },
      },
    ],
  });
});

// dev layers (from local storage)
g3w.app.once('initconfig', () => {

  const pid = initConfig.projects.find(p => initConfig.initproject === p.gid).id;

  // DBTM Multiscala
  const url  = "http://www502.regione.toscana.it/geoscopio_qg/cgi-bin/qgis_mapserv?map=dbtm_rt.qgs&"
  const data = JSON.parse(localStorage.getItem('externallayers') || '{ "urls": [], "data": [] }');
  data.urls = [...(data.urls || []), ...(data.urls?.some(u => u.url === url) ? [] : [{ url, id: "DBTM", type: 'wms', pid }])];
  data.data = [...(data.data || []), ...(data.data?.some(l => l.name === 'DBTM') ? [] : [{
    "type":    'wms',
    pid,
    url,
    "name":     "DBTM",
    "layers":   [ "DBTM_DataBaseTopograficoMultiscala" ],
    "epsg":     "EPSG:25832",
    "position": "bottom",
    "visible":  false,
    "opacity":  1,
  }])];
  localStorage.setItem('externallayers', JSON.stringify(data));

  // piazza-leopoldo.kml
  idb.getItem('externalLayers').then(externalLayers => {
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
    idb.setItem('externalLayers', externalLayers);
  });
});

// dev layers (modal-addlayer)
g3w.app.once('after:setupControls', async () => {

  // $('#modal-addlayer').modal('show');

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
    if (g3w.app.getLayerByName(file.name)) {
      return console.assert(!g3w.app.getLayerByName(file.name), `Unable to add layer: ${file.name}`);
    }
    setTimeout(() => console.assert(g3w.app.getLayerByName(file.name), `Unable to add layer: ${file.name}`), 2500);
    await setOption('#add-layer-type', 'file');
    await setOption('#projection-layer', epsg);
    await waitFor(() => q('#addcustomlayer input[type="file"]'), 1000);
    const data = new DataTransfer();
    data.items.add(file);
    q('#addcustomlayer input[type="file"]').files = data.files;
    q('#addcustomlayer input[type="file"]').dispatchEvent(new Event('change'));
    await waitFor(() => q('#modal-addlayer menu .btn.btn-success') && !q('#modal-addlayer menu .btn.btn-success').disabled, 1000);
    q('#modal-addlayer menu .btn.btn-success').click();
    window.addEventListener("beforeunload", () => { g3w.app.getLayerByName(file.name) && g3w.app.removeExternalLayer(file.name); });
  }

  // add wms layer
  const setWms = async (wms) => {
    await waitFor(() => !q('#add-layer-type').value, 5000);
    await setOption('#add-layer-type', 'wms');
    await setOption('#add_wms_url', wms.url);
    await setOption('#add_wms_name', wms.id);
    await waitFor(() => q('#modal-addlayer .btn.btn-block.btn-success') && !q('#modal-addlayer .btn.btn-block.btn-success').disabled, 1000);
    q('#modal-addlayer .btn.btn-block.btn-success').click();
    await waitFor(() => q('#g3w-wms-layers ~ table tbody td'), 10000);
    q('#g3w-wms-layers ~ table tbody td').click();
    await waitFor(() => q('#modal-addlayer menu .btn.btn-success') && !q('#modal-addlayer menu .btn.btn-success').disabled, 1000);
    await setOption('#position-layer', 'bottom');
    await setOption('#g3w-wms-visible', false);
    await setOption('#g3w-wms-opacity', 0.85);
    const wms_name = q('#g3w-wms-layer-name').value;
    await waitFor(() => q('#modal-addlayer menu .btn.btn-success') && !q('#modal-addlayer menu .btn.btn-success').disabled, 1000);
    q('#modal-addlayer menu .btn.btn-success').click();
    window.addEventListener("beforeunload", () => { g3w.app.getLayerByName(wms_name) && g3w.app.removeExternalLayer(wms_name); });
  };

  // add tms layer
  const setTMS = async (tms) => {
    await waitFor(() => !q('#add-layer-type').value, 5000);
    await setOption('#add-layer-type', 'tms');
    await setOption('#add_tms_url', tms.url);
    await setOption('#add_tms_name', tms.name);
    await waitFor(() => q('#modal-addlayer menu .btn.btn-success') && !q('#modal-addlayer menu .btn.btn-success').disabled, 1000);
    await setOption('#position-layer-tms', 'bottom');
    await setOption('#g3w-tms-visible', false);
    await setOption('#g3w-tms-opacity', 0.85);
    await waitFor(() => q('#modal-addlayer menu .btn.btn-success') && !q('#modal-addlayer menu .btn.btn-success').disabled, 1000);
    q('#modal-addlayer menu .btn.btn-success').click();
    window.addEventListener("beforeunload", () => { g3w.app.getLayerByName(tms.name) && g3w.app.removeExternalLayer(tms.name); });
  };

  // export layer to zip
  const zipFile = async name => {
    await waitFor(async () => name in (await idb.getItem('externalLayers')), 1000);
    const externalLayers = await idb.getItem('externalLayers');
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
    'EPSG:4326'
  );

  // OpenTopoMap
  await setTMS({
    name: 'OpenTopoMap',
    url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png'
  });

  // OpenStreetMap
  await setTMS({
    name: 'OpenStreetMap',
    url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  });

  // ORTOFOTO
  await setWms({
    id: 'ORTOFOTO',
    url: 'https://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap/wms?map=wmsofc&map_resolution=91&language=ita&'
  });

});

/**
 * Custom editing control: “Edit in iframe”
 * 
 * @see https://github.com/g3w-suite/g3w-client/pull/736
 */
g3w.app.onafter('showPanel', panel => {
  if ('editing-panel' !== panel.getId()) {
    return;
  }
  
  const tolboxes = panel.internalPanel.$el.querySelector('#toolboxes');
  let iframe_btn = document.querySelector('#edit_in_iframe');
  if (!tolboxes || iframe_btn) {
    return;
  }
  // append "edit in iframe" element immediately after toolboxes
  tolboxes.insertAdjacentHTML('afterend', `<p><a href="#" id="edit_in_iframe">&#x270f; Edit in iframe</a></p>`);
  iframe_btn = document.querySelector('#edit_in_iframe');
  iframe_btn.addEventListener('click', () => {
    const w = window.open('about:blank', '_blank', `fullscreen=yes`);
    w.document.write(`<!doctype HTML><html><head><title>Test Iframe</title><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;display:block;}</style></head><body><iframe src="${location.href}"></iframe></body></html>`);
    w.addEventListener('message', e => {
      if ('app:ready' === e.data.action) {
        w.document.querySelector('iframe').contentWindow.postMessage({
          id:      null,
          action: 'editing:add',
          data: {
            qgs_layer_id: Array.from(tolboxes.children).filter(item => item.classList.contains('toolbox') && 'none' !== item.style.display).map(item => item.id.split('id_toolbox_')[1]), // toolbox id = layer id
            properties: { },
          }
        }, '*');
      }
    }, false);
    // prevent page refresh (eg. CTRL+R)
    w.onbeforeunload = () => w.close();
  });
});

/**
 * Custom query result action button: “Update feature in iframe”
 * 
 * @see https://github.com/g3w-suite/g3w-client/pull/736
 */
g3w.app.onafter('addActionsForLayers', (actions, layers) => {
  Object.keys(actions)
  .filter(id => layers.find(l => id === l.id).editable)
  .forEach(id => {
    //Check only if has primay key value to ge unique feature to edit
    const pkField = g3w.app.getPlugin('editing').getEditingFields(id).find(f => f.pk);
    // in case that layer has not pk field, iframe editing action is not
    if (!pkField) {
      return;
    }
    actions[id].push({
      id: 'update_feature_in_iframe',
      class: 'fa fa-window-restore',
      hint:  'Update feature in iframe',
      style: { color: 'black !important' },
      cbk:   (layer, feature) => {
        const w = window.open('about:blank', '_blank', `fullscreen=yes`);
        w.document.write(`<!doctype HTML><html><head><title>Test Iframe</title><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;display:block;}</style></head><body><iframe src="${location.href}"></iframe></body></html>`);
        w.addEventListener('message', e => {
          if ('app:ready' === e.data.action) {
            w.document.querySelector('iframe').contentWindow.postMessage({
              id:      null,
              action: 'editing:update',
              data: {
                qgs_layer_id: layer.id,
                feature: {
                  field: pkField.name,
                  value: feature.attributes[pkField.name]
                }
              }
            }, '*');
          }
        }, false);
        // prevent page refresh (eg. CTRL+R)
        w.onbeforeunload = () => w.close();
      }
    })
  })
});

/**
 * Custom map control: “Open in iframe”
 */
g3w.app.once('after:setupControls', () => {
  g3w.app.createMapControl({
    id:            "OPENIFRAME",
    options: {
      add:         true,
      clickmap:    false,
      tipLabel:    'Open in iframe',
      customClass: 'fa fa-window-restore',
      onclick() {
        const w = window.open('about:blank', '_blank', `fullscreen=yes`);
        w.document.write(`<!doctype HTML><html><head><title>Test Iframe</title><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;display:block;}</style></head><body><iframe src="${location.href}"></iframe></body></html>`);
        // send message to iframe every time ifrema send a message con contentWindow
        w.addEventListener('message', e => {
          //Emit iframe:message to handle the message in config.js file
          setTimeout(() => g3w.app.emit('iframe:message', w.document.querySelector('iframe').contentWindow, e), 2000)
        }, false);
        // prevent page refresh (eg. CTRL+R)
        w.onbeforeunload = () => w.close();
      }
    },
  });
});

/**
 * Custom map control: “Iframe editor”
 * 
 * @see https://github.com/g3w-suite/g3w-client/pull/855
 */
g3w.app.once('after:setupControls', () => {
  g3w.app.createMapControl({
    id:            "IFRAMEEDITOR",
    options: {
      add:         true,
      clickmap:    false,
      tipLabel:    'Iframe editor',
      customClass: 'far fa-edit',
      onclick() {
        const w = window.open('about:blank', '_blank');
        w.document.write(/* html */`
          <!doctype HTML>
          <html>
            <head>
              <title>🛠️ Iframe editor</title>
              <style>
                html, body, iframe         { width: 100%; height: 100%; margin: 0; border: 0; display: block; }
                button                     { cursor: pointer; padding: 12px; border: none; }
                textarea                   { resize: none; border: none; }
                select:required:invalid    { opacity: .8; }
                option[value=""][disabled] { display: none; }
              </style>
            </head>
            <body style = "display: flex;">
              <iframe src="${ location.href }"></iframe>
              <div style="display: flex; flex-direction: column;  width:40vw;">
                <div id = "input" style = " display: flex; flex-direction: column; height: 100%;">
                  <select   id = "layerid" style = "padding: 12px;" required><option value="" disabled selected hidden>loading options ...</option></select> 
                  <button   id = "create" disabled>🛠️ Generate GeoJson from feature</button>
                  <textarea id = "geojson" placeholder  = "Paste GeoJson"   style = "flex-grow: 2;"></textarea>
                </div>
                <div id = "buttons" style="display: flex; justify-content: space-around;">
                  <button id = "add"    disabled title="add a new feature">➕ Add</button>
                  <button id = "update" disabled title="update an existing feature">📝 Update</button>
                  <button id = "delete" disabled title="delete a feature">❌ Delete</button>
                  <button id = "draw"   disabled title="draw a new feature">✍️ Draw/Edit</button>
                  <button id = "save"   disabled title="save changes on server">💾 Save</button>
                  <button id = "clear"  disabled title="clear map">🧹 Clear</button>
                </div>
                <div>
                  <label>IFRAME response:</label>
                  <textarea id = "response" style ="width: 100%; padding: 0; height: 50vh; border: 0; border-top: 2px solid lightgrey;" readonly></textarea>
                </div> 
              </div>
            </body>
            <script>
              document.querySelector('iframe').addEventListener("load", () => {
                const IFRAME                      = document.querySelector('iframe').contentWindow;
                const OUTPUT                      = document.querySelector('#response');
                const g3w                         = IFRAME.g3w;
                const { ApplicationState }        = IFRAME.g3wsdk.core;
                const { GEOMETRY_FIELDS,G3W_FID } = IFRAME.g3wsdk.constant;
                const { GUI }                     = IFRAME.g3wsdk.gui;
                const { ol }                      = IFRAME;

                const inputs                      = document.querySelectorAll('#layerid, #geojson');
                const buttons                     = document.querySelectorAll('#buttons button');
                const layerId                     = document.querySelector('#layerid');
                const geoJson                     = document.querySelector('#geojson');
                const create                      = document.querySelector('#create');
                const clear                       = document.querySelector('#clear');
                const draw                        = document.querySelector('#draw');

                let isNew                         = false; // whether is a new feature (geojson)

                for (const i of inputs) {
                  i.addEventListener('input', evt => {
                    // on change → reset geoJson value 
                    if ('layerid' === evt.target.id) {
                      geoJson.value = null;
                    }
                    const enabled = Array.from(inputs).reduce((enabled, i) => {
                      let value = null;
                      if ('textarea' === i.type) {
                        try {
                          value = JSON.parse(i.value || null);
                        } catch(e) {
                          console.warn(e); 
                          value = null;
                        }
                        isNew           = value?.id?.toString().startsWith('_new_');
                        create.disabled = !!value;
                        clear.disabled  = !value;
                      } else {
                        value         = ApplicationState.project.getLayerById(i.value);
                        draw.disabled = !(value && value.isGeoLayer());
                      }
                      enabled = enabled && value;
                      return enabled;
                    }, true);
                    // clear response
                    OUTPUT.value = null;
                    //set button disabled based on id
                    Array.from(buttons).filter(btn => !['draw', 'save', 'clear'].includes(btn.id)).forEach(btn => btn.disabled = !(enabled && ('add' === btn.id ? isNew : !isNew))); 
                  });
                }
                // post message
                buttons.forEach(btn => btn.addEventListener('click', evt => {
                  try {
                    if ('draw' == evt.target.id) {
                      layerId.disabled                           = true;
                      create.disabled = true;
                    }
                    IFRAME.postMessage({ 
                      id:     Date.now().toString(),
                      action: 'editing:json',
                      data: {
                        qgs_layer_id: layerId.value,
                        geojson: 'save' !== evt.target.id && geoJson.value ? JSON.parse(geoJson.value) : undefined,
                        method: evt.target.id,
                      },
                    }, '*');
                  } catch(e) {
                    console.warn(e); 
                  }
                }));  
                clear.addEventListener('click', async () => {
                  geoJson.value = null;
                  geoJson.dispatchEvent(new Event('input')); 
                })
                //create an geojson to update getting
                create.addEventListener('click', async () => {
                  try {
                    const { data } = await ApplicationState.project.getLayerById(layerId.value).getFilterData({ formatter: 0, page: 1, page_size: 1 });
                    const feature = data?.[0]?.features?.[0];
                    //get value from field media (pdf, photo)
                    if (feature) {
                      Object.entries(feature.getProperties()).forEach(([k,v]) => {
                        if (null !== v && !GEOMETRY_FIELDS.includes(k) && 'object' === typeof v) {
                          feature.set(k, v?.value);
                        }  
                      });
                      feature.set(G3W_FID, undefined);
                      GUI.getService('map').zoomToFeatures([feature], { highlight: true });
                      geoJson.value = JSON.stringify((new ol.format.GeoJSON()).writeFeatureObject(feature), null, 2);
                      geoJson.dispatchEvent(new Event('input')); 
                    }
                  } catch(e) {
                    console.warn(e); 
                  }
                });
                // dynamically create layerId <options>
                window.addEventListener('message', async message => {
                  if ('app:ready' !== message.data?.action) {
                    return;
                  }
                  const layers = (message.data?.response?.data?.layers || []);
                  layers
                    .filter(l  => ApplicationState.project.getLayerById(l.id).isEditable())
                    .forEach(l => layerId.appendChild(Object.assign(document.createElement('option'), { value: l.id, text: l.id })));
                  // initial value
                  if (layers.length) {
                    layerId.value = layers[0].id;
                    layerId.dispatchEvent(new Event('input'));
                    create.disabled = false;
                  }
                });
                // handle editing response (from parent frame)
                window.addEventListener('message', async message => {
                  if ('editing:json' !== message.data?.action) {
                    return;
                  }
                  const response = message.data?.response || {};
                  const data     = response?.data || {}; 
                  const method   = data?.method;
                  if (response) {
                    OUTPUT.value  = JSON.stringify(message.data, null, 2);
                    OUTPUT.style.color = response?.result ? "black" : "red";
                  }
                  document.querySelector('#save').disabled = !('draw' === method && response.result && data.geojson);
                  if ('save' === method && data.geojson) {
                    layerId.disabled                           = false;
                    create.disabled = false;
                    data.geojson.properties                = g3w.app.getPlugin('editing').getEditingFields(layerId.value).reduce((a, p) => { a[p.name] = data?.geojson?.properties?.[p.name] ?? null; return a },{});
                    geoJson.value                          = JSON.stringify(data.geojson, null, 2);
                    geoJson.dispatchEvent(new Event('input'));
                  }
                });
              });
            </script>
          </html>
        `);
        // prevent page refresh (eg. CTRL+R)
        w.onbeforeunload = () => w.close();
      }
    },
  });
});

/**
 * Custom map control: “Record a video”
 */
g3w.app.once('after:setupControls', () => {
  let recorder, chunks, stream;
  g3w.app.createMapControl({
    id: "VIDEOCAPTURE",
    options: {
      add: true,
      clickmap: false,
      tipLabel: 'Record a video',
      customClass: 'fa fa-video',
      async onclick() {
        try {
          if ('recording' === recorder?.state) {
            recorder.stop();
            return;
          }
          // Richiede il permesso di catturare lo schermo/scheda
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: { ideal: 30 } },
            audio: false
          });

          chunks = [];

          recorder = new MediaRecorder(stream, {
            mimeType: ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type))
          });

          recorder.ondataavailable = (e) => {
            if (e?.data?.size > 0) {
              chunks.push(e.data);
            }
          };

          recorder.onstop = () => {
            const btn = document.querySelector('.fa-stop-circle');
            if (btn) {
              btn.classList.replace('fa-stop-circle', 'fa-video');
            }
            g3w.utils.saveBlob(new Blob(chunks, { type: recorder.mimeType }), `video_capture_${new Date().getTime()}.webm`);
            // Stop all video tracks to close the browser sharing popup
            stream.getTracks().forEach(track => track.stop());
          };

          // Detects if the user presses "Stop Sharing" from the browser bar
          stream.getVideoTracks()[0].onended = () => {
            if ('inactive' !== recorder.state) {
              recorder.stop();
            }
          };

          recorder.start(1000);

          const btn = document.querySelector('.fa-video');
          if (btn) {
            btn.classList.replace('fa-video', 'fa-stop-circle');
          }
        } catch (e) {
          g3w.app.showUserMessage({ type: 'warning', message: e.toString() });
        }
      }
    },
  });
});


/**
 * Custom search action: “Create from template”
 */
g3w.app.once('ready', async () => {
  const SEARCH          = g3w.app.getComponent('search');
  const SAVED_SEARCHES  = SEARCH.getInternalComponent().state.searches;
  const CUSTOM_SEARCHES = JSON.parse(localStorage.getItem('custom-searches') || '[]');

  SAVED_SEARCHES.unshift(...CUSTOM_SEARCHES);

  if (!SAVED_SEARCHES.length) {
    return;
  }

  SEARCH.actions.unshift({
    id:      "widget-editor",
    class:   `fa fa-laptop-code`,
    tooltip: 'Create from template',
    style: {
      color:        '#ea9610',
      padding:      '6px',
      fontSize:     '1.2em',
      borderRadius: '3px',
      marginRight:  '5px',
    },
    fnc:     () => {
      const dialog = Object.assign(document.createElement('template'), {
        innerHTML: /* html */`
          <dialog>
            <form method="dialog">
              <label for="template_name" style="font-size: 1.25em;">Choose template</label>
              <select name="template_name" class="form-control" style="margin-bottom: 1em;">
                <option value="blank">---</option>
                ${SAVED_SEARCHES.map(opt => /* html */`<option value="${opt.id}">${opt.name}</option>`).join('')}
              </select>
              <pre hidden style="margin-top: 1em;" contenteditable></pre>
              <menu style="display: flex;justify-content: space-between;">
                <button type="submit" value="cancel" class="btn btn-secondary">Cancel</button>
                <button disabled type="submit" value="save" class="btn btn-success">Confirm</button>
              </menu>
            </form>
          </dialog>
        `.trim()
      }).content.firstChild;

      const select = dialog.querySelector('select');
      const preview = dialog.querySelector('pre');

      // preview script
      select.addEventListener('change', async () => {
        dialog.querySelector('[value=save]').disabled = ('blank' === select.value);
        if (select.value !== 'blank') {
          preview.textContent = JSON.stringify(
            Object.assign({}, SAVED_SEARCHES.find(opt => select.value === opt.id.toString()), { id: `my-${CUSTOM_SEARCHES.length}` }),
            null,
            2
          );
        } else {
          preview.textContent = '';
        }
        preview.hidden = !preview.textContent;
      });
      dialog.addEventListener('close', async () => {
        const action = dialog.returnValue;
        if ('save' === action && select.value) {
          CUSTOM_SEARCHES.unshift(JSON.parse(preview.textContent));
          SAVED_SEARCHES.unshift(JSON.parse(preview.textContent));
          localStorage.setItem('custom-searches', JSON.stringify(CUSTOM_SEARCHES));
          window.location.reload();
        }
        dialog.remove();
      });
      document.body.appendChild(dialog);
      dialog.showModal();
    },
  });

  document.querySelectorAll('#search > .treeview-menu > li').forEach((li, i) => {
    if (i < CUSTOM_SEARCHES.length) {
      li.insertAdjacentHTML('afterbegin', /* html */`<i
        class          = "fa fa-trash"
        style          = "color: red;"
      ></i>`);
      li.querySelector('.fa-circle').hidden = true;
      li.querySelector('.fa-trash').addEventListener('click', e => {
        e.stopPropagation(); 
        CUSTOM_SEARCHES.splice(i, 1);
        localStorage.setItem('custom-searches', JSON.stringify(CUSTOM_SEARCHES));
        window.location.reload();
      });
    }
  });

});


// run app (index.prod.js)
import './index.prod';