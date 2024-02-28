/**
 * @file
 * @since 3.10.0
 */

import Component                    from 'core/g3w-component';
import ProjectsRegistry             from 'store/projects';
import ApplicationState             from 'store/application-state';
import { convertObjectToUrlParams } from 'utils/convertObjectToUrlParams';

import * as vueComp                 from 'components/Print.vue';

/*
 http://localhost/fcgi-bin/qgis_mapserver/qgis_mapserv.fcgi
  ?MAP=/home/marco/geodaten/projekte/composertest.qgs
  &SERVICE=WMS&VERSION=1.3.0
  &REQUEST=GetPrint
  &TEMPLATE=Composer 1
  &map0:extent=693457.466131,227122.338236,700476.845177,230609.807051
  &BBOX=693457.466131,227122.338236,700476.845177,230609.807051
  &CRS=EPSG:21781
  &WIDTH=1467
  &HEIGHT=729
  &LAYERS=layer0,layer1
  &STYLES=,
  &FORMAT=pdf
  &DPI=300
  &TRANSPARENT=true

 In detail, the following parameters can be used to set properties for composer maps:

 <mapname>:EXTENT=<xmin,ymin,xmax, ymax> //mandatory
 <mapname>:ROTATION=<double> //optional, defaults to 0
 <mapname>:SCALE=<double> //optional. Forces scale denominator as server and client may have different scale calculations
 <mapname>:LAYERS=<comma separated list with layer names> //optional. Defaults to all layer in the WMS request
 <mapname>:STYLES=<comma separated list with style names> //optional
 <mapname>:GRID_INTERVAL_X=<double> //set the grid interval in x-direction for composer grids
 <mapname>:GRID_INTERVAL_Y=<double> //set the grid interval in x-direction for composer grids
 */

/**
 * @deprecated since 3.9.1 will be removed in 4.x
 * 
 * ORIGINAL SOURCE: src\app\core\print\printservice.js@3.9.0
 */
export const PRINT_UTILS = {
  /**
   * @param { Object } opts
   * @param opts.rotation,
   * @param opts.dpi
   * @param opts.format
   * @param opts.template
   * @param { Array } opts.maps
   * @param { Array } opts.labels
   * @param opts.is_maps_preset_theme
   * @param { 'GET' | 'POST' } method
   */
  print(opts = {}, method = 'GET') {
    const store  = ProjectsRegistry.getCurrentProject().getLayersStore();
    const layers = store
      .getLayers({ PRINTABLE: { scale: opts.scale }, SERVERTYPE: 'QGIS' })
      .reverse(); // reverse order is important

    // skip when ..
    if (!layers.length) {
      return Promise.resolve({layers: false})
    }

    const LAYERS = layers.map(l => l.getPrintLayerName()).join();

    return PRINT_UTILS[method]({
      url: store.getWmsUrl(),
      mime_type: ({ pdf: 'application/pdf', jpg: 'image/jpeg' })[opts.format],
      params: {
        SERVICE:     'WMS',
        VERSION:     '1.3.0',
        REQUEST:     'GetPrint',
        TEMPLATE:    opts.template,
        DPI:         opts.dpi,
        STYLES:      layers.map(l => l.getStyle()).join(','),
        LAYERS:      opts.is_maps_preset_theme ? undefined : LAYERS,
        FORMAT:      opts.format,
        CRS:         store.getProjection().getCode(),
        filtertoken: ApplicationState.tokens.filtertoken,
        ...(opts.maps || []).reduce((params, map) => {
          params[map.name + ':SCALE']    = map.scale;
          params[map.name + ':EXTENT']   = map.extent;
          params[map.name + ':ROTATION'] = opts.rotation;
          params[map.name + ':LAYERS']   = opts.is_maps_preset_theme && undefined === map.preset_theme ? LAYERS : undefined;
          return params;
        }, {}),
        ...(opts.labels || []).reduce((params, label) => {
          params[label.id] = label.text;
          return params;
        }, {})
      },
    });
  },
  /**
   * @param { Object } opts
   * @param opts.field
   * @param opts.values
   * @param opts.template
   * @param opts.download
   * @param { 'GET' | 'POST' } method
   */
  printAtlas(opts = {}, method = 'GET') {
    const store = ProjectsRegistry.getCurrentProject().getLayersStore();
    const multi = opts.values.length > 1;
    return PRINT_UTILS[method]({
      url: store.getWmsUrl(),
      mime_type: 'application/pdf',
      params:    {
        SERVICE:     'WMS',
        VERSION:     '1.3.0',
        REQUEST:     'GetPrintAtlas',
        EXP_FILTER:  opts.field + (multi ? ' IN (' : '=') + (opts.values.map(v => `'${v}'`).join()) + (multi ? ')' : ''),
        TEMPLATE:    opts.template,
        filtertoken: ApplicationState.tokens.filtertoken,
        DOWNLOAD:    opts.download ? 1 : undefined,
      },
    })
  },

  /**
   * @param { Object } opts
   * @param opts.url
   * @param opts.params
   * @param opts.mime_type
   * @return {Promise<{mime_type, layers: boolean, url: string}>}
   * @constructor
   */
  async POST({ url, params, mime_type }) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: convertObjectToUrlParams(params),
    });
    if (!response.ok) {
      //@TODO Need to translate
      throw new Error(500 === response.status ? 'Internal Server Error' : 'Request Failed');
    }
    return {
      mime_type,
      layers: true,
      url: URL.createObjectURL(await response.blob()),
    };
  },
  /**
   * @param { Object } opts
   * @param opts.url
   * @param opts.params
   * @param opts.mime_type
   * @return {Promise<unknown>}
   * @constructor
   */
  async GET({url, params, mime_type}) {
    return {
      url: `${url}?${convertObjectToUrlParams(params)}`,
      layers: true,
      mime_type
    };
  },

  /**
   * Get wms url for current project
   * @returns {*}
   */
  getUrl() {
    return ProjectsRegistry.getCurrentProject().getLayersStore().getWmsUrl();
  },

};

/**
 * ORIGINAL SOURCE: src/app/gui/print/vue/print.js@v3.9.3 
 */
export default function(opts = {}) {
  const comp = new Component({
    ...opts,
    title: 'print',
    service: {},
    internalComponent: new (Vue.extend(vueComp))
  });

  // BACKCOMP v3.x
  comp._service.printService      = PRINT_UTILS;
  comp._service.state             = comp.internalComponent.state;
  comp._service.changeScale       = comp.internalComponent.changeScale;
  comp._service.getOverviewExtent = comp.internalComponent.getOverviewExtent;
  comp._service.changeRotation    = comp.internalComponent.changeRotation;
  comp._service.changeTemplate    = comp.internalComponent.changeTemplate;
  comp._service.print             = comp.internalComponent.print;
  comp._service.showPrintArea     = comp.internalComponent.showPrintArea;
  comp._service.reload            = comp.internalComponent.reload;
  

  comp.onafter('setOpen', b => comp._service.showPrintArea(b));
  comp.onafter('reload', () => {
    comp._service.reload();
    comp.state.visible = comp._service.state.visible;
  });

  return comp;
};