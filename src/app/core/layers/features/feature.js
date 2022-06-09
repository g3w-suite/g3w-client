import utils from 'core/utils/utils';
import {Feature as OlFeature} from 'ol';
import geoutils from 'core/utils/geo';
class Feature extends OlFeature{
  constructor(options={}) {
    super();
    this._uid = utils.uniqueId();
    this._newPrefix = '_new_';
    this._geometry = false;
    const {feature, properties} = options;
    if (feature) {
      // check if has to set only some properties or all feature properties
      if (properties && Array.isArray(properties))
        properties.forEach(property => this.set(property, feature.get(property)));
      else this.setProperties(feature.getProperties());
      this.setId(feature.getId());
      this.setGeometryName(feature.getGeometryName());
      const geometry = feature.getGeometry();
      this._geometry = !!geometry;
      geometry && this.setGeometry(geometry);
      const style = this.getStyle();
      style && this.setStyle(style);
    }
    this.state = {
      new: false,
      state: null,
      visible: true
    };
  }

  /**
   * Return unique id
   * @returns {*}
   */
  getUid(){
    return this._uid
  };

  /**
   * set new uid
   * @param uid
   * @private
   */
  _setUid(uid){
    this._uid = uid;
  };

  isGeometry(){
    return this._geometry;
  };

  cloneNew(){
    const clone = this.clone();
    const uid = uniqueId();
    clone._setUid(uid);
    clone.setTemporaryId();
    return clone;
  };

  /**
   * clone existing feature
   * @returns {Feature}
   */
  clone() {
    const feature = super.clone();
    feature.setId(this.getId());
    this.isGeometry() && feature.setGeometry(feature.getGeometry().clone());
    const clone = new Feature({
      feature
    });
    const uid = this.getUid();
    clone._setUid(uid);
    clone.setState(this.getState());
    this.isNew() && clone.setNew();
    return clone;
  };

  setTemporaryId() {
    const newValue = `${this._newPrefix}${uniqueId()}`;
    this.setId(newValue);
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
    return this.state.state === 'add';
  };

  isUpdated() {
    return this.state.state === 'update';
  };

  isDeleted() {
    return this.state.state === 'delete';
  };

  setFullState(state) {
    this.state = state;
  };

  getFullState() {
    return this.state;
  };

  setState(state) {
    this.state.state = state;
  };

  getState() {
    return this.state.state;
  };

  getAlphanumericProperties() {
    const properties = this.getProperties();
    const alphanumericproperties = {};
    for (let name in properties) {
      if (geoutils.geometryFields.indexOf(name) === -1)
        alphanumericproperties[name] = properties[name];
    }
    return alphanumericproperties;
  };

  //clean state of the features
  clearState() {
    this.state.state = null;
    this.state.new = false;
  };

  /**
   * need to filter features visiblity on table
   * @returns {boolean}
   */
  isVisible(){
    return this.state.visible;
  };

  setVisible(bool=true){
    this.state.visible = bool;
  };
};

export default  Feature;
