/**
 * @TODO convert it to ES6 class (or external utils)
 * 
 * @file
 * @since 3.9.0
 */
const Relation = require('core/relations/relation');

export default {

  /**
   * Get Relations
   * 
   * @returns {*}
   */
  getRelations() {
    return this._relations
  },

  /**
   * Get Relation by id
   * 
   * @param id
   * 
   * @returns {*}
   */
  getRelationById(id) {
    return this._relations.getArray().find(r => r.getId() === id);
  },

  /**
   * Get Relation fields
   * 
   * @param relationName
   * 
   * @returns { * | Array }
   */
  getRelationAttributes(relationName) {
    const relation = this._relations.find(r => r.name === relationName);
    return relation ? relation.fields : [];
  },

  /**
   * [LAYER RELATIONS]
   * 
   * @TODO Add description
   * 
   * @returns { Object } fields
   */
  getRelationsAttributes() {
    return (this.state.relations || []).reduce((fields, r) => {
      fields[r.name] = r.fields;
      return fields; },
    {});
  },

  /**
   * Check if layer is a Child of a relation
   * 
   * @returns { * | boolean }
   */
  isChild() {
    return this.getRelations() ? this._relations.isChild(this.getId()) : false;
  },

  /**
   * Check if layer is a Father of a relation
   * 
   * @returns { * | boolean }
   */
  isFather() {
    return this.getRelations() ? this._relations.isFather(this.getId()) : false;
  },

  /**
   * Get children relations
   * 
   * @returns { * |Array }
   */
  getChildren() {
    return this.isFather() ? this._relations.getChildren(this.getId()) : [];
  },

  /**
   * Get parents relations
   * 
   * @returns { * | Array }
   */
  getFathers() {
    return this.isChild() ? this._relations.getFathers(this.getId()) : [];
  },

  /**
   * Check if it has children
   * 
   * @returns { * | boolean }
   */
  hasChildren() {
    return this.hasRelations() ? this._relations.hasChildren(this.getId()) : false;
  },

  /**
   * Check if it has fathers
   * 
   * @returns { * | boolean }
   */
  hasFathers() {
    return this.hasRelations() ? this._relations.hasFathers(this.getId()) : false;
  },

  /**
   * @TODO add description
   */
  hasRelations() {
    return !!this._relations;
  },

  /**
   * Create Relation
   * 
   * ORIGINAL SOURCE: src/app/core/relations/relations.js@v3.9.3
   * 
   * @param projectRelations
   * 
   * @returns relations
   * 
   * @private
   */
  _createRelations(projectRelations) {
    const layerId    = this.getId();
    const relations  = projectRelations.filter(r => -1 !== [r.referencedLayer, r.referencingLayer].indexOf(layerId));
    const Relations  = {

      /**
       * Relations store
       */
      _relations: (relations || []).reduce((relations, conf) => {
        const r = new Relation(conf);
        relations[r.getId()] = r;
        return relations;
      }, {}),

      /**
       * Number of relations
       */
      _length: relations ? relations.length : 0,

      /**
       * Populate `this._relationsInfo` object.
       */
      _createRelationsInfo() {

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

            father_child[f + c] = relationKey;       // relationKey = [father_layerId + child_layerId]
            fathers[f]          = fathers[f]  || [];
            children[c]         = children[c] || [];

            fathers[f].push(c);
            children[c].push(f);
        });

      },

      _clearRelationsInfo() {
        this._relationsInfo = {
          children:     {},     // hashmap: <child_layerId,  Array<father_relationId>>
          fathers:      {},     // hashmap: <father_layerId, Array<child_relationId[]>>
          father_child: {},     // hashmap: <relationKey, relationId>
        };
      },

      /**
       * Build relations between layers.
       *
       * @private
       */
      _reloadRelationsInfo() {
        this._clearRelationsInfo();
        this._createRelationsInfo();
      },

      /**
       * @returns { number } number of relations
       */
      getLength() {
        return this._length;
      },

      /**
       * @param relation.type
       *
       * @returns { {} | Relation[] } relations filtered by type
       */
      getRelations({
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
            if (type === this._relations[name].getType()) {
              relations[name] = this._relations[name];
            }
          }
          return relations;
        }

        return {};
      },

      /**
       * @returns { Relation[] }
       */
      getArray() {
        return Object.entries(this._relations).map(r => r[1]);
      },

      /**
       * @param relations
       */
      setRelations(relations=[]) {
        this._relations = Array.isArray(relations) ? relations : [];
      },

      /**
       * @param id
       *
       * @returns { Relation }
       */
      getRelationById(id) {
        return this._relations[id];
      },

      /**
       * @param father father layerId
       * @param child  child_layerId
       *
       * @returns { Relation }
       */
      getRelationByFatherChildren(father, child) {
        return this.getRelationById(this._relationsInfo.father_child[father + child]);
      },

      /**
       * @param relation
       */
      addRelation(relation) {
        if (relation instanceof Relation) {
          this._relations[relation.getId()] = relation;
          this._reloadRelationsInfo();
        }
      },

      /**
       * @param relation
       */
      removeRelation(relation) {
        if (relation instanceof Relation) {
          delete this._relations[relation.getId()];
          this._reloadRelationsInfo();
        }
      },

      /**
       * @param layer_id
       * 
       * @returns { boolean }
       */
      hasChildren(layer_id) {
        const children = this.getChildren(layer_id);
        return (children && children.length > 0);
      },

      /**
       * @param layer_id
       * 
       * @returns { boolean }
       */
      hasFathers(layer_id) {
        const fathers = this.getFathers(layer_id);
        return (fathers && fathers.length > 0);
      },

      /**
       * Extract children relations
       *
       * @param layer_id
       *
       * @returns { Array | null } child layer (Ids) within same relation
       */
      getChildren(layer_id) {
        return this.isFather(layer_id) ? this._relationsInfo.fathers[layer_id] : null;
      },

      /**
       * Extract father relations
       *
       * @param layer_id
       *
       * @returns { Array | null } father layer Ids within same relation
       */
      getFathers(layer_id) {
        return this.isChild(layer_id) ? this._relationsInfo.children[layer_id] : null;
      },

      /**
       * @param id
       *
       * @returns { boolean }
       */
      isChild(id) {
        return !!this._relationsInfo.children[id];
      },

      /**
       * @param id
       *
       * @returns { boolean }
       */
      isFather(id) {
        return !!this._relationsInfo.fathers[id];
      },

    };

    Relations._reloadRelationsInfo();

    return Relations;

  },

};