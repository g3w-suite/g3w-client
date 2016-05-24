var inherit = require('g3w/core/utils').inherit;
var G3WObject = require('g3w/core/g3wobject');

function EditBuffer(editor){
  this._editor = editor;
  
  this._origVectorLayer = new ol.layer.Vector({
    source: new ol.source.Vector()
  });
  this._cloneLayer();
  
  //buffer delle geometrie
  this._geometriesBuffer = {};
  
  // buffer degli attributi
  this._attributesBuffer = {};
  
  // buffer degli attributi delle relazioni
  this._relationsAttributesBuffer = {};
}
inherit(EditBuffer,G3WObject);
module.exports = EditBuffer;

var proto = EditBuffer.prototype;

proto.commit = function(){
  var newFeatures = this._editor.getEditVectorLayer().getFeatures();
  this._editor.getVectorLayer().addFeatures(newFeatures);
  this._editor.getEditVectorLayer().clear();
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

proto.addFeature = function(feature){
  if(!feature.getId()){
    feature.setId(this.generateId());
  }
  this._addEditToGeometryBuffer(feature,'add');
  console.log("Inserita nuova feature: (ID: "+feature.getId()+" "+feature.getGeometry().getCoordinates()+") nel buffer");
};

proto.updateFeature = function(feature){
  this._addEditToGeometryBuffer(feature,'update');
  console.log("Modificata feature: (ID: "+feature.getId()+" "+feature.getGeometry().getCoordinates()+") nel buffer");
};

proto.deleteFeature = function(feature){
  this._addEditToGeometryBuffer(feature,'delete');
  console.log("Rimossa feature: (ID: "+feature.getId()+" "+feature.getGeometry().getCoordinates()+") nel buffer");
};

proto.updateAttributes = function(feature,relationsAttributes){
  if(!feature.getId()){
    feature.setId(this.generateId());
  }
  this._addEditToAttributesBuffer(feature,relationsAttributes);
  console.log("Modificati attributi feature: (ID: "+feature.getId()+")");
};

proto.getFeatureAttributes = function(fid){
  if(this._attributesBuffer[fid]){
    return this._attributesBuffer[fid].slice(-1)[0];
  }
  return null;
};

proto.areFeatureAttributesEdited = function(fid){
  if (this._attributesBuffer[fid]){
    return this._attributesBuffer[fid].length > -1;
  }
  return false;
};

proto.getRelationsAttributes = function(fid){
  return this._relationsAttributesBuffer[fid].slice(-1)[0];
};

proto.areFeatureRelationsEdited = function(fid){
  if (this._relationsAttributesBuffer[fid]){
    return this._relationsAttributesBuffer[fid].length > -1;
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

proto.collectFeatures = function(state,asGeoJSON){
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

proto.createFeature = function(fid,geometry,attributes){
  var feature = new ol.Feature();
  feature.setId(fid);
  feature.setGeometry(geometry);
  feature.setProperties(attributes);
  return feature;
};

proto.collectRelationsAttributes = function(){
  var relationsAttributes = {};
  _.forEach(this._relationsAttributesBuffer,function(relationsBuffer,fid){
    lastRelationsAttributes = relationsBuffer[relationsBuffer.length-1];
    relationsAttributes[fid] = lastRelationsAttributes;
  })
  return relationsAttributes;
};

proto._addEditToGeometryBuffer = function(feature,operation){
  var geometriesBuffer = this._geometriesBuffer;
  
  var id = feature.getId();
  var geometry = feature.getGeometry();
  
  if (operation == 'delete'){
      geometry = null;
      var layer = this._isNewFeature(id) ? this._editor._editVectorLayer : this._editor._vectorLayer;
      layer.getSource().removeFeature(feature);
  } 
  
  if (!_.has(geometriesBuffer,id)){
    geometriesBuffer[id] = [];
  }
  geometriesBuffer[id].push(geometry);
  this._setDirty();
};

proto._addEditToAttributesBuffer = function(feature,relationsAttributes){
  var fid = feature.getId();
  var attributes = feature.getProperties();
  var attributesBuffer = this._attributesBuffer;

  if (!_.has(attributesBuffer,fid)){
    attributesBuffer[fid] = [];
  }
  attributesBuffer[fid].push(attributes);
  
  if (relationsAttributes){
    if (!_.has(this._relationsAttributesBuffer,fid)){
    this._relationsAttributesBuffer[fid] = [];
  }
    this._relationsAttributesBuffer[fid].push(relationsAttributes);
  }
  this._setDirty();
};

// guardo se è una feature già presente nel buffer delle nuove geometrie
proto._isNewFeature = function(fid){
  //return id.toString().indexOf('_new_') > -1;
  return this._editor.isNewFeature(fid);
};

proto._setDirty = function(){
  this._editor._setDirty();
};

proto._resetVectorLayer = function(){
  this._editor.vectoLayer = this._origVectorLayer;
  this._origVectorLayer.getSource().clear();
};

proto._clearBuffers = function(){
  this._geometriesBuffer = {};
  this._attributesBuffer = {};
  this._relationsAttributesBuffer = {};
  this._editor._setDirty(false);
};

proto._cloneLayer = function(){
  var clonedFeatures = [];
  this._editor._vectorLayer.getSource().forEachFeature(function(feature){
    clonedFeatures.push(feature.clone());
  },this);
  this._origVectorLayer.getSource().addFeatures(clonedFeatures);
};
