var inherit = require('g3w/core/utils').inherit;
var G3WObject = require('g3w/core/g3wobject');

function EditBuffer(vectorLayer,editVectorLayer){
  this._vectorLayer = vectorLayer;
  this._editVectorLayer = editVectorLayer;
  
  //buffer delle geometrie
  this._geometriesBuffer = {};
  
  // buffer degli attributi
  this._attributesBuffer = {};
  
  this._relationsAttributesBuffer = {};
}
inherit(EditBuffer,G3WObject);
module.exports = EditBuffer;

var proto = EditBuffer.prototype;

proto.addFeature = function(feature){
  if(!feature.getId()){
    feature.setId('_new_'+Date.now());
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

proto.setAttributes = function(feature,attributes,relationsAttributes){
  if(!feature.getId()){
    feature.setId('_new_'+Date.now());
  }
  this._addEditToAttributesBuffer(feature,attributes,relationsAttributes);
  console.log("Modificati attributi feature: (ID: "+feature.getId()+")");
};

proto.getFeatureAttributes = function(fid){
  return this._attributesBuffer[fid].slice(-1)[0];
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


proto.getFeatures = function(){
  return {
    added: this._collectFeatures('new'),
    updated: this._collectFeatures('updated'),
    deleted: this._collectFeatures('deleted'),
    relationsattributes: this._collectRelationsAttributes()
  }
};

proto._collectFeatures = function(state){
  var self = this;
  var geometriesBuffers = this._geometriesBuffer;
  var attributesBuffers = this._attributesBuffer;
  var GeoJSONFormat = new ol.format.GeoJSON();
  
  var modifiedFids = [];

  modifiedFids = _.concat(modifiedFids,_.keys(geometriesBuffers));
  modifiedFids = _.concat(modifiedFids,_.keys(attributesBuffers));
  
  modifiedFids = _.uniq(modifiedFids);
  
  var features = [];
  _.forEach(modifiedFids,function(fid){
    
    var isNew = self._isNewFeature(fid);
    
    var vectorLayer = isNew ? self._editVectorLayer : self._vectorLayer;
    var fid = fid;
    
    var geometry = null;
    // se presente anche nel buffer delle geometrie allora pesco dal buffer
    if(_.get(geometriesBuffers,fid)){
      var geometryBuffer = geometriesBuffers[fid];
      geometry = geometryBuffer[geometryBuffer.length-1];
    }
    // altrimenti prendo la geometria originale
    else {
      geometry = vectorLayer.getFeatureById(fid).getGeometry();
    }
    
    var attributes = {};
    // se presente anche nel buffer delle geometrie allora pesco dal buffer
    if(_.get(attributesBuffers,fid)){
      attributes = attributesBuffers[attributesBuffers.length-1];
    }
    // altrimenti prendo la geometria originale
    else {
      if (isNew){
        var fields = self._vectorLayer.getFields();
        _.forEach(fields,function(field){
          attributes[field.name] = "";
        })
      }
      else {
        var origFeature = vectorLayer.getFeatureById(fid);
        // controllo perché nel frattempo la feature potrebbe essere stata eliminata (l'eliminazione prevede solo di settare a null la geometria)
        if (origFeature){
          attributes = origFeature.getProperties();
        }
      }
    }
    
    var feature = new ol.Feature();
    var addedFeature = (state == 'new' && isNew && !_.isNull(geometry));
    var updatedFeature = (state == 'updated' && !isNew && !_.isNull(geometry));
    var deletedFeature = (state == 'deleted' && !isNew && _.isNull(geometry));
   
    if (addedFeature || updatedFeature){
      feature.setId(fid);
      feature.setGeometry(geometry);
      feature.setProperties(attributes);
      var geoJSONFeature = GeoJSONFormat.writeFeatureObject(feature);
      features.push(geoJSONFeature);
    }
    else if (deletedFeature) {
      features.push(fid);
    }    
  })
  return features;
};

proto._collectRelationsAttributes = function(){
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
      var layer = this._isNewFeature(id) ? this._editVectorLayer : this._vectorLayer;
      layer.getSource().removeFeature(feature);
  } 
  
  if (!_.has(geometriesBuffer,id)){
    geometriesBuffer[id] = [];
  }
  geometriesBuffer[id].push(geometry);
};

proto._addEditToAttributesBuffer = function(feature,attributes,relationsAttributes){
  var fid = feature.getId();
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
};

// guardo se è una feature già presente nel buffer delle nuove geometrie
proto._isNewFeature = function(id){
  return id.toString().indexOf('_new_') > -1;
};

proto.isDirty = function(){
  var geometriesDirty = _.keys(this._geometriesBuffer).length > 0;
  var attributesDirty = _.keys(this._attributesBuffer).length > 0;
  return (geometriesDirty || attributesDirty);
};
