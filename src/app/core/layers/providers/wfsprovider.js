import Provider from 'core/layers/providers/provider';
import Filter from 'core/layers/filter/filter';
import {filter as olfilter, WFS} from 'ol/format'

class WFSDataProvider  extends Provider {
  constructor(options={}) {
    super();
    this._name = 'wfs';
  }

// query method
  query(options={}, params = {}) {
    const {reproject=false, feature_count=10, filter} = options;
    params.MAXFEATURES = feature_count;
    const d = $.Deferred();
    const {layers=[this._layer]} = options;

    const projections = {
      map: this._layer.getMapProjection(),
      layer: reproject ? this._layer.getProjection(): null
    };

    const timeoutKey = this.getQueryResponseTimeoutKey({
      layers,
      resolve: d.resolve,
      query:{}
    });

    this._doRequest(filter, params, layers, reproject)
      .then(response => {
        const featuresForLayers = this.handleQueryResponseFromServer(response, projections, layers, false);
        featuresForLayers.forEach(featuresForLayer => {
          const {features=[]} = featuresForLayer;
          //sanitize in case of nil:true
          features.forEach(feature => {
            Object.entries(feature.getProperties()).forEach(([attribute, value])=>{
              if (toRawType(value) === 'Object' && value['xsi:nil'])feature.set(attribute, 'NULL');
            })
          })
        });
        d.resolve({
          data: featuresForLayers
        });
      })
      .fail(e => d.reject(e))
      .always(()=> {
        clearTimeout(timeoutKey)
      });
    return d.promise();
  };

  _post(url, params) {
    url = url.match(/\/$/) ? url : `${url}/`;
    const d = $.Deferred();
    $.post(url, params)
      .then(response => d.resolve(response))
      .fail(err => d.reject(err));
    return d.promise();
  };

// get request
  _get(url, params) {
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
  _doRequest(filter, params = {}, layers, reproject=true) {
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
      const f = olfilter;
      /////
      filter = filter.get();
      switch (filterType) {
        case 'bbox':
          featureRequest = new WFS().writeGetFeature({
            featureTypes: [layer],
            filter: f.bbox('the_geom', filter)
          });
          break;
        case 'geometry':
          //speatial methos. <inteserct, within>
          const {spatialMethod = 'intersects'} = filterConfig;
          featureRequest = new WFS().writeGetFeature({
            featureTypes: [layer],
            filter: f[spatialMethod]('the_geom', filter)
          });
          break;
        case 'expression':
          featureRequest = new WFS().writeGetFeature({
            featureTypes: [layer],
            filter: null
          });
          break;
        case 'all':
          const request = this._post(url, params);
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
}

export default WFSDataProvider;
