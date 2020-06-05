const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const Provider = require('core/layers/providers/provider');

function GEOJSONDataProvider(options = {}) {
  base(this, options);
  this._name = 'geojson';
  this.provider = options.provider
}

inherit(GEOJSONDataProvider, Provider);

const proto = GEOJSONDataProvider.prototype;

proto.query = function(options = {}) {
  const d = $.Deferred();
  d.resolve([]);
  return d.promise();
};

proto.getFeatures = function(options = {}) {
  const d = $.Deferred();
  const url = options.url || this.getLayer().get('source').url;
  const data = options.data;
  const projection = options.projection || "EPSG:4326";
  const mapProjection = options.mapProjection;
  const parseFeatures = (data) => {
    const parser = new ol.format.GeoJSON();
    return parser.readFeatures(data, {
      featureProjection: mapProjection,
      defaultDataProjection: projection
    });
  };
  if (data) {
    const features = parseFeatures(data);
    d.resolve(features)
  } else {
    $.get({url})
      .then((response) => {
        const features = parseFeatures(response.results);
        d.resolve(features)
      })
      .fail((err) => {
        d.reject(err)
      });
  }
  return d.promise()
};

proto.getDataTable = function({ page } = {}) {
  const d = $.Deferred();
  this.getFeatures()
    .then(() => {
      d.resolve(this._features)
    })
    .fail((err) => {
      d.reject(err)
    });
  return d.promise();
};

proto.digestFeaturesForTable = function() {
  return {
    headers : [],
    features: []
  }

};


module.exports = GEOJSONDataProvider;

