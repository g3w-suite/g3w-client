import ApplicationState from 'core/applicationstate';
import ProjectsRegistry from 'store/projects';

const { base, inherit, convertObjectToUrlParams } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

/*
 http://localhost/fcgi-bin/qgis_mapserver/qgis_mapserv.fcgi?MAP=/home/marco/geodaten/projekte/composertest.qgs&SERVICE=WMS&VERSION=1.3.0
 &REQUEST=GetPrint&TEMPLATE=Composer 1&
 map0:extent=693457.466131,227122.338236,700476.845177,230609.807051&
 BBOX=693457.466131,227122.338236,700476.845177,230609.807051&
 CRS=EPSG:21781&WIDTH=1467&HEIGHT=729&LAYERS=layer0,layer1&
 STYLES=,&FORMAT=pdf&DPI=300&TRANSPARENT=true

 In detail, the following parameters can be used to set properties for composer maps:

 <mapname>:EXTENT=<xmin,ymin,xmax, ymax> //mandatory
 <mapname>:ROTATION=<double> //optional, defaults to 0
 <mapname>:SCALE=<double> //optional. Forces scale denominator as server and client may have different scale calculations
 <mapname>:LAYERS=<comma separated list with layer names> //optional. Defaults to all layer in the WMS request
 <mapname>:STYLES=<comma separated list with style names> //optional
 <mapname>:GRID_INTERVAL_X=<double> //set the grid interval in x-direction for composer grids
 <mapname>:GRID_INTERVAL_Y=<double> //set the grid interval in x-direction for composer grids
 */
const OUTPUT_FORMATS            = { pdf: 'application/pdf', jpg: 'image/jpeg' };
const COMMON_REQUEST_PARAMETERS = { SERVICE: 'WMS', VERSION: '1.3.0', };

const getAtlasParamsFromOptions = function(options={}){
  const {field, values, template, download=false} = options;
  const multiValues = values.length > 1;
  // TODO: refactor weird ternary logic
  const EXPRESSION = `${field}${multiValues ? 
    ' IN (' 
    : '='}${values.map(value => '\''+value+'\'').join()}${multiValues 
    ? ')' 
    : ''}`;
  const params = {
    ...COMMON_REQUEST_PARAMETERS,
    REQUEST: 'GetPrintAtlas',
    EXP_FILTER: EXPRESSION,
    TEMPLATE: template,
    filtertoken: ApplicationState.tokens.filtertoken
  };
  if (download) params.DOWNLOAD = 1;
  return params;
};

const getParamsFromOptions = function(layers=[], options={}) {
  const { rotation, dpi, format, crs, template, maps=[], labels=[], is_maps_preset_theme} = options;
  const LAYERS = layers.map(layer => layer.getPrintLayerName()).join();
  const STYLES = layers.map(layer => layer.getStyle()).join(',');
  const params = {
    ...COMMON_REQUEST_PARAMETERS,
    REQUEST: 'GetPrint',
    TEMPLATE: template,
    DPI: dpi,
    STYLES,
    FORMAT: format,
    CRS: crs,
    filtertoken: ApplicationState.tokens.filtertoken
  };

  if (!is_maps_preset_theme) params.LAYERS = LAYERS;
  maps.forEach(({name, scale, extent, preset_theme}) => {
    params[name + ':SCALE'] = scale;
    params[name + ':EXTENT'] = extent;
    params[name + ':ROTATION'] = rotation;
    if (is_maps_preset_theme &&  preset_theme === undefined) params[name + ':LAYERS'] = LAYERS;
  });

  labels.forEach(label => params[label.id] = label.text);
  return params;
};

const GET = function({url, params, mime_type}) {
  return new Promise((resolve, reject) => {
    url = `${url}?${convertObjectToUrlParams(params)}`;
    resolve({
      url,
      layers: true,
      mime_type
    });
  })
};

const POST = function({url, params, mime_type}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.responseType = 'blob';
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          window.URL = window.URL || window.webkitURL;
          const url = window.URL.createObjectURL(xhr.response);
          resolve({
            url,
            layers: true,
            mime_type
          });
        } catch (e) {
          reject(e)
        }
      } else if(xhr.status === 500) {
        reject()
      }
    };
    xhr.onerror = function () {
      reject()
    };
    xhr.send(convertObjectToUrlParams(params))
  })
};

/**
 * core/print/providers/qgis::PrinterQGISProvider@v3.4
 */
function PrintService(options = {}) {
  this._currentLayerStore =  ProjectsRegistry.getCurrentProject().getLayersStore();
  ProjectsRegistry.onbefore('setCurrentProject', project=> this._currentLayerStore = project.getLayersStore());
  base(this);
}

inherit(PrintService, G3WObject);

const proto = PrintService.prototype;

proto.POST = POST;

proto.GET = GET;

proto._getAtlasParamsFromOptions = getAtlasParamsFromOptions;

proto._getParamsFromOptions = getParamsFromOptions;

proto.getUrl = function(){
  return this._currentLayerStore.getWmsUrl();
};

proto.printAtlas = function(options={}, method='GET'){
  const url = this.getUrl();
  const params = this._getAtlasParamsFromOptions(options);
  return this[method]({
    url,
    params,
    mime_type: OUTPUT_FORMATS.pdf
  })
};

proto.print = function(options={}, method="GET") {
  const url = this.getUrl();
  // reverse of layer because the order is important
  const layers = this._currentLayerStore.getLayers({
    PRINTABLE: {
      scale: options.scale
    },
    SERVERTYPE: 'QGIS'
  }).reverse();
  if (layers.length) {
    options.crs = this._currentLayerStore.getProjection().getCode();
    const params = this._getParamsFromOptions(layers, options);
    const mime_type = OUTPUT_FORMATS[params.FORMAT];
    return this[method]({
      url,
      params,
      mime_type
    })
  } else return Promise.resolve({layers: false})
};

module.exports = PrintService;
