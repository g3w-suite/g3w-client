// class Filter to build filter
// useful by provider providers to get data
class Filter {

  constructor(config = {}) {
    this._filter = null;
    this._type = null;
    this.config = config;
  }

  getConfig() {
    return this.config;
  }

  setConfig(config = {}) {
    this.config = config;
  };

  mergeConfig(config={}) {
    this.config = {...this.config, ...config};
  }

  getAll() {
    this._type = Filter.TYPES.all;
    this._filter = null
  };

  // to create complex filter
  setExpression(expression) {
    this._type = Filter.TYPES.expression;
    this._filter = expression;
    return this;
  }

  setGeometry(geometry) {
    this._type = Filter.TYPES.geometry;
    this._filter = geometry;
    return this;
  }

  setBBOX(bbox) {
    this._type = Filter.TYPES.bbox;
    this._filter = bbox;
    return this;
  };

  setFids(ids) {
    this._type = Filter.TYPES.fids;
    this._filter = ids;
    return this;
  }

  serialize() {
    return JSON.stringify(this);
  }

  // get filter value
  get() {
    return this._filter;
  };

  getType() {
    return this._type;
  }

  clear() {
    this._filter = null;
  }

}

Filter.TYPES = {
  bbox: 'bbox',
  geometry: 'geometry',
  expression: 'expression',
  fids: 'fids',
  all: 'all'
};

module.exports = Filter;
