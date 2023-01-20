const { base, inherit, toRawType, XHR } = require('core/utils/utils');
const DataProvider = require('core/layers/providers/provider');
const Filter = require('core/layers/filter/filter');

function WFSDataProvider(options={}) {
  base(this, options);
  this._name = 'wfs';
}

inherit(WFSDataProvider, DataProvider);

const proto = WFSDataProvider.prototype;

proto.getData = function() {
  return new Promise((resolve, reject) => {})
};

// query method
proto.query = function(options={}, params = {}) {
  const {reproject=false, feature_count=10, filter} = options;
  params.MAXFEATURES = feature_count;
  return new Promise((resolve, reject) => {
    const {layers=[this._layer]} = options;

    const projections = {
      map: this._layer.getMapProjection(),
      layer: reproject ? this._layer.getProjection(): null
    };

    const timeoutKey = this.getQueryResponseTimeoutKey({
      layers,
      resolve: resolve,
      query:{}
    });

    this._doRequest(filter, params, layers, reproject)
      .then(response => {
        const featuresForLayers = this.handleQueryResponseFromServer(response, projections, layers, wms=false);
        featuresForLayers.forEach(featuresForLayer => {
          const {features=[]} = featuresForLayer;
          //sanitize in case of nil:true
          features.forEach(feature => {
            Object.entries(feature.getProperties()).forEach(([attribute, value])=>{
              if (toRawType(value) === 'Object' && value['xsi:nil'])feature.set(attribute, 'NULL');
            })
          })
        });
        resolve({
          data: featuresForLayers
        });
      })
      .catch(e => reject(e))
      .finally(()=> {
        clearTimeout(timeoutKey)
      });
  })
};

proto._post = function(url, params) {
  url = url.match(/\/$/) ? url : `${url}/`;
  return new Promise((resolve, reject) => {
    XHR.post({
      url,
      data:params
    }).then(response => resolve(response))
      .catch(err => reject(err));
  })
};

// get request
proto._get = function(url, params) {
  // transform parameters
  url = url.match(/\/$/) ? url : `${url}/`;
  return new Promise((resolve, reject) => {
    const urlParams = $.param(params);
    url = url + '?' + urlParams;
    XHR.get({url})
      .then(response => resolve(response))
      .catch(err => reject(err));
  })
};

//request to server
proto._doRequest = function(filter, params = {}, layers, reproject=true) {
  return new Promise((resolve, reject) => {
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
          //speatial methos. <inteserct, within>
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
        resolve(response)
      }).catch(err => {
        if (err.status === 200) resolve(err.responseText);
        else reject(err)
      })
    } else reject();
  })
};


module.exports = WFSDataProvider;
