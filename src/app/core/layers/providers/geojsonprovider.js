import Provider from 'core/layers/providers/provider';
import { GeoJSON } from 'ol/format';

class GEOJSONDataProvider extends Provider {
  constructor(options = {}) {
    super(options);
    this._name = 'geojson';
    this.provider = options.provider;
  }

  query(options = {}) {
    const d = $.Deferred();
    d.resolve([]);
    return d.promise();
  }

  getFeatures(options = {}) {
    const d = $.Deferred();
    const url = options.url || this.getLayer().get('source').url;
    const { data } = options;
    const projection = options.projection || 'EPSG:4326';
    const { mapProjection } = options;
    const parseFeatures = (data) => {
      const parser = new GeoJSON();
      return parser.readFeatures(data, {
        featureProjection: mapProjection,
        // defaultDataProjection: projection // ol v. 4.5
        dataProjection: projection,
      });
    };
    if (data) {
      const features = parseFeatures(data);
      d.resolve(features);
    } else {
      $.get({ url })
        .then((response) => {
          const features = parseFeatures(response.results);
          d.resolve(features);
        })
        .fail((err) => {
          d.reject(err);
        });
    }
    return d.promise();
  }

  getDataTable({ page } = {}) {
    const d = $.Deferred();
    this.getFeatures()
      .then(() => {
        d.resolve(this._features);
      })
      .fail((err) => {
        d.reject(err);
      });
    return d.promise();
  }

  digestFeaturesForTable() {
    return {
      headers: [],
      features: [],
    };
  }
}

export default GEOJSONDataProvider;
