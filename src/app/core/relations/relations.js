/**
 * @file handle QGIS Relations Properties: one (1-N) and many to many (N-M)
 * @see https://docs.qgis.org/3.22/en/docs/user_manual/introduction/qgis_configuration.html?highlight=relation#relations-properties
 */

const {base, inherit} = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const Relation = require('./relation');

function Relations(options={}) {

  const {relations} = options;

  /**
   * Store relations
   * @type {object}
   */
  this._relations = {};

  /**
   * Number of relations
   * @type {number} 
   */
  this._length = relations ? relations.length : 0;

  /**
   * Build relations between layers
   * @type {object}
   */
  this._relationsInfo = {

    /**
     * array child (unique ids)
     * @type {object}
     */
    children: {},

    /**
     * array father (unique ids)
     * @type {object}
     */
    fathers: {},

    /**
     * info parent child
     * @type {object}
     */
    father_child: {}

  };

  let relation;
  relations.forEach(relationConfig => {
    relation = new Relation(relationConfig);
    this._relations[relation.getId()] = relation;
  });

  this._createRelationsInfo();
  base(this);

}

inherit(Relations, G3WObject);

const proto = Relations.prototype;

proto._createRelationsInfo = function() {
  let father;
  let child;
  Object.entries(this._relations).forEach(([relationKey, relation]) => {
    father = relation.getFather();
    child = relation.getChild();
    this._relationsInfo.father_child[father+child] = relationKey;
    if (!this._relationsInfo.fathers[father]) this._relationsInfo.fathers[father] = [];
    if (!this._relationsInfo.children[child]) this._relationsInfo.children[child] = [];
    this._relationsInfo.fathers[father].push(child);
    this._relationsInfo.children[child].push(father);
  });
};

proto._clearRelationsInfo = function() {
  this._relationsInfo = {
    children: {},
    fathers: {},
    father_children: {}
  };
};

proto._reloadRelationsInfo = function() {
  this._clearRelationsInfo();
  this._createRelationsInfo();
};

/**
 * @returns {number} number of relations
 */
proto.getLength = function() {
  return this._length
};

/**
 * @param {{type: string}} relation relation type used to filter current stored relations
 * @returns {object} relations between layers
 */
proto.getRelations = function({type=null}={}) {
  if (type) {
    const relations = {};
    if (['ONE','MANY'].indexOf(type) !== -1) {
      for (const name in this._relations) {
        const relation = this._relations[name];
        if (relation.getType() === type) {
          relations[name] = relation;
        }
      }
    }
    return relations;
  } else {
    return this._relations;
  }
};

/**
 * @returns {Relation[]} array of relation
 */
proto.getArray = function() {
  const relations = [];
  Object.entries(this._relations).forEach(([relName, relation]) => {
    relations.push(relation);
  });
  return relations;
};

/**
 * @param {Relation[]} relations array of relations 
 * @returns {void}
 */
proto.setRelations = function(relations) {
  this._relations = Array.isArray(relations) ? relations : [];
};

/**
 * 
 * @param {string} id relation identifier
 * @returns {Relation}
 */
proto.getRelationById = function(id) {
  return this._relations[id];
};

/**
 * @param {string} father father identifier
 * @param {string} child child identifier
 * @returns {Relation}
 */
proto.getRelationByFatherChildren = function(father, child) {
  return this.getRelationById(this._relationsInfo.father_child[father+child]);
};

/**
 * @param {Relation} relation relation to be added
 * @returns {void}
 */
proto.addRelation = function(relation) {
  if (relation instanceof Relation) {
    this._relations[relation.getId()] = relation;
    this._reloadRelationsInfo();
  }
};

/**
 * @param {Relation} relation relation to be deleted
 * @returns {void}
 */
proto.removeRelation = function(relation) {
  let relationId;
  if (relation instanceof Relation) {
    relationId = relation.getId();
    delete this._relations[relationId];
    this._reloadRelationsInfo();
  }
};

/**
 * @param {string} fatherId relation identifier
 * @returns {boolean}
 */
proto.hasChildren = function(childId) {
  const children = this.getChildren(childId);
  return children ? !!children.length : false;
};

/**
 * @param {string} fatherId relation identifier
 * @returns {boolean}
 */
proto.hasFathers = function(fatherId) {
  const fathers = this.getFathers(fatherId);
  return fathers ? !!fathers.length : false;
};

/**
 * Get children based on father id
 * 
 * @param {string} fatherId relation identifier
 * @returns {object} children
 */
proto.getChildren = function(fatherId) {
  if (!this.isFather(fatherId)) return null;
  return this._relationsInfo.fathers[fatherId];
};

/**
 * Get fathers based on childId
 * 
 * @prop {string} childId relation identifier
 * @returns {object} fathers
 */
proto.getFathers = function(childId) {
  if (!this.isChild(childId)) return null;
  return this._relationsInfo.children[childId];
};

/**
 * @prop {string} id relation identifier
 * @returns {boolean}
 */
proto.isChild = function(id) {
  return !!this._relationsInfo.children[id];
};

/**
 * @prop {string} id relation identifier
 * @returns {boolean}
 */
proto.isFather = function(id) {
  return !!this._relationsInfo.fathers[id];
};

module.exports = Relations;
