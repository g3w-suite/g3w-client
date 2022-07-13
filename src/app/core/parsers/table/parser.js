const Feature = require('core/layers/features/feature');

const TableParser = function () {
  this.get = function (options = {}) {
    const { type } = options;
    let parser;
    switch (type) {
      case 'json':
        parser = this._parserJSON.bind(this);
        break;
      default:
        parser = this._parserJSON.bind(this);
    }
    return parser;
  };

  this._parserJSON = function (data = {}) {
    const { features = [] } = data;
    return features.map((_feature) => {
      const { id, properties } = _feature;
      const feature = new Feature();
      feature.setProperties(properties);
      feature.setId(id);
      return feature;
    });
  };
};

module.exports = new TableParser();
