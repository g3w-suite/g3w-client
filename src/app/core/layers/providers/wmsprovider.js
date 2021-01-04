const {base, inherit, appendParams, XHR} = require('core/utils/utils');
const geoutils = require('g3w-ol/src/utils/utils');
const DataProvider = require('core/layers/providers/provider');

//overwrite method to read feature
// da un geojson
const PIXEL_TOLERANCE = 10;
const GETFEATUREINFO_IMAGE_SIZE = [101, 101];
const DPI = geoutils.getDPI();

function WMSDataProvider(options = {}) {
  base(this, options);
  this._name = 'wms';
  this._projections = {
    map: null,
    layer: null
  };
  this._infoFormat = this._layer.getInfoFormat() || 'application/vnd.ogc.gml';
}

inherit(WMSDataProvider, DataProvider);

const proto = WMSDataProvider.prototype;

proto._getRequestParameters = function({layers, feature_count, coordinates, resolution, size}) {
  const layerNames = layers ? layers.map(layer => layer.getWMSInfoLayerName()).join(',') : this._layer.getWMSInfoLayerName();
  const filtertokens = layers ? layers.map(layer => layer.getFilterToken()).join(',') : this._layer.getFilterToken();
  const extent = geoutils.getExtentForViewAndSize(coordinates, resolution, 0, size);
  const x = Math.floor((coordinates[0] - extent[0]) / resolution);
  const y = Math.floor((extent[3] - coordinates[1]) / resolution);
  const params = {
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetFeatureInfo',
    CRS: this._projections.map.getCode(),
    LAYERS: layerNames,
    QUERY_LAYERS: layerNames,
    filtertokens,
    INFO_FORMAT: this._infoFormat,
    FEATURE_COUNT: feature_count,
    // TOLLERANCE PARAMETERS FOR QGIS
    FI_POINT_TOLERANCE: PIXEL_TOLERANCE,
    FI_LINE_TOLERANCE: PIXEL_TOLERANCE,
    FI_POLYGON_TOLERANCE: PIXEL_TOLERANCE,
    G3W_TOLERANCE: PIXEL_TOLERANCE * resolution,
    WITH_GEOMETRY:1,
    I: x,
    J: y,
    DPI,
    WIDTH: size[0],
    HEIGHT: size[1],
  };
  if (!('STYLES' in params)) params['STYLES'] = '';
  const bbox = this._projections.map.getAxisOrientation().substr(0, 2) === 'ne' ? [extent[1], extent[0], extent[3], extent[2]] : extent;
  params['BBOX'] = bbox.join(',');
  return params;
};

proto.query = function(options={}) {
  const d = $.Deferred();
  const size = options.size || GETFEATUREINFO_IMAGE_SIZE;
  const feature_count = options.feature_count || 10;
  const layerProjection = this._layer.getProjection();
  this._projections.map = this._layer.getMapProjection() || layerProjection;
  const coordinates = options.coordinates || [];
  const resolution = options.resolution || null;
  const layers = options.layers;
  const layer = layers ? layers[0] : this._layer;
  let url = layer.getQueryUrl();
  const METHOD = layer.isExternalWMS() || !/^\/ows/.test(url) ? 'GET' : layer.getOwsMethod();
  const params = this._getRequestParameters({layers, feature_count, coordinates, resolution, size});
  this[METHOD]({url, layers, params })
    .then(response => {
      const data = this.handleQueryResponseFromServer(response, this._projections, layers);
      d.resolve({
        data,
        query: {
          coordinates,
          resolution
        }
      });
    })
    .catch(err => d.reject(err));
  return d.promise();
};

proto.GET = function({url, params}) {
  let sourceParam = url.split('SOURCE');
  if (sourceParam.length) {
    url = sourceParam[0];
    if (sourceParam.length > 1) sourceParam = '&SOURCE' + sourceParam[1];
    else sourceParam = '';
  }
  url = appendParams(url, params);
  url = `${url}${sourceParam && sourceParam}`;
  return XHR.get({
    url
  })
};

proto.POST = function({url, params}) {
  return XHR.post({
    url,
    data: params
  })
};

module.exports = WMSDataProvider;
