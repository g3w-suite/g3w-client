var inherit = require('g3w/core/utils').inherit;
var G3WObject = require('g3w/core/g3wobject');

function EditBuffer(vectorLayer,editVectorLayer){
  this._vectorLayer = vectorLayer;
  this._editVectorLayer = editVectorLayer;
  
  //buffer delle geometrie
  this._geometryBuffer = {
    oldFeatures: {},
    newFeatures: {}
  };
  
  // buffer degli attributi
  this._attributesBuffer = {
    oldFEatures: {},
    newFeatures: {}
  };
}
inherit(EditBuffer,G3WObject);
module.exports = EditBuffer;

var proto = EditBuffer.prototype;

proto.addFeature = function(feature){
  feature.setId(Date.now());
  this._addEditToGeometryBuffer(feature,'add');
  console.log("Inserita nuova feature: (ID: "+feature.get('id')+" "+feature.getGeometry().getCoordinates()+") nel buffer");
};

proto.updateFeature = function(feature){
  this._addEditToGeometryBuffer(feature,'update');
  console.log("Modificata feature: (ID: "+feature.get('id')+" "+feature.getGeometry().getCoordinates()+") nel buffer");
};

proto.deleteFeature = function(feature){
  this._addEditToGeometryBuffer(feature,'delete');
  console.log("Rimossa feature: (ID: "+feature.get('id')+" "+feature.getGeometry().getCoordinates()+") nel buffer");
};

proto.setAttributes = function(feature,attributes){
  this._addEditToAttributesBuffer(feature,attributes);
};

proto._addEditToGeometryBuffer = function(feature,operation){
  var newFeatures = this._geometryBuffer.newFeatures;
  var oldFeatures = this._geometryBuffer.oldFeatures;
  var bufferFeatures;
  
  var id = feature.getId();
  var geometry = feature.getGeometry();
  
  switch (operation){
    case 'add':
      bufferFeatures = newFeatures;
      break;
    case 'update':
      bufferFeatures = oldFeatures;
      break;
    case 'delete':
      bufferFeatures = oldFeatures;
      geometry = null;
      break;
  } 
  if (!_.has(bufferFeatures,id)){
    bufferFeatures[id] = [];
  }
  bufferFeatures[id].push(geometry);
};

proto._addEditToAttributesBuffer = function(feature,operation){
  var newFeatures = this._attributesBuffer.newFeatures;
  var oldFeatures = this._attributesBuffer.oldFeatures;
  var bufferFeatures;
  
  var id = feature.getId();
  // significa che è una nuova feature
  if (_.has(this._geometryBuffer.newFeatures,id)){
    bufferFeatures = newFeatures;
  }
  else {
    bufferFeatures = oldFeatures;
  }
  
  if (!_.has(bufferFeatures,id)){
    bufferFeatures[id] = [];
  }
  bufferFeatures[id].push(geometry);
};
