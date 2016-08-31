var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

function RelationEditBuffer(editor,relationName){
  this._name = relationName;
  this._editor = editor;
  
  // buffer degli attributi
  this._attributesBuffer = {};
}
inherit(RelationEditBuffer,G3WObject);
module.exports = RelationEditBuffer;

var proto = RelationEditBuffer.prototype;

proto.commit = function(){
  this._clearBuffers();
  this._cloneLayer();
};

proto.undoAll = function(){
  this._resetVectorLayer();
  this._clearBuffers();
};

proto.destroy = function(){
  this._clearBuffers();
};

proto.generateId = function(){
  return this._editor.generateId();
};

proto.addElement = function(element){
  if(!element.id){
    element.id = (this.generateId());
  }
  this._addEditToBuffer(element,'add');
  console.log("Inserita nuovo elemento relazione: (ID: "+element.id+" nel buffer");
};

proto.updateElement = function(element){
  this._addEditToBuffer(element,'update');
  console.log("Modificata elemento relazione: (ID: "+element.id+" nel buffer");
};

proto.deleteElement = function(element){
  this._addEditToBuffer(element,'delete');
  console.log("Rimossa elemento relazione: (ID: "+element.id+" nel buffer");
};

proto.getElementAttributes = function(elementId){
  if(this._attributesBuffer[elementId]){
    return this._attributesBuffer[elementId].slice(-1)[0];
  }
  return null;
};

proto.areElementAttributesEdited = function(elementId){
  if (this._attributesBuffer[elementId]){
    return this._attributesBuffer[elementId].length > -1;
  }
  return false;
};

proto.collectFeatureIds = function(){
  var geometriesBuffers = this._geometriesBuffer;
  var attributesBuffers = this._attributesBuffer;
  
  var modifiedFids = [];

  modifiedFids = _.concat(modifiedFids,_.keys(geometriesBuffers));
  modifiedFids = _.concat(modifiedFids,_.keys(attributesBuffers));
  
  return _.uniq(modifiedFids);
};

proto.collectElements = function(state,asGeoJSON){
  var self = this;
  var geometriesBuffers = this._geometriesBuffer;
  var attributesBuffers = this._attributesBuffer;
  var asGeoJSON = asGeoJSON || false;
  var GeoJSONFormat = new ol.format.GeoJSON();
  
  var modifiedFids = this.collectFeatureIds();
  
  var layer;
  if (state == 'new') {
    layer = self._editor.getEditVectorLayer();
  }
  else {
    layer = self._editor.getVectorLayer();
  }
  
  var features = [];
  _.forEach(modifiedFids,function(fid){
    
    var feature = layer.getFeatureById(fid);
    var isNew = self._isNewFeature(fid);
    var addedFeature = (state == 'new' && isNew && feature);
    var updatedFeature = (state == 'updated' && !isNew && feature);
    var deletedFeature = (state == 'deleted' && !isNew && !feature);
    
    if (addedFeature || updatedFeature){
      if (asGeoJSON){
        feature = GeoJSONFormat.writeFeatureObject(feature);
      }
      features.push(feature);
    }
    else if (deletedFeature) {
      features.push(fid);
    }
  });
  return features;
};

proto.collectRelationAttributes = function(){
  var relationsAttributes = {};
  _.forEach(this._relationsAttributesBuffer,function(relationsBuffer,fid){
    lastRelationsAttributes = relationsBuffer[relationsBuffer.length-1];
    relationsAttributes[fid] = lastRelationsAttributes;
  })
  return relationsAttributes;
};

proto._addEditToBuffer = function(element,operation){
  var id = element.id;
  
  if (!_.has(attributesBuffer,id)){
    attributesBuffer[id] = [];
  }
  
  if(operation == 'delete') {
    element = null;
  }
  
  attributesBuffer[id].push(element);
  this._setDirty();
};

proto._setDirty = function(bool){
  this._editor._setDirty(bool);
};

proto._clearBuffers = function(){
  this._attributesBuffer = {};
  this._setDirty(false);
};
