// class Filter to build filter
// useful by provider providers to get data
function Filter() {
  this._filter = null;
  this._type = null;
}

const proto = Filter.prototype;

proto.getAll = function() {
  this._type = Filter.TYPES.all;
  this._filter = null
};

// to create complex filter
proto.setExpression = function(expression) {
  this._type = Filter.TYPES.expression;
  this._filter = expression;
};

proto.setGeometry = function(geometry) {
  this._type = Filter.TYPES.geometry;
  this._filter = geometry;
  return this;
};

proto.setBBOX = function(bbox) {
  this._type = Filter.TYPES.bbox;
  this._filter = bbox;
  return this;
};

proto.setFids = function(ids) {
  this._type = Filter.TYPES.fids;
  this._filter = ids;
  return this;
};

proto.serialize = function() {
  return JSON.stringify(this);
};

// get filter value
proto.get = function() {
  return this._filter;
};

proto.getType = function() {
  return this._type;
};

proto.clear = function() {
  this._filter = null;
};

Filter.TYPES = {
  bbox: 'bbox',
  geometry: 'geometry',
  expression: 'expression',
  fids: 'fids',
  all: 'all'
};

module.exports = Filter;
