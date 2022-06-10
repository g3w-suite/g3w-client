import ApplicationState from 'core/applicationstate';
import {QUERY_POINT_TOLERANCE} from '../../../constant';
import utils from 'core/utils/utils';
import geoutils  from 'g3w-ol/src/utils/utils';
import Provider  from 'core/layers/providers/provider';
import {Polygon, Circle} from "ol/geom";
import {WKT} from "ol/format";

const GETFEATUREINFO_IMAGE_SIZE = [101, 101];
const DPI = geoutils.getDPI();

class WMSDataProvider extends Provider{
  constructor(options = {}) {
    super(options);
    this._name = 'wms';
    this._projections = {
      map: null,
      layer: null
    };
  }

  _getRequestParameters({layers, feature_count, coordinates, infoFormat, query_point_tolerance=QUERY_POINT_TOLERANCE, resolution, size}) {
    const layerNames = layers ? layers.map(layer => layer.getWMSInfoLayerName()).join(',') : this._layer.getWMSInfoLayerName();
    const extent = geoutils.getExtentForViewAndSize(coordinates, resolution, 0, size);
    const x = Math.floor((coordinates[0] - extent[0]) / resolution);
    const y = Math.floor((extent[3] - coordinates[1]) / resolution);
    let PARAMS_TOLERANCE = {};
    const {unit, value} = query_point_tolerance;
    if (unit === 'map') {
      const bufferGeometry = Polygon.fromCircle(new Circle(coordinates, value));
      const wkGeometry = new WKT();
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
    };
    if (!('STYLES' in params)) params['STYLES'] = '';
    const bbox = this._projections.map.getAxisOrientation().substr(0, 2) === 'ne' ? [extent[1], extent[0], extent[3], extent[2]] : extent;
    params['BBOX'] = bbox.join(',');
    return params;
  };

  query(options={}) {
    const d = $.Deferred();
    const infoFormat = this._layer.getInfoFormat() || 'application/vnd.ogc.gml';
    const layerProjection = this._layer.getProjection();
    this._projections.map = this._layer.getMapProjection() || layerProjection;
    const {layers=[this._layer], feature_count=10, size=GETFEATUREINFO_IMAGE_SIZE, coordinates=[], resolution, query_point_tolerance} = options;
    const layer = layers[0];
    let url = layer.getQueryUrl();
    const METHOD = layer.isExternalWMS() || !/^\/ows/.test(url) ? 'GET' : layer.getOwsMethod();
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

  GET({url, params}={}) {
    let sourceParam = url.split('SOURCE');
    if (sourceParam.length) {
      url = sourceParam[0];
      if (sourceParam.length > 1) sourceParam = '&SOURCE' + sourceParam[1];
      else sourceParam = '';
    }
    url = utils.appendParams(url, params);
    url = `${url}${sourceParam && sourceParam}`;
    return utils.XHR.get({
      url
    })
  };

  POST({url, params}={}) {
    return utils.XHR.post({
      url,
      data: params
    })
  };

}




export default  WMSDataProvider;
