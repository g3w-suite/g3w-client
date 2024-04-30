import ApplicationState from 'core/applicationstate';
import {QUERY_POINT_TOLERANCE} from 'constant';
const {base, inherit, appendParams, XHR} = require('core/utils/utils');
const {get_LEGEND_ON_LEGEND_OFF_Params} = require('core/utils/geo');
const geoutils = require('core/utils/ol');
const DataProvider = require('core/layers/providers/provider');

//overwrite method to read feature
// da un geojson
const GETFEATUREINFO_IMAGE_SIZE = [101, 101];
const DPI = geoutils.getDPI();

function WMSDataProvider(options = {}) {
  base(this, options);
  this._name = 'wms';
  this._projections = {
    map: null,
    layer: null
  };
}

inherit(WMSDataProvider, DataProvider);

const proto = WMSDataProvider.prototype;

proto._getRequestParameters = function({layers, feature_count, coordinates, infoFormat, query_point_tolerance=QUERY_POINT_TOLERANCE, resolution, size}) {
  const layerNames = layers ? layers.map(layer => layer.getWMSInfoLayerName()).join(',') : this._layer.getWMSInfoLayerName();
  const extent = geoutils.getExtentForViewAndSize(coordinates, resolution, 0, size);
  const x = Math.floor((coordinates[0] - extent[0]) / resolution);
  const y = Math.floor((extent[3] - coordinates[1]) / resolution);
  let PARAMS_TOLERANCE = {};
  const {unit, value} = query_point_tolerance;
  if (unit === 'map') {
    const bufferGeometry = ol.geom.Polygon.fromCircle(new ol.geom.Circle(coordinates, value));
    const wkGeometry = new ol.format.WKT();
    PARAMS_TOLERANCE = {
      FILTER_GEOM: wkGeometry.writeGeometry(bufferGeometry)
    };
  } else {
    PARAMS_TOLERANCE = {
      FI_POINT_TOLERANCE: value,
      FI_LINE_TOLERANCE: value,
      FI_POLYGON_TOLERANCE: value,
      G3W_TOLERANCE: value * resolution,
      I: x,
      J: y,
    }
  }
  /**
   * Add LEGEND_ON and/or LEGEND_OFF in case of layer that has categories
   * It used to solve issue related to GetFeatureInfo feature layer categories
   * that are unchecked (not visisble) at QGIS project setting
   */
  const LEGEND_PARAMS = {
    LEGEND_ON: [],
    LEGEND_OFF: []
  };
  layers.forEach(layer => {
    if (layer.getCategories()){
      const {LEGEND_ON, LEGEND_OFF} = get_LEGEND_ON_LEGEND_OFF_Params(layer);
      LEGEND_ON && LEGEND_PARAMS.LEGEND_ON.push(LEGEND_ON);
      LEGEND_OFF && LEGEND_PARAMS.LEGEND_OFF.push(LEGEND_OFF);
    }
  });

  const params = {
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetFeatureInfo',
    CRS: this._projections.map.getCode(),
    LAYERS: layerNames,
    QUERY_LAYERS: layerNames,
    filtertoken: ApplicationState.tokens.filtertoken,
    INFO_FORMAT: infoFormat,
    FEATURE_COUNT: feature_count,
    WITH_GEOMETRY: true,
    DPI,
    ...PARAMS_TOLERANCE,
    WIDTH: size[0],
    HEIGHT: size[1],
    //LEGEND_ON / LEGEND_OFF parameter
    LEGEND_ON: LEGEND_PARAMS.LEGEND_ON.length ? LEGEND_PARAMS.LEGEND_ON.join(';'): undefined,
    LEGEND_OFF: LEGEND_PARAMS.LEGEND_OFF.length ? LEGEND_PARAMS.LEGEND_OFF.join(';'): undefined,
  };
  if (!('STYLES' in params)) params['STYLES'] = '';
  const bbox = this._projections.map.getAxisOrientation().substr(0, 2) === 'ne' ? [extent[1], extent[0], extent[3], extent[2]] : extent;
  params['BBOX'] = bbox.join(',');
  return params;
};

proto.query = function(options={}) {
  const d = $.Deferred();
  const infoFormat = this._layer.getInfoFormat() || 'application/vnd.ogc.gml';
  const layerProjection = this._layer.getProjection();
  this._projections.map = this._layer.getMapProjection() || layerProjection;
  const {layers=[this._layer], feature_count=10, size=GETFEATUREINFO_IMAGE_SIZE, coordinates=[], resolution, query_point_tolerance} = options;
  const layer = layers[0];
  let url = layer.getQueryUrl();
  //check if query url start with ows.
  //check if baseurl is set or not equal to / (default value) and get url pathname
  const METHOD = layer.isExternalWMS() || !/^\/ows/.test((new URL(url, (!window.initConfig.baseurl || '/' === window.initConfig.baseurl) ? window.location.origin : window.initConfig.baseurl)).pathname)
    ? 'GET'
    : layer.getOwsMethod();
  const params = this._getRequestParameters({layers, feature_count, coordinates, infoFormat, query_point_tolerance, resolution, size});
  const query = {
    coordinates,
    resolution
  };
  const timeoutKey = this.getQueryResponseTimeoutKey({
    layers,
    resolve: d.resolve,
    query
  });

  if (layer.useProxy()) {
    layer.getDataProxyFromServer('wms', {
        url,
        params,
        method: METHOD,
        headers: {
          'Content-Type': infoFormat
        }
      }).then(response =>{
        const data = this.handleQueryResponseFromServer(response, this._projections, layers);
        d.resolve({
          data,
          query
        })
    })
  } else this[METHOD]({url, layers, params})
    .then(response => {
      const data = this.handleQueryResponseFromServer(response, this._projections, layers);
      d.resolve({
        data,
        query
      });
    })
    .catch(err => d.reject(err))
    .finally(()=> clearTimeout(timeoutKey));
  return d.promise();
};

proto.GET = function({url, params}={}) {
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

proto.POST = function({url, params}={}) {
  return XHR.post({
    url,
    data: params
  })
};

module.exports = WMSDataProvider;
