const { base, inherit } = require('core/utils/utils');
const DataProvider = require('core/layers/providers/provider');
const Filter = require('core/layers/filter/filter');

function WFSDataProvider(options={}) {
  base(this, options);
  this._name = 'wfs';
}

inherit(WFSDataProvider, DataProvider);

const proto = WFSDataProvider.prototype;

proto.getData = function() {
  const d = $.Deferred();
  return d.promise();
};

// query method
proto.query = function(options={}, params = {}) {
  const {reproject=false, feature_count=10, filter} = options;
  params.MAXFEATURES = feature_count;
  const d = $.Deferred();
  const layers = options.layers;
  this._doRequest(filter, params, layers, reproject)
    .then(response => {
      const projections = {
        map: this._layer.getMapProjection(),
        layer: reproject ? this._layer.getProjection(): null
      };
      const featuresForLayers = this.handleQueryResponseFromServer(response, projections, layers, wms=false);
      d.resolve({
        data: featuresForLayers
      });
    })
    .fail(e => d.reject(e));
  return d.promise();
};

proto._post = function(url, params) {
  url = url.match(/\/$/) ? url : `${url}/`;
  const d = $.Deferred();
  $.post(url, params)
    .then(response => d.resolve(response))
    .fail(err => d.reject(err));
  return d.promise();
};

// get request
proto._get = function(url, params) {
  // trasform parameters
  url = url.match(/\/$/) ? url : `${url}/`;
  const d = $.Deferred();
  const urlParams = $.param(params);
  url = url + '?' + urlParams;
  $.get(url)
    .then(response => d.resolve(response))
    .fail(err => d.reject(err));
  return d.promise();
};

//request to server
proto._doRequest = function(filter, params = {}, layers, reproject=true) {
  const d = $.Deferred();
  filter = filter || new Filter({});
  const layer = layers ? layers[0]: this._layer;
  const httpMethod = layer.getOwsMethod();
  const url = layer.getQueryUrl();
  const infoFormat = layer.getInfoFormat();
  const layerNames = layers ? layers.map(layer => layer.getWFSLayerName()).join(','): layer.getWFSLayerName();
  const SRSNAME = reproject ? layer.getProjection().getCode() : this._layer.getMapProjection().getCode();
  params = Object.assign(params, {
    SERVICE: 'WFS',
    VERSION: '1.1.0',
    REQUEST: 'GetFeature',
    TYPENAME: layerNames,
    OUTPUTFORMAT: infoFormat,
    SRSNAME
  });
  if (filter) {
    const filterType = filter.getType();
    const filterConfig = filter.getConfig();
    let featureRequest;
    // get filter from ol
    const f = ol.format.filter;
    /////
    filter = filter.get();
    switch (filterType) {
      case 'bbox':
        featureRequest = new ol.format.WFS().writeGetFeature({
          featureTypes: [layer],
          filter: f.bbox('the_geom', filter)
        });
        break;
      case 'geometry':
        const {spatialMethod = 'intersects'} = filterConfig;
        featureRequest = new ol.format.WFS().writeGetFeature({
          featureTypes: [layer],
          filter: f[spatialMethod]('the_geom', filter)
        });
        break;
      case 'expression':
        featureRequest = new ol.format.WFS().writeGetFeature({
          featureTypes: [layer],
          filter: null
        });
        break;
      case 'all':
        request = this._post(url, params);
        return request;
      default:
        break;
    }
    params.FILTER = `(${featureRequest.children[0].innerHTML})`.repeat(layers ? layers.length : 1);
    const queryPromise = httpMethod === 'GET' && filterType !== 'geometry' ? this._get(url, params) : this._post(url, params);
    queryPromise.then(response => {
        d.resolve(response)
      }).fail(err => {
        if (err.status === 200) d.resolve(err.responseText);
        else d.reject(err)
      })
  } else d.reject();

  return d.promise()
};


module.exports = WFSDataProvider;
