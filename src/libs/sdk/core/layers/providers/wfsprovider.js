const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const DataProvider = require('core/layers/providers/provider');
const Filter = require('core/layers/filter/filter');

function WFSDataProvider(options={}) {
  base(this, options);
  this._name = 'wfs';
  this._layerName = this._getTypeName(this._layer.getQueryLayerName())
}

inherit(WFSDataProvider, DataProvider);

const proto = WFSDataProvider.prototype;

proto._getTypeName = function(layerQueryName) {
  return layerQueryName.replace(/[/\s]/g, '_') ;
};

proto.getData = function() {
  const d = $.Deferred();
  return d.promise();
};

// query method
proto.query = function(options={}, params = {}) {
  const feature_count = options.feature_count || 10;
  params.MAXFEATURES = feature_count;
  const filter = options.filter;
  const d = $.Deferred();
  const layers = options.layers;
  this._doRequest(filter, params, layers)
    .then((response) => {
      const projections = {
        map: this._layer.getMapProjection(),
        layer: this._layer.getProjection()
      };
      const featuresForLayers = this.handleQueryResponseFromServer(response, projections, layers, wms=false);
      d.resolve({
        data: featuresForLayers
      });
    })
    .fail((e) => {
      d.reject(e);
    });
  return d.promise();
};

proto._post = function(url, params) {
  url = url.match(/\/$/) ? url : `${url}/`;
  const d = $.Deferred();
  $.post(url, params).then((response) => {
      d.resolve(response);
    })
    .fail((err) => {
      d.reject(err);
    });
  return d.promise();
};

// get request
proto._get = function(url, params) {
  // trasform parameters
  url = url.match(/\/$/) ? url : `${url}/`;
  const d = $.Deferred();
  const urlParams = $.param(params);
  url = url + '?' + urlParams;
  $.get(url).then((response) => {
    d.resolve(response);
  }).fail((err) => {
    d.reject(err);
  });
  return d.promise();
};

//request to server
proto._doRequest = function(filter, params = {}, layers) {
  const d = $.Deferred();
  filter = filter || new Filter();
  const layer = layers ? layers[0]: this._layer;
  const httpMethod = layer.getOwsMethod();
  const url = layer.getQueryUrl();
  const infoFormat = layer.getInfoFormat();
  const layerNames = layers ? layers.map(layer => this._getTypeName(layer.getQueryLayerName())).join(','): this._layerName;
  params = Object.assign(params, {
    SERVICE: 'WFS',
    VERSION: '1.3.0',
    REQUEST: 'GetFeature',
    TYPENAME: layerNames,
    OUTPUTFORMAT: infoFormat,
    SRSNAME: layer.getProjection().getCode()
  });
  if (filter) {
    const filterType = filter.getType();
    let featureRequest;
    const f = ol.format.filter;
    filter = filter.get();
    switch (filterType) {
      case 'bbox':
        featureRequest = new ol.format.WFS().writeGetFeature({
          featureTypes: [layer],
          filter: f.bbox('the_geom', filter)
        });
        break;
      case 'geometry':
        featureRequest = new ol.format.WFS().writeGetFeature({
          featureTypes: [layer],
          filter: f.intersects('the_geom', filter)
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
    params.FILTER = featureRequest.children[0].innerHTML;
    const queryPromise = httpMethod === 'GET' ? this._get(url, params) : this._post(url, params);
    queryPromise.then((response) => {
        d.resolve(response)
      }).fail((err) => {
        if (err.status === 200)
          d.resolve(err.responseText);
        else
          d.reject(err)
      })
  } else {
    d.reject()
  }
  return d.promise()
};


module.exports = WFSDataProvider;
