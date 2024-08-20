import ProjectsRegistry             from 'store/projects';
import ApplicationState             from 'store/application-state';
import { convertObjectToUrlParams } from 'utils/convertObjectToUrlParams';

const FETCH = {
  /**
   * @param { Object } opts
   * @param opts.url
   * @param opts.params
   * @param opts.mime_type
   * @return {Promise<{mime_type, layers: boolean, url: string}>}
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
   */
  async GET({url, params, mime_type}) {
    return {
      url: `${url}?${convertObjectToUrlParams(params)}`,
      layers: true,
      mime_type
    };
  },
};

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
 * ORIGINAL SOURCE: src\app\core\print\printservice.js@3.9.0
 * 
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
export function print(opts = {}, method = 'GET') {
 const store  = ProjectsRegistry.getCurrentProject().getLayersStore();
 const layers = store.getLayers({ PRINTABLE: { scale: opts.scale }, SERVERTYPE: 'QGIS' }).reverse(); // reverse order is important

 // No layers are printable (i.e., no visible layers)
 if (0 === layers.length) {
   return Promise.resolve({ layers: false })
 }

  // force GET request for geopdf because qgiserver support only that method [QGIS 3.34.6-Prizren 'Prizren' (623828f58c2)]
 if ('geopdf' === opts.format) {
  method = 'GET';
 }

 const LAYERS = layers.map(l => l.getPrintLayerName()).join();

 return FETCH[method]({
   url: store.getWmsUrl(),
   mime_type: ({ pdf: 'application/pdf', jpg: 'image/jpeg', svg: 'image/svg' })[opts.format] || opts.format,
   params: {
     SERVICE:       'WMS',
     VERSION:       '1.3.0',
     REQUEST:       'GetPrint',
     TEMPLATE:       opts.template,
     DPI:            opts.dpi,
     STYLES:         layers.map(l => l.getStyle()).join(','),
     ...(opts.is_maps_preset_theme ? {} : { LAYERS }), // in the case of a map that has preset_theme, no LAYERS need tyo pass as parameter.
     FORMAT:         ({ png: 'png', pdf: 'application/pdf', geopdf: 'application/pdf' })[opts.format] || opts.format,
     ...('geopdf' === opts.format ? { FORMAT_OPTIONS: 'WRITE_GEO_PDF:TRUE'} : {}), //@since 3.10.0
     CRS:            store.getProjection().getCode(),
     filtertoken:    ApplicationState.tokens.filtertoken,
     ...(opts.maps || []).reduce((params, map) => Object.assign(params, {
        [`${map.name}:SCALE`]:    map.scale,
        [`${map.name}:EXTENT`]:   map.extent,
        [`${map.name}:ROTATION`]: opts.rotation,
        //need to specify LAYERS from mapX in case of maps has at least one preset theme set, otherwise get layers from LAYERS param
        ...(opts.is_maps_preset_theme && undefined === map.preset_theme ? { [`${map.name}:LAYERS`]: LAYERS } : {})
      }), {}),
     ...(opts.labels || []).reduce((params, label) => Object.assign(params, { [label.id]: label.text }), {})
   },
 });
}