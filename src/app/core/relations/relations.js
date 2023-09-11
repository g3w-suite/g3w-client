const { base, inherit } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const Relation = require('core/relations/relation');

// class Relations
function Relations(options={}) {
  const {relations} = options;
  //store relations
  this._relations = {};
  this._length = relations ? relations.length : 0;
  // to build relations between layers
  this._relationsInfo = {
    children: {}, // array child (unique ids)
    fathers: {}, // array father (unique ids)
    father_child: {} // info parent child
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
  Object.entries(this._relations)
    .forEach(([relationKey, relation]) => {
      father = relation.getFather();
      child = relation.getChild();
      //set
      this._relationsInfo.father_child[father+child] = relationKey;

      if (!this._relationsInfo.fathers[father]) {
        this._relationsInfo.fathers[father] = [];
      }
      if (!this._relationsInfo.children[child]) {
        this._relationsInfo.children[child] = [];
      }
      this._relationsInfo.fathers[father].push(child);
      this._relationsInfo.children[child].push(father);
  });
};

/**
 *
 * @private
 */
proto._clearRelationsInfo = function() {
  this._relationsInfo = {
    children: {},
    fathers: {},
    father_children: {}
  };
};

/**
 *
 * @private
 */
proto._reloadRelationsInfo = function() {
  this._clearRelationsInfo();
  this._createRelationsInfo();
};

// number of relations
proto.getLength = function() {
  return this._length;
};

/**
 *
 * @param type
 * @returns {*|{}|[]|{}}
 */
proto.getRelations = function({type=null}={}) {
  if (type) {
    //check if relation has type
    if (['ONE','MANY'].indexOf(type) !== -1) {
      const relations = {};
      for (const name in this._relations) {
        const relation = this._relations[name];
        if (relation.getType() === type) {
          relations[name] = relation;
        }
      }
      return relations;
    } else {
      return {};
    }
  } else {
    return this._relations;
  }
};

// array of relation
proto.getArray = function() {
  return Object
    .entries(this._relations)
    .map(([_, relation]) => relation);
};

/**
 *
 * @param relations
 */
proto.setRelations = function(relations=[]) {
  this._relations = Array.isArray(relations) ? relations : [];
};

/**
 *
 * @param id
 * @returns {*}
 */
proto.getRelationById = function(id) {
  return this._relations[id];
};

/**
 *
 * @param father
 * @param child
 * @returns {*}
 */
proto.getRelationByFatherChildren = function(father, child) {
  return this.getRelationById(this._relationsInfo.father_child[father+child]);
};

/**
 *
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
 *
 * @param childId
 * @returns {boolean|boolean}
 */
proto.hasChildren = function(childId) {
  const children = this.getChildren(childId);
  return children ? children.length > 0: false;
};

/**
 *
 * @param fatherId
 * @returns {boolean|boolean}
 */
proto.hasFathers = function(fatherId) {
  const fathers = this.getFathers(fatherId);
  return fathers ? fathers.length > 0 : false;
};

/**
 * Get children based on father id
 * @param fatherId
 * @returns {*|null}
 */
proto.getChildren = function(fatherId) {
  if (this.isFather(fatherId)) {
    return this._relationsInfo.fathers[fatherId];
  } else {
    return null;
  }
};

/**
 * Get fathers based on childId
 * @param childId
 * @returns {*|null}
 */
proto.getFathers = function(childId) {
  if (this.isChild(childId)) {
    return this._relationsInfo.children[childId];
  } else {
    return null;
  }
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
