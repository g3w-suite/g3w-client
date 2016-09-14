var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

function FeatureService(feature) {
    this._feature = feature;
    this._attributes = this.getAttributes();
    base(this);
}

inherit(FeatureService, G3WObject);

var proto = FeatureService.prototype;

proto.getId = function(){
    return this._feature.getId();
};

proto.getAttributes = function() {
    return this._feature.getProperties();
};

proto.setAttribute = function(attribute, value) {
    this._feature.set(attribute, value);
};

proto.getAttribute = function(attribute) {
  return this._feature.get(attribute)
};

proto.getRelations = function() {
  return this._feature.relations
};

proto.getRelation = function(relationName) {

};

proto.getRelationElements = function(relationName) {

};
proto.setRelations = function() {
  var relations = this._feature.get('g3w_relations');
  //TODO
};
module.exports = FeatureService;