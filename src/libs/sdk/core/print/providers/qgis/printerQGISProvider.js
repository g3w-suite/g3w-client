const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const convertObjectToUrlParams = require('core/utils/utils').convertObjectToUrlParams;
const PrintProvider = require('../printerprovider');
const ProjectsRegistry = require('core/project/projectsregistry');

function PrinterQGISProvider() {
  base(this);
}

inherit(PrinterQGISProvider, PrintProvider);

const proto = PrinterQGISProvider.prototype;

proto.POST = function({url, params, mime_type}) {
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

proto.GET = function({url, params, mime_type}) {
  return new Promise((resolve, reject) => {
    url = `${url}?${convertObjectToUrlParams(params)}`;
    resolve({
      url,
      layers: true,
      mime_type
    });
  })
};

proto._getParamsFromOptions = function(layers, options) {
  const templateMap = options.map || 'map0';
  layers = layers.map((layer) => {
    return layer.getPrintLayerName()
  });
  const params = {
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetPrint',
    TEMPLATE: options.template,
    DPI: options.dpi,
    FORMAT: options.format,
    CRS: options.crs,
    LAYERS: layers.join()
  };
  params[templateMap + ':SCALE'] = options.scale;
  params[templateMap + ':EXTENT'] = options.extent;
  params[templateMap + ':ROTATION'] = options.rotation;
  return params;
};

proto.print = function(options={}, method="GET") {
  const layersStore = ProjectsRegistry.getCurrentProject().getLayersStore();
  let url = layersStore.getWmsUrl();
  // reverse of layer because the order is important
  let layers = _.reverse(layersStore.getLayers({
    PRINTABLE: {
      scale: options.scale
    },
    SERVERTYPE: 'QGIS'
  }));
  if (layers.length) {
    options.crs = layersStore.getProjection().getCode();
    const params = this._getParamsFromOptions(layers, options);
    const formats = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg'
    };
    const mime_type = formats[params.FORMAT];
    return this[method]({
      url,
      params,
      mime_type
    })
  } else
    return Promise.resolve({
      layers: !!layers.length
    })

};


module.exports = PrinterQGISProvider;


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
