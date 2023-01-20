const { inherit, base, XHR } = require('core/utils/utils');
const Provider = require('core/layers/providers/provider');

function GEOJSONDataProvider(options = {}) {
  base(this, options);
  this._name = 'geojson';
  this.provider = options.provider
}

inherit(GEOJSONDataProvider, Provider);

const proto = GEOJSONDataProvider.prototype;

proto.query = function(options = {}) {
  return new Promise((resolve, reject) => {
    resolve([]);
  })
};

proto.getFeatures = function(options = {}) {
  return new Promise((resolve, reject) => {
    const url = options.url || this.getLayer().get('source').url;
    const data = options.data;
    const projection = options.projection || "EPSG:4326";
    const mapProjection = options.mapProjection;
    const parseFeatures = data => {
      const parser = new ol.format.GeoJSON();
      return parser.readFeatures(data, {
        featureProjection: mapProjection,
        //defaultDataProjection: projection // ol v. 4.5
        dataProjection: projection
      });
    };
    if (data) {
      const features = parseFeatures(data);
      resolve(features)
    } else {
      XHR.get({url})
        .then((response) => {
          const features = parseFeatures(response.results);
          resolve(features)
        })
        .catch(err => reject(err));
    }
  })
};

proto.getDataTable = function({ page } = {}) {
  return new Promise((resolve, reject) => {
    this.getFeatures()
      .then(() => {
        resolve(this._features)
      })
      .catch(err => reject(err));
  })
};

proto.digestFeaturesForTable = function() {
  return {
    headers : [],
    features: []
  }
};

module.exports = GEOJSONDataProvider;

