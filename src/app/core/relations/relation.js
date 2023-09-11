const { base, inherit } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

/**
 * Class Relation
 * @param config
 * @constructor
 */
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
    fatherField: config.fieldRef.referencedField,
    childField: config.fieldRef.referencingField,
    type: config.type,
    loading: false
  };
  base(this);
}

inherit(Relation, G3WObject);

const proto = Relation.prototype;

/**
 * Get relation id
 * @returns {string}
 */
proto.getId = function() {
  return this.state.id;
};

/**
 * Set Relation id
 * @param id
 */
proto.setId = function(id) {
  this.state.id = id;
};

/**
 * Get Relation name
 * @returns {string}
 */
proto.getName = function() {
  return this.state.name;
};

/**
 * Set Relation name
 * @param name
 */
proto.setName = function(name) {
  this.state.name = name;
};

/**
 * Get Relation title
 * @returns {*}
 */
proto.getTitle = function() {
  return this.state.title;
};

/**
 * Set Relation title
 * @param title
 * @returns {*}
 */
proto.setTitle = function(title) {
  return this.state.title = title;
};

/**
 * Return relation child layer id
 * @returns {*}
 */
proto.getChild = function() {
  return this.state.child;
};

/**
 * Return relation father layer id
 * @returns {*}
 */
proto.getFather = function() {
  return this.state.father;
};

/**
 * Return all state Object of relation
 * @returns {*|{father: *, fatherField: *, name: string, origname: (string|*|string), id: string, type, loading: boolean, childField: *, child: *}}
 */
proto.getState = function() {
  return this.state;
};

/**
 * Retur relation type (MANY, ONE, etc..)
 * @returns {*}
 */
proto.getType = function() {
  return this.state.type;
};

/**
 * Return Relation fields
 * @returns {{father, child}}
 */
proto.getFields = function() {
  return {
    father: this.state.fatherField,
    child: this.state.childField
  };
};

/**
 * Return father relation field name
 * @returns {*}
 */
proto.getFatherField = function() {
  return this.state.fatherField;
};

/**
 * Return relation child layer field name
 * @returns {*}
 */
proto.getChildField = function() {
  return this.state.childField;
};

/**
 * For editing purpose
 */

/**
 * Set Loading state relation
 * @param bool
 */
proto.setLoading = function(bool=false){
  this.state.loading = bool;
};

/**
 * Check Loading state Relation
 * @returns {boolean}
 */
proto.isLoading = function(){
  return this.state.loading;
};

/**
 * End editing loading purpose
 */

module.exports = Relation;
