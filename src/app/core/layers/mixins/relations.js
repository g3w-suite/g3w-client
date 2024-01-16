/**
 * @TODO convert it to ES6 class (or external utils)
 * 
 * @file
 * @since 3.9.0
 */

const Relations = require('core/relations/relations');

export default {

  /**
   * Create Relation
   * 
   * @param projectRelations
   * 
   * @returns {Relations}
   * 
   * @private
   */
  _createRelations(projectRelations) {
    const layerId = this.getId();
    return new Relations({
      relations: projectRelations.filter(relation => -1 !== [relation.referencedLayer, relation.referencingLayer].indexOf(layerId))
    });
  },

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
    return this._relations.getArray().find(relation => relation.getId() === id);
  },

  /**
   * Get Relation fields
   * 
   * @param relationName
   * 
   * @returns { * | Array }
   */
  getRelationAttributes(relationName) {
    const relation = this._relations.find(relation => relation.name === relationName);
    return relation ? relation.fields : [];
  },

  /**
   * [LAYER RELATIONS]
   * 
   * @TODO Add description
   * 
   * @returns { Object }
   */
  getRelationsAttributes() {
    const fields = {};
    this.state.relations.forEach(relation => fields[relation.name] = relation.fields);
    return fields;
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

};