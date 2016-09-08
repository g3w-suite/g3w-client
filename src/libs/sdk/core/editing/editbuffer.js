var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');
var RelationEditBuffer = require('./relationeditbuffer');

function EditBuffer(editor) {
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


}
inherit(EditBuffer,G3WObject);

module.exports = EditBuffer;

var proto = EditBuffer.prototype;

//funzione commit
proto.commit = function() {
  // prendo tutte le feature dal vettore di editing dell'editor
  var newFeatures = this._editor.getEditVectorLayer().getFeatures();
  //aggiungo le features nuove al layer vettoriale originale
  this._editor.getVectorLayer().addFeatures(newFeatures);
  // faccio il clear del layere di editing
  this._editor.getEditVectorLayer().clear();
  // faccio il clear del buffer
  this._clearBuffers();
  //faccio il clone del Layer Vector originale della mappa
  this._cloneLayer();
};

proto.undoAll = function(){
  this._resetVectorLayer();
  this._clearBuffers();
};

proto.destroy = function(){
  this._clearBuffers();
};

proto.generateId = function() {
  return this._editor.generateId();
};

/*proto._setupRelationsBuffers = function(relations) {
 var self = this;
 _.forEach(relations,function(relation){
 var relationBuffer = RelationEditBuffer(this._editor,relation.name);
 self._relationsBuffers[relation.name] = relationBuffer;
 })
 }*/
// funzione chee agginge la feature geometrica nel buffer
// geometry
proto.addFeature = function(feature) {
  console.log('addFeature Editor Buffer');
  // nel caso non abbia una un id (caso nuova feature) la genero causale
  if(!feature.getId()) {
    feature.setId(this.generateId());
  }
  // aggiungo la feature al buffer (nel cso di nuova feature
  this._addEditToGeometryBuffer(feature, 'add');
  console.log("Inserita nuova feature: (ID: "+feature.getId()+" "+feature.getGeometry().getCoordinates()+") nel buffer");
};
// funzione chiamata in fase di update della Feature
proto.updateFeature = function(feature) {
  this._addEditToGeometryBuffer(feature, 'update');
  console.log("Modificata feature: (ID: "+feature.getId()+" "+feature.getGeometry().getCoordinates()+") nel buffer");
};

proto.deleteFeature = function(feature){
  this._addEditToGeometryBuffer(feature,'delete');
  console.log("Rimossa feature: (ID: "+feature.getId()+" "+feature.getGeometry().getCoordinates()+") nel buffer");
};
// funzione che server per fare update di una feature
proto.updateFields = function(feature, relations) {
  // nel caso di una nuova feature
  if(!feature.getId()) {
    // genero id random e lo setto alla feature
    feature.setId(this.generateId());
  }
  this._addEditToValuesBuffers(feature, relations);
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
// funzione che se nel buffer delle relazioni
// è stato inserito già modifiche su relazioni di quella feature
proto.hasRelationsEdits = function(fid){
  var hasEdits = false;
  _.forEach(this._relationsBuffers[fid], function(relationBuffer) {
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

proto._addEditToGeometryBuffer = function(feature, operation) {
  // al momento non prende in considerazione, update , add valori di operation
  // in quanto verifica se è una nuova feature o no
  // recupero il buffer delle geometrie
  var geometriesBuffer = this._geometriesBuffer;
  // recupero l'ide della feature
  var id = feature.getId();
  // recupero la geometria
  var geometry = feature.getGeometry();
  // caso operazione delete
  if (operation == 'delete'){
    geometry = null;
    // prendo il layer originale o l'editing Layer
    var layer = this._isNewFeature(id) ? this._editor.getEditVectorLayer() : this._editor.getVectorLayer();
    // rimuovo la feature dalla source
    layer.getSource().removeFeature(feature);
  }
  // se non presente nel geometry buffer
  // creo array riferita a quella feature per monitorare tutte le modifice che avverranno
  // su quella feature
  if (!_.has(geometriesBuffer,id)) {
    geometriesBuffer[id] = [];
  }
  geometriesBuffer[id].push(geometry);
  this._setDirty();
};
// funzione che mette in relazione feature e relazioni
proto._addEditToValuesBuffers = function(feature, relations){
  var self = this;
  // prende id della feature
  var fid = feature.getId();
  // prende gli attributi della feature
  var attributes = feature.getProperties();
  console.log('attributi feature: ',attributes)
  // prendo il buffer degli attributi
  var attributesBuffer = this._attributesBuffer;
  //verifica se l'oggetto attributebuffer ha l'id del layer
  if (!_.has(attributesBuffer, fid)) {
    //nel caso non ci sia crea la chiave e assegna un array vuoto
    attributesBuffer[fid] = [];
  }
  // a quel punto inserisco una nuova modifica nell'array delle modifiche
  // che rigurada quella particolare feature identificata dalla chiave id
  attributesBuffer[fid].push(attributes);
  // se snono state passate relazioni
  if (relations) {
    // clico su ognuna di essere
    _.forEach(relations, function(relation) {
      //se esiste già nell'oggetto relation buffer legate a quella feature
      if (!_.has(self._relationsBuffers, fid)) {
        // atrimenti faccio come ho fatto sopra per il buffer degli attributi
        // ma ora sul buffer delle relazioni e non più un array ma un ogetto
        // caratterizzato dal nome della relazione
        self._relationsBuffers[fid] = {};
      }
      // verifico oltre alla chiave della feature se contiene il nome della relazione
      // che non è altro il nome del layer che in relazione con la feature del layer che si sta
      // editando
      if (!_.has(self._relationsBuffers[fid], relation.name)) {
        // se non presente creo una nuova istanza di RelationEditBuffer
        self._relationsBuffers[fid][relation.name] = new RelationEditBuffer(self, relation.name);
      }
      // prendo l'istanza di RelationEditBuffer (creata sul momento o esistente)
      var relationBuffer = self._relationsBuffers[fid][relation.name];
      // chiamo il metodo updateRelation dell'istanza
      relationBuffer.updateRelation(relation);
    });
  }
  this._setDirty();
};

// guardo se è una feature già  presente nel buffer delle nuove geometrie
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
//funzione cloneLayer
proto._cloneLayer = function() {
  var clonedFeatures = [];
  //ciclo sul tutte le feature del layer vettoriale originale
  this._editor._vectorLayer.getSource().forEachFeature(function(feature) {
    clonedFeatures.push(feature.clone());
  }, this);
  // aggiungo tali feature sul layer "originale del buffer"
  this._origVectorLayer.getSource().addFeatures(clonedFeatures);
};