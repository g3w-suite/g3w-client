import CONSTANT from 'app/constant';

const { uniqueId } = require('utils');

module.exports = class Feature extends ol.Feature {
  constructor(opts = {}) {
    super();
    this.state = {
      new:     false,
      state:   null,
      visible: true
    };
    //store unique id for the feature
    this._uid       = uniqueId();
    //prefix of new feature id
    this._newPrefix = '_new_';
    //{ Boolean }: true if feature has geometry
    this._geometry  = false;

    const { feature, properties } = opts;

    if (feature) {
      // check if it has to set only some properties or all feature properties
      if (properties && Array.isArray(properties)) {
        properties.forEach(property => this.set(property, feature.get(property)));
      } else {
        this.setProperties(feature.getProperties());
      }
      this.setId(feature.getId());
      this.setGeometryName(feature.getGeometryName());
      const geometry = feature.getGeometry();
      //check if feature has geometry
      if (geometry) {
        this._geometry = true;
        this.setGeometry(geometry);
      }
      //check if it has style associated
      const style = this.getStyle();
      if (style) {
        this.setStyle(style);
      }
    }

  }

  /**
   * Return unique id
   * @returns {*}
   */
  getUid() {
    return this._uid
  };

  /**
   * set new uid
   * @param uid
   * @private
   */
  _setUid(uid) {
    this._uid = uid;
  };

  /**
   *
   * @return {boolean}
   */
  isGeometry() {
    return this._geometry;
  };

  /**
   * Clone a feature with id and pk new
   * @param pk field <Object> send pk field
   * @returns {Feature}
   */
  cloneNew(pk) {
    const clone = this.clone();
    //set new unique id
    clone._setUid(uniqueId());
    clone.setTemporaryId();
    //in the case of send pk field object set temporary new value
    //to avoid duplicate pk when save clone feature on server
    if (pk && false === pk.editable) {
      //need to be set null
      clone.set(pk.name, null);
    }
    return clone;
  };

  /**
   * clone existing feature
   * @returns {Feature}
   */
  clone() {
    const feature = super.clone();
    feature.setId(this.getId());
    //if it has geometry, need to clone geometry
    if (this.isGeometry()) {
      feature.setGeometry(feature.getGeometry().clone());
    }
    const clone = new Feature({ feature });
    clone._setUid(this.getUid());
    clone.setState(this.getState());
    if (this.isNew()) {
      clone.setNew();
    }
    return clone;
  };

  setTemporaryId() {
    this.setId(`${this._newPrefix}${uniqueId()}`);
    this.setNew();
  };

  setNew() {
    this.state.new = true;
  };

  delete() {
    this.state.state = 'delete';
    return this;
  };

  update() {
    this.state.state = 'update';
    return this;
  };

  add() {
    this.state.state = 'add';
    return this;
  };

  isNew() {
    return this.state.new;
  };

  isAdded() {
    return 'add' === this.state.state;
  };

  isUpdated() {
    return 'update' === this.state.state;
  };

  isDeleted() {
    return 'delete' === this.state.state;
  };

  setState(state) {
    this.state.state = state;
  };

  getState() {
    return this.state.state;
  };

  /**
   * Get only alphanumerical properties. No geometry property is returned
   * @return {{ Object }}
   */
  getAlphanumericProperties() {
    return Object
      .entries(this.getProperties())
      .filter(([name, _]) => !CONSTANT.GEOMETRY_FIELDS.includes(name))
      .reduce((attrs, [n, v]) => { attrs[n] = v; return attrs }, {})
  };

  /**
   * clean state of the features
   */
  clearState() {
    this.state.state = null;
    this.state.new   = false;
  };

  /**
   * need to filter features visiblity on table
   * @returns {boolean}
   */
  isVisible() {
    return this.state.visible;
  };

  /**
   * Set visibility of feature
   * @param bool
   */
  setVisible(bool = true) {
    this.state.visible = bool;
  };


}



