const { base, inherit } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

/**
 * Class Relation
 * @param config
 * @constructor
 */
function Relation(config={}) {
  const suffix = Date.now();
  /** BACKCOMP (g3w-admin < v.3.7.0) */
  const multi_fields = [].concat(config.fieldRef.referencedField);

  this.state = {
    id:          config.id       || `id_${suffix}`,
    name:        config.name     || `name_${suffix}`,
    origname:    config.origname || `origname_${suffix}`,
    editable: config.editable || false, //@since v3.7.0
    prefix: config.prefix, //@since v3.7.0
    father: config.referencedLayer,
    child: config.referencingLayer,
    /** BACKCOMP (g3w-admin < v.3.7.0) */
    fatherField: [].concat(config.fieldRef.referencedField),
    /** BACKCOMP (g3w-admin < v.3.7.0) */
    childField: [].concat(config.fieldRef.referencingField),
    type: config.type,
    loading: false
  };

  base(this);
}

inherit(Relation, G3WObject);

const proto = Relation.prototype;

/**
 * Get relation id
 *
 * @returns {string}
 */
proto.getId = function() {
  return this.state.id;
};

/**
 * Set Relation id
 *
 * @param id
 */
proto.setId = function(id) {
  this.state.id = id;
};

/**
 * Get Relation name
 *
 * @returns {string}
 */
proto.getName = function() {
  return this.state.name;
};

/**
 * Set Relation name
 *
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
 * @returns { string[] } layerId of child relation
 */
proto.getChild = function() {
  return this.state.child;
};

/**
 * @returns { string[] } layerId of father relation
 */
proto.getFather = function() {
  return this.state.father;
};

/**
 * @returns state Object of relation
 */
proto.getState = function() {
  return this.state;
};

/**
 * @returns { 'MANY' | ONE' | string } relation type
 */
proto.getType = function() {
  return this.state.type;
};

/**
 * @returns {{ father, child }} relation fields
 */
proto.getFields = function() {
  return {
    father: this.state.fatherField,
    child: this.state.childField
  };
};

/**
 * Return father relation field name
 *
 * @returns {*}
 */
proto.getFatherField = function() {
  return this.state.fatherField;
};

/**
 * Return relation child layer field name
 *
 * @returns {*}
 */
proto.getChildField = function() {
  return this.state.childField;
};

/**
 * Set Loading state relation (for editing purpose)
 *
 * @param bool
 */
proto.setLoading = function(bool=false){
  this.state.loading = bool;
};

/**
 * Check Loading state Relation (for editing purpose)
 *
 * @returns { boolean }
 */
proto.isLoading = function(){
  return this.state.loading;
};

/**
 * Get editable property
 * @since v3.7.0
 */
proto.isEditable = function(){
  return this.state.editable;
};

/**
 * End editing loading purpose
 */

/**
 * Get Prefix (for Relation 1:1)
 * @since v3.7.0
 * @returns String
 */
proto.getPrefix = function(){
  return this.state.prefix;
}

module.exports = Relation;