import ApplicationState from 'store/application';
import GUI              from 'services/gui';

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
 * @param opts.field
 * @param opts.values
 * @param opts.template
 * @param opts.download
 */
export async function printAtlas(opts = {}) {
  const store = ApplicationState.project.getLayersStore();
  const multi = opts.values.length > 1; 
  const response = await fetch(store.getWmsUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body:  new URLSearchParams(await GUI.getPrintParams({
      SERVICE:     'WMS',
      VERSION:     '1.3.0',
      REQUEST:     'GetPrintAtlas',
      EXP_FILTER:  opts.field + (multi ? ' IN (' : '=') + (opts.values.map(v => `'${v}'`).join()) + (multi ? ')' : ''),
      TEMPLATE:    opts.template,
      filtertoken: ApplicationState.tokens.filtertoken,
      DOWNLOAD:    opts.download ? 1 : undefined,
    }) || {}).toString(),
  });
    
  if (!response.ok) {
    //@TODO Need to translate
    throw new Error(500 === response.status ? 'Internal Server Error' : 'Request Failed');
  }
  
  return {
    mime_type: 'application/pdf',
    layers:    true,
    url:       URL.createObjectURL(await response.blob()),
  };

}