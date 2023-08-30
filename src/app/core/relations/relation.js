const { base, inherit } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

/**
 * Create a QGIS Relation Property: one (1-N) and many to many (N-M)
 * 
 * @class 
 * @see https://docs.qgis.org/3.22/en/docs/user_manual/introduction/qgis_configuration.html?highlight=relation#relations-properties
 */
function Relation(config={}) {

  const uniqueSuffix = Date.now();

  /**
   * Store relation state
   * @type {object}
   */
  this.state = {
    id: config.id || `id_${uniqueSuffix}`,
    name: config.name || `name_${uniqueSuffix}`,
    origname: config.origname || `origname_${uniqueSuffix}`,
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

/**
 * @returns {string} relation identifier
 */
proto.getId = function() {
  return this.state.id;
};

/**
 * @param {string} id relation identifier
 */
proto.setId = function(id) {
  this.state.id = id;
};

/**
 * @returns {string} relation name
 */
proto.getName = function() {
  return this.state.name;
};

/**
 * @param {string} name relation name
 */
proto.setName = function(name) {
  this.state.name = name;
};

/**
 * @TODO check if this is currently a deprecated feature
 * 
 * @returns {string} relation title
 */
proto.getTitle = function() {
  return this.state.title;
};

/**
 * @TODO check if this is currently a deprecated feature
 * 
 * @param {string} title relation title
 * @returns {void}
 */
proto.setTitle = function(title) {
  return this.state.title = title;
};

/**
 * @returns {object[]} relation children
 */
proto.getChild = function() {
  return this.state.child;
};

/**
 * @returns {object[]} relation father
 */
proto.getFather = function() {
  return this.state.father;
};

/**
 * @returns {object} relation state
 */
proto.getState = function() {
  return this.state;
};

/**
 * @returns {string} relation type
 */
proto.getType = function() {
  return this.state.type;
};

/**
 * @returns {object} relation fields
 */
proto.getFields = function() {
  return {
    father: this.state.fatherFields, // temp
    child: this.state.childFields // temp
  };
};

/**
 * @returns {object} parent relation fields
 */
proto.getFatherFields = function() {
  return this.state.fatherFields;
};

/**
 * @returns {object} child relation fields
 */
proto.getChildFields = function() {
  return this.state.childFields;
};

/**
 * Toggle loading (for editing purpose)
 * 
 * @param {boolean = false} bool
 */
proto.setLoading = function(bool=false){
  this.state.loading = bool;
};

/**
 * Check loading (for editing purpose)
 * 
 * @returns {boolean}
 */
proto.isLoading = function(){
  return this.state.loading;
};

module.exports = Relation;
