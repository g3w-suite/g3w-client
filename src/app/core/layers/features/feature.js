import CONSTANT from 'app/constant';

const { uniqueId } = require('utils');

const geometryFields = CONSTANT.GEOMETRY_FIELDS;

const Feature = function(options={}) {
  ol.Feature.call(this);
  this._uid = uniqueId();
  this._newPrefix = '_new_';
  this._geometry = false;
  const {feature, properties} = options;
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
};

ol.inherits(Feature, ol.Feature);

const proto = Feature.prototype;

//change constructor
proto.constructor = 'Feature';

/**
 * Return unique id
 * @returns {*}
 */
proto.getUid = function(){
  return this._uid
};

/**
 * set new uid
 * @param uid
 * @private
 */
proto._setUid = function(uid){
  this._uid = uid;
};

proto.isGeometry = function(){
  return this._geometry;
};

/**
 * Clone a feature with id and pk new
 * @param pk field <Object> send pk field
 * @returns {Feature}
 */
proto.cloneNew = function(pk){
  const clone = this.clone();
  const uid = uniqueId();
  clone._setUid(uid);
  clone.setTemporaryId();
  //in case of send pk field object set temporary new value
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
proto.clone = function() {
  const feature = ol.Feature.prototype.clone.call(this);
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

proto.setTemporaryId = function() {
  const newValue = `${this._newPrefix}${uniqueId()}`;
  this.setId(newValue);
  this.setNew();
};

proto.setNew = function() {
  this.state.new = true;
};

proto.delete = function() {
  this.state.state = 'delete';
  return this;
};

proto.update = function() {
  this.state.state = 'update';
  return this;
};

proto.add = function() {
  this.state.state = 'add';
  return this;
};

proto.isNew = function() {
  return this.state.new;
};

proto.isAdded = function() {
  return this.state.state === 'add';
};

proto.isUpdated = function() {
  return this.state.state === 'update';
};

proto.isDeleted = function() {
  return this.state.state === 'delete';
};

proto.setFullState = function(state) {
  this.state = state;
};

proto.getFullState = function() {
  return this.state;
};

proto.setState = function(state) {
  this.state.state = state;
};

proto.getState = function() {
  return this.state.state;
};

proto.getAlphanumericProperties = function() {
  const properties = this.getProperties();
  const alphanumericproperties = {};
  for (let name in properties) {
    if (geometryFields.indexOf(name) === -1)
      alphanumericproperties[name] = properties[name];
  }
  return alphanumericproperties;
};

//clean state of the features
proto.clearState = function() {
  this.state.state = null;
  this.state.new = false;
};

/**
 * need to filter features visiblity on table
 * @returns {boolean}
 */
proto.isVisible = function(){
  return this.state.visible;
};

proto.setVisible = function(bool=true){
  this.state.visible = bool;
};


module.exports = Feature;
