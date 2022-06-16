export default class Filter {
  // class attributes
  static TYPES = {
    bbox: 'bbox',
    geometry: 'geometry',
    expression: 'expression',
    fids: 'fids',
    all: 'all',
  };

  constructor(config = {}) {
    this._filter = null;
    this._type = null;
    this.config = config;
  }
  /**
   * Config methods
   */

  getConfig() {
    return this.config;
  }

  setConfig(config = {}) {
    this.config = config;
  }

  mergeConfig(config = {}) {
    this.config = { ...this.config, ...config };
  }

  /** *
   *  end config methods
   */

  getAll() {
    this._type = Filter.TYPES.all;
    this._filter = null;
  }

  // to create complex filter
  setExpression(expression) {
    this._type = Filter.TYPES.expression;
    this._filter = expression;
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
  }

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
  }

  getType() {
    return this._type;
  }

  clear() {
    this._filter = null;
  }
}
