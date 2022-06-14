import Feature  from 'core/layers/features/feature';
class TableParser {
  constructor() {}
  get(options={}) {
    const type = options.type;
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

  _parserJSON(data={}) {
    const {features=[]} = data;
    return features.map(_feature => {
      const {id, properties} = _feature;
      const feature = new Feature();
      feature.setProperties(properties);
      feature.setId(id);
      return feature;
    });
  }
}

export default new TableParser();

