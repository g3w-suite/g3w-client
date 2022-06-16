import G3WObject from 'core/g3wobject';
import Relation from './relation';

// class Relations
class Relations extends G3WObject {
  constructor(options = {}) {
    super();
    const { relations } = options;
    // store relations
    this._relations = {};
    this._length = relations ? relations.length : 0;
    // to build relations between layers
    this._relationsInfo = {
      children: {}, // array child (unique ids)
      fathers: {}, // array father (unique ids)
      father_child: {}, // info parent child
    };
    let relation;
    relations.forEach((relationConfig) => {
      relation = new Relation(relationConfig);
      this._relations[relation.getId()] = relation;
    });
    this._createRelationsInfo();
  }

  _createRelationsInfo() {
    let father;
    let child;
    Object.entries(this._relations).forEach(([relationKey, relation]) => {
      father = relation.getFather();
      child = relation.getChild();
      this._relationsInfo.father_child[father + child] = relationKey;
      if (!this._relationsInfo.fathers[father]) this._relationsInfo.fathers[father] = [];
      if (!this._relationsInfo.children[child]) this._relationsInfo.children[child] = [];
      this._relationsInfo.fathers[father].push(child);
      this._relationsInfo.children[child].push(father);
    });
  }

  _clearRelationsInfo() {
    this._relationsInfo = {
      children: {},
      fathers: {},
      father_children: {},
    };
  }

  _reloadRelationsInfo() {
    this._clearRelationsInfo();
    this._createRelationsInfo();
  }

  // number of relations
  getLength() {
    return this._length;
  }

  getRelations({ type = null } = {}) {
    if (!type) return this._relations;
    if (['ONE', 'MANY'].indexOf(type) !== -1) {
      const relations = {};
      for (const name in this._relations) {
        const relation = this._relations[name];
        if (relation.getType() === type) relations[name] = relation;
      }
      return relations;
    } return {};
  }

  // array of relation
  getArray() {
    const relations = [];
    Object.entries(this._relations).forEach(([relName, relation]) => {
      relations.push(relation);
    });
    return relations;
  }

  setRelations(relations) {
    this._relations = Array.isArray(relations) ? relations : [];
  }

  getRelationById(id) {
    return this._relations[id];
  }

  getRelationByFatherChildren(father, child) {
    const relationId = this._relationsInfo.father_child[father + child];
    return this.getRelationById(relationId);
  }

  addRelation(relation) {
    if (relation instanceof Relation) {
      this._relations[relation.getId()] = relation;
      this._reloadRelationsInfo();
    }
  }

  removeRelation(relation) {
    let relationId;
    if (relation instanceof Relation) {
      relationId = relation.getId();
      delete this._relations[relationId];
      this._reloadRelationsInfo();
    }
  }

  hasChildren(childId) {
    const children = this.getChildren(childId);
    return children ? !!children.length : false;
  }

  hasFathers(fatherId) {
    const fathers = this.getFathers(fatherId);
    return fathers ? !!fathers.length : false;
  }

  // get children based on father id
  getChildren(fatherId) {
    if (!this.isFather(fatherId)) return null;
    return this._relationsInfo.fathers[fatherId];
  }

  // get fathers based on childId
  getFathers(childId) {
    if (!this.isChild(childId)) return null;
    return this._relationsInfo.children[childId];
  }

  isChild(id) {
    return !!this._relationsInfo.children[id];
  }

  isFather(id) {
    return !!this._relationsInfo.fathers[id];
  }
}

export default Relations;
