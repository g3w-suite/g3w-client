var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');
var RelationEditBuffer = require('./relationeditbuffer');

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
  this._relationsBuffers = {};
  /*var relations = editor.getVectorLayer().getRelations();
   if (relations) {
   this._setupRelationsBuffers(relations);
   }*/

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

/*proto._setupRelationsBuffers = function(relations) {
 var self = this;
 _.forEach(relations,function(relation){
 var relationBuffer = RelationEditBuffer(this._editor,relation.name);
 self._relationsBuffers[relation.name] = relationBuffer;
 })
 }*/

proto.addFeature = function(feature) {
  console.log('addFeature Editor Buffer')
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

proto.updateFields = function(feature,relations){
  if(!feature.getId()){
    feature.setId(this.generateId());
  }
  this._addEditToValuesBuffers(feature,relations);
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

proto.hasRelationsEdits = function(fid){
  var hasEdits = false;
  _.forEach(this._relationsBuffers[fid],function(relationBuffer){
    hasEdits = hasEdits || relationBuffer.hasRelationElements();
  })
  return hasEdits;
};

proto.getRelationsEdits = function(fid){
  var relations = {};
  _.forEach(this._relationsBuffers[fid],function(relationBuffer){
    relations[relationBuffer.getRelationName()] = relationBuffer.getRelationElements();
  });
  return relations;
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

proto.collectRelations = function(){
  var relationsEdits = {
    add: [],
    delete: [],
    update: []
  };

  /*
   relationedits: {
   <nome relazione>:
   }
   */
  var relationsElements = {};
  _.forEach(this._relationsBuffers,function(relationsBuffers,fid){

    var newRelationEdits = {
      fid: fid,
      relations: {}
    };
    var updatedRelationEdits = {
      fid: fid,
      relations: {}
    };
    var deletedRelationEdits = {
      fid: fid,
      relations: {}
    };

    _.forEach(relationsBuffers,function (relationBuffer) {
      var relationName = relationBuffer.getRelationName();

      var newElements = relationBuffer.getRelationElements('NEW');
      var updatedElements = relationBuffer.getRelationElements('OLD'); // nel buffer vengono inseriti sempre tutti gli elementi preesistenti (che siano effettivamente affiornati o meno)
      var deletedElements = relationBuffer.getRelationElements('DELETED');


      var newElementsEdits = [];
      var updatedElementsEdits = [];
      var deletedElementsEdits = [];

      _.forEach(newElements,function(element){
        newElementsEdits.push({
          id: element.id,
          fields: element.fields
        })
      });

      _.forEach(updatedElements,function(element){
        updatedElementsEdits.push({
          id: element.id,
          fields: element.fields
        })
      });

      _.forEach(deletedElements,function(element){
        deletedElementsEdits.push({
          id: element.id
        })
      });

      newRelationEdits.relations[relationName] = newElementsEdits;
      updatedRelationEdits.relations[relationName] = updatedElementsEdits;
      deletedRelationEdits.relations[relationName] = deletedElementsEdits;

    });
    relationsEdits.add.push(newRelationEdits);
    relationsEdits.update.push(updatedRelationEdits);
    relationsEdits.delete.push(deletedRelationEdits);

  });
  return relationsEdits;
};

proto._addEditToGeometryBuffer = function(feature,operation) {

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

proto._addEditToValuesBuffers = function(feature,relations){
  var self = this;
  var fid = feature.getId();
  var attributes = feature.getProperties();
  var attributesBuffer = this._attributesBuffer;

  if (!_.has(attributesBuffer,fid)){
    attributesBuffer[fid] = [];
  }
  attributesBuffer[fid].push(attributes);

  if (relations){
    _.forEach(relations,function(relation){
      if (!_.has(self._relationsBuffers,fid)){
        self._relationsBuffers[fid] = {};
      }
      if (!_.has(self._relationsBuffers[fid],relation.name)){
        self._relationsBuffers[fid][relation.name] = new RelationEditBuffer(self,relation.name);
      }

      var relationBuffer = self._relationsBuffers[fid][relation.name];
      relationBuffer.updateRelation(relation);
    });
  }
  this._setDirty();
};

// guardo se Ã¨ una feature giÃ  presente nel buffer delle nuove geometrie
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