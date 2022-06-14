import G3WObject from 'core/g3wobject';

class Relation extends G3WObject {
  constructor(config={}) {
    super(config);
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
  }

  getId() {
    return this.state.id;
  };

  setId(id) {
    this.state.id = id;
  };

  getName() {
    return this.state.name;
  };

  setName(name) {
    this.state.name = name;
  };

  getTitle() {
    return this.state.title;
  };

  setTitle(title) {
    return this.state.title = title;
  };

  getChild() {
    return this.state.child;
  };

  getFather() {
    return this.state.father;
  };

  getState() {
    return this.state;
  };

  getType() {
    return this.state.type;
  };

  getFields() {
    return {
      father: this.state.fatherField,
      child: this.state.childField
    };
  };

  getFatherField() {
    return this.state.fatherField;
  };

  getChildField() {
    return this.state.childField;
  };

  /**
   * For editing purpose
   */

  setLoading(bool=false) {
    this.state.loading = bool;
  };

  isLoading() {
    return this.state.loading;
  };

  /**
   * End editing loading purpose
   */
}

export default Relation;
