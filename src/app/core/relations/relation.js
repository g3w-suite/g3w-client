const {base, inherit} = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

function Relation(config={}) {
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
    fatherFields: config.fieldsRef.map(fieldRef => fieldRef.referencedField), // father Fields
    childFields: config.fieldsRef.map(fieldRef => fieldRef.referencingField), // child fields
    type: config.type
  };

  base(this);
}

inherit(Relation, G3WObject);

const proto = Relation.prototype;

proto.getId = function() {
  return this.state.id;
};

proto.setId = function(id) {
  this.state.id = id;
};

proto.getName = function() {
  return this.state.name;
};

proto.setName = function(name) {
  this.state.name = name;
};

proto.getTitle = function() {
  return this.state.title;
};

proto.setTitle = function(title) {
  return this.state.title = title;
};

proto.getChild = function() {
  return this.state.child;
};

proto.getFather = function() {
  return this.state.father;
};

proto.getState = function() {
  return this.state;
};

proto.getType = function() {
  return this.state.type;
};

proto.getFields = function() {
  return {
    father: this.state.fatherFields, // temp
    child: this.state.childFields // temp
  };
};

proto.getFatherFields = function() {
  return this.state.fatherFields;
};

proto.getChildFields = function() {
  return this.state.childFields;
};

module.exports = Relation;
