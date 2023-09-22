const { base, inherit } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const Relation = require('core/relations/relation');

/**
 * Relations Class
 * 
 * @param options
 * 
 * @constructor
 */
function Relations(options = {}) {

  /**
   * Relations store 
   */
  this._relations = {};

  /**
   * Number of relations 
   */
  this._length = options.relations ? options.relations.length : 0;

  let relation;
  options.relations.forEach(relationConfig => {
    relation = new Relation(relationConfig);
    this._relations[relation.getId()] = relation;
  });

  this._reloadRelationsInfo();

  base(this);
}

inherit(Relations, G3WObject);

const proto = Relations.prototype;

/**
 * Populate `this._relationsInfo` object.
 */
proto._createRelationsInfo = function() {

  // sanity check
  if (!this._relationsInfo) {
    this._clearRelationsInfo();
  }

  let f, c;
  const { father_child, fathers, children } = this._relationsInfo;

  Object
    .entries(this._relations)
    .forEach(([relationKey, relation]) => {

      f = relation.getFather();
      c = relation.getChild();

      father_child[f + c] = relationKey;       // [f + c] = the relation key ?
      fathers[f]          = fathers[f]  || [];
      children[c]         = children[c] || [];

      fathers[f].push(c);
      children[c].push(f);
  });
};

/**
 * @private
 */
proto._clearRelationsInfo = function() {
  this._relationsInfo = {
    children:     {},     // relations having a father relation (key -> child_id)
    fathers:      {},     // relations having a child relation  (key = father_id)
    father_child: {},     // info parent child
  };
};

/**
 * Build relations between layers.
 * 
 * @private
 */
proto._reloadRelationsInfo = function() {
  this._clearRelationsInfo();
  this._createRelationsInfo();
};

/**
 * @returns number of relations 
 */
proto.getLength = function() {
  return this._length;
};

/**
 * @param relation.type
 * 
 * @returns { * | {} | [] } relations filtered by type
 */
proto.getRelations = function({
  type = null,
} = {}) {

  // type = null
  if (!type) {
    return this._relations;
  }

  // type = { 'ONE' | 'MANY' }
  if (-1 !== ['ONE','MANY'].indexOf(type)) {
    const relations = {};
    for (const name in this._relations) {
      const relation = this._relations[name];
      if (type === relation.getType()) {
        relations[name] = relation;
      }
    }
    return relations;
  }

  return {};
};

/**
 * @returns relations as array 
 */
proto.getArray = function() {
  return Object
    .entries(this._relations)
    .map(([_, relation]) => relation);
};

/**
 * @param relations
 */
proto.setRelations = function(relations=[]) {
  this._relations = Array.isArray(relations) ? relations : [];
};

/**
 * @param id
 * 
 * @returns {*}
 */
proto.getRelationById = function(id) {
  return this._relations[id];
};

/**
 *
 * @param father
 * @param child
 * 
 * @returns {*}
 */
proto.getRelationByFatherChildren = function(father, child) {
  return this.getRelationById(this._relationsInfo.father_child[father + child]);
};

/**
 * @param relation
 */
proto.addRelation = function(relation) {
  if (relation instanceof Relation) {
    this._relations[relation.getId()] = relation;
    this._reloadRelationsInfo();
  }
};

/**
 *
 * @param relation
 */
proto.removeRelation = function(relation) {
  if (relation instanceof Relation) {
    delete this._relations[relation.getId()];
    this._reloadRelationsInfo();
  }
};

/**
 * @param relation_id
 * 
 * @returns { boolean }
 */
proto.hasChildren = function(relation_id) {
  const children = this.getChildren(relation_id);
  return (children && children.length > 0);
};

/**
 * @param relation_id
 * 
 * @returns { boolean }
 */
proto.hasFathers = function(relation_id) {
  const fathers = this.getFathers(relation_id);
  return (fathers && fathers.length > 0);
};

/**
 * Get children relations
 * 
 * @param relation_id father relation id
 * 
 * @returns { * | null }
 */
proto.getChildren = function(relation_id) {
  return this.isFather(relation_id) ? this._relationsInfo.fathers[relation_id] : null;
};

/**
 * Get father relations
 * 
 * @param relation_id child relation id
 * 
 * @returns { * | null }
 */
proto.getFathers = function(relation_id) {
  return this.isChild(relation_id) ? this._relationsInfo.children[relation_id] : null;
};

/**
 *
 * @param id
 * @returns {boolean}
 */
proto.isChild = function(id) {
  return !!this._relationsInfo.children[id];
};

/**
 *
 * @param id
 * @returns {boolean}
 */
proto.isFather = function(id) {
  return !!this._relationsInfo.fathers[id];
};

module.exports = Relations;
