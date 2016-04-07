var inherit = require('g3w/core/utils').inherit;
var G3WObject = require('g3w/core/g3wobject');

function EditBuffer(vector){
  this._vector = vector;
  this._featuresEdits = {}; 
}
inherit(EditBuffer,G3WObject);
module.exports = EditBuffer;

var proto = EditBuffer.prototype;

proto.addFeature = function(feature){
  feature.set('id',Date.now());
  console.log("Inserita nuova feature: (ID: "+feature.get('id')+" "+feature.getGeometry().getCoordinates()+")");
};

proto.updateFeature = function(feature){
};

proto.deleteFeature = function(feature){
};
