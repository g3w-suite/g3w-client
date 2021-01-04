const inherit = require('core/utils/utils').inherit;
const base = require('core/utils//utils').base;
const G3WObject = require('core/g3wobject');
const Relation = require('./relation');

// class Relations
function Relations(options={}) {
  const {relations} = options;
  //store relations
  this._relations = {};
  this._length = relations ? relations.length: 0;
  // to build relations between layers
  this._relationsInfo = {
    children: {}, // array child (unique ids)
    fathers: {}, // array father (unique ids)
    father_child: {} // info parent child
  };
  let relation;
  relations.forEach((relationConfig) => {
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

// number of relations
proto.getLength = function() {
  return this._length
};

proto.getRelations = function({type=null}={}) {
  if (!type) return this._relations;
  else {
    if (['ONE','MANY'].indexOf(type) !== -1) {
      const relations = {};
      for (const name in this._relations) {
        const relation = this._relations[name];
        if (relation.getType() === type) relations[name] = relation;
      }
      return relations;
    } else return {};
  }
};

// array of relation
proto.getArray = function() {
  const relations = [];
  Object.entries(this._relations).forEach(([relName, relation]) => {
    relations.push(relation);
  });
  return relations;
};

proto.setRelations = function(relations) {
  this._relations = _.isArray(relations) ? relations : [];
};

proto.getRelationById = function(id) {
  return this._relations[id];
};

proto.getRelationByFatherChildren = function(father, child) {
  const relationId = this._relationsInfo.father_child[father+child];
  return this.getRelationById(relationId);
};

proto.addRelation = function(relation) {
  if (relation instanceof Relation) {
    this._relations[relation.getId()] = relation;
    this._reloadRelationsInfo();
  }
};

proto.removeRelation = function(relation) {
  let relationId;
  if (relation instanceof Relation) {
    relationId = relation.getId();
    delete this._relations[relationId];
    this._reloadRelationsInfo();
  }
};

proto.hasChildren = function(childId) {
  const children = this.getChildren(childId);
  return  children ? !!children.length: false;
};

proto.hasFathers = function(fatherId) {
  const fathers = this.getFathers(fatherId);
  return fathers ? !!fathers.length : false;
};

// get children based on father id
proto.getChildren = function(fatherId) {
  if (!this.isFather(fatherId)) {
    return null;
  }
  return this._relationsInfo.fathers[fatherId];
};

// get fathers based on childId
proto.getFathers = function(childId) {
  if (!this.isChild(childId)) {
    return null;
  }
  return this._relationsInfo.children[childId];
};

proto.isChild = function(id) {
  return !!this._relationsInfo.children[id];
};

proto.isFather = function(id) {
  return !!this._relationsInfo.fathers[id];
};

module.exports = Relations;
