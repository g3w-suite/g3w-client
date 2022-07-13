const { base, inherit } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

function Relation(config = {}) {
  const uniqueSuffix = Date.now();
  const id = config.id || `id_${uniqueSuffix}`;
  const name = config.name || `name_${uniqueSuffix}`;
  const origname = config.origname || `origname_${uniqueSuffix}`;
  this.state = {
    id,
    name,
    origname,
    father: config.referencedLayer,
    child: config.referencingLayer,
    fatherField: config.fieldRef.referencedField,
    childField: config.fieldRef.referencingField,
    type: config.type,
    loading: false,
  };
  base(this);
}

inherit(Relation, G3WObject);

const proto = Relation.prototype;

proto.getId = function () {
  return this.state.id;
};

proto.setId = function (id) {
  this.state.id = id;
};

proto.getName = function () {
  return this.state.name;
};

proto.setName = function (name) {
  this.state.name = name;
};

proto.getTitle = function () {
  return this.state.title;
};

proto.setTitle = function (title) {
  return this.state.title = title;
};

proto.getChild = function () {
  return this.state.child;
};

proto.getFather = function () {
  return this.state.father;
};

proto.getState = function () {
  return this.state;
};

proto.getType = function () {
  return this.state.type;
};

proto.getFields = function () {
  return {
    father: this.state.fatherField,
    child: this.state.childField,
  };
};

proto.getFatherField = function () {
  return this.state.fatherField;
};

proto.getChildField = function () {
  return this.state.childField;
};

/**
 * For editing purpose
 */

proto.setLoading = function (bool = false) {
  this.state.loading = bool;
};

proto.isLoading = function () {
  return this.state.loading;
};

/**
 * End editing loading purpose
 */

module.exports = Relation;
