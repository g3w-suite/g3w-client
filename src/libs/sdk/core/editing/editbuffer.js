var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');
var RelationEditBuffer = require('./relationeditbuffer');

function EditBuffer(editor) {
  //editor a cui appartiene
  this._editor = editor;
  // clone del vector layer originale
  this._origVectorLayer = new ol.layer.Vector({
    source: new ol.source.Vector()
  });
  // clona il vector layer originale vecotr layer
  this._cloneLayer();
  //buffer delle geometrie
  this._geometriesBuffer = {};
  // buffer degli attributi
  this._attributesBuffer = {};
  // buffer degli attributi delle relazioni
  this._relationsBuffers = {};
}
inherit(EditBuffer, G3WObject);

module.exports = EditBuffer;

var proto = EditBuffer.prototype;

//funzione commit
proto.commit = function() {
  var self = this;
  var vectorLayer = this._editor.getVectorLayer();
  // prendo tutte le feature dal vettore di editing dell'editor
  var newFeatures = this._editor.getEditVectorLayer().getFeatures();
  if (newFeatures) {
    //aggiungo le features nuove al layer vettoriale originale
    // che vengono visualizzate sul vector layer
    _.forEach(newFeatures, function(feature, index) {
      newFeatures[index] = self._editor._transformCoordinateFeatureFromLayerToMap(feature);
    });
    vectorLayer.addFeatures(newFeatures);
  }
  var editGeometryBuffer = this._geometriesBuffer;
  _.forEach(editGeometryBuffer, function(geometry, featureId) {
    if (!self._isNewFeature(featureId)) {
      var feature = vectorLayer.getFeatureById(featureId);
      //caso di update .. nel caso di delete la feature è nulla
      if (feature) {
        feature = self._editor._transformCoordinateFeatureFromLayerToMap(feature);
        //RISETTO FEATURE STYLE AL VECCHIO
        feature.setStyle(null);
        vectorLayer.modifyFeatureGeometry(featureId, feature.getGeometry());
      }
    }
  });
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

// funzione che agginge la feature geometrica nel buffer
// geometry
proto.addFeature = function(feature) {
  // nel caso non abbia una un id (caso nuova feature) la genero causale
  if(!feature.getId()) {
    feature.setId(this.generateId());
  }
  // aggiungo la feature al buffer (nel cso di nuova feature
  this._addEditToGeometryBuffer(feature, 'add');
};
// funzione chiamata in fase di update della Feature
proto.updateFeature = function(feature) {
  this._addEditToGeometryBuffer(feature, 'update');
};

proto.deleteFeature = function(feature, relations) {
  // aggiunge alla editbuffer la geometria della feature cancellata
  this._addEditToGeometryBuffer(feature, 'delete');
  //vado anche ad aggiungere al buffer delle relazioni da cancellare
  // relative alla feature cancellata
  this._addEditToValuesBuffers(feature, relations, 'delete');
};

// funzione che server per fare update di una feature
proto.updateFields = function(feature, relations) {
  // nel caso di una nuova feature
  if(!feature.getId()) {
    // genero id random e lo setto alla feature
    feature.setId(this.generateId());
  }// vado a chiamare la funzione che mi aggiorna i campi della feature e delle relazioni
  this._addEditToValuesBuffers(feature, relations);
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
  });
  return hasEdits;
};

proto.getRelationsEdits = function(fid){
  var relations = {};
  _.forEach(this._relationsBuffers[fid], function(relationBuffer){
    relations[relationBuffer.getRelationName()] = relationBuffer.getRelationElements();
  });
  return relations;
};
// funzione che colleziona tutti gli (unici) delle featues modificate
// dei buffer geometry e attribute
proto.collectFeatureIds = function() {

  var geometriesBuffers = this._geometriesBuffer;
  var attributesBuffers = this._attributesBuffer;
  var modifiedFids = [];
  modifiedFids = _.concat(modifiedFids,_.keys(geometriesBuffers));
  modifiedFids = _.concat(modifiedFids,_.keys(attributesBuffers));
  return _.uniq(modifiedFids);
};
// che colleziona tutte le modifche fatte quando viene premuto o fatto salva
// dall'editor o passaggio da un editing isNewdi un layer all'altro
proto.collectFeatures = function(state, asGeoJSON){
  var self = this;
  var geometriesBuffers = this._geometriesBuffer;

  var attributesBuffers = this._attributesBuffer;
  var asGeoJSON = asGeoJSON || false;
  // prendo il jsono format per poter poi fare il posto verso il server
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
  _.forEach(modifiedFids, function(fid) {
    var feature = layer.getFeatureById(fid);
    var isNew = self._isNewFeature(fid);
    var addedFeature = (state == 'new' && isNew && feature);
    var updatedFeature = (state == 'updated' && !isNew && feature);
    var deletedFeature = (state == 'deleted' && !isNew && !feature);
    if (addedFeature || updatedFeature) {
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

proto.createFeature = function(fid, geometry, attributes) {
  var feature = new ol.Feature();
  feature.setId(fid);
  feature.setGeometry(geometry);
  feature.setProperties(attributes);
  return feature;
};
// funzione richiamata dall'edior che mmi servono poi per inviarle via post al server
// Tale funzione riporta tutte le informazioni relative alle relazioni
proto.collectRelations = function() {
    // costruisco l'oggetto relations edit
    // che servirà per separare i tipi di azioni da fare sulle singole relazioni
    // update, add, delete
  var relationsEdits = {
    add: [],
    delete: [],
    update: []
  };
  // scorro sul relation buffers
  _.forEach(this._relationsBuffers, function(relationsBuffers, fid) {
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
    _.forEach(relationsBuffers, function (relationBuffer) {

      var relationName = relationBuffer.getRelationName();
      var newElements = relationBuffer.getRelationElementsOnlyFieldsValues('NEW');
      var updatedElements = relationBuffer.getRelationElementsOnlyFieldsValues('OLD'); // nel buffer vengono inseriti sempre tutti gli elementi preesistenti (che siano effettivamente affiornati o meno)
      var deletedElements = relationBuffer.getRelationElementsOnlyFieldsValues('DELETED');

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
  this._setDirty(true);
};

proto._addDeleteRelationsBuffers = function(relations) {
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
};
// funzione che mette in relazione feature e relazioni
// e aggiorna i campi della feature nell'editbuffer
proto._addEditToValuesBuffers = function(feature, relations) {
  var self = this;
  // prende id della feature
  var fid = feature.getId();
  // prende gli attributi della feature
  var attributes = feature.getProperties();
  // prendo il buffer degli attributi
  var attributesBuffer = this._attributesBuffer;
  //verifica se l'oggetto attributebuffer ha l'id del layer
  if (!_.has(attributesBuffer, fid)) {
    //nel caso non ci sia crea la chiave e assegna un array vuoto
    attributesBuffer[fid] = [];
  }
  // a quel punto inserisco una nuova modifica nell'array delle modifiche
  // che rigurada quella particolare feature identificata dalla chiave id
  // dentro negli attributi c'è anche la geometria
  attributesBuffer[fid].push(attributes);
  // se snono state passate relazioni
  if (relations) {
    // ciclo su ognuna di esse
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
  this._setDirty(true);
};

// guardo se è una feature già  presente nel buffer delle nuove geometrie
proto._isNewFeature = function(fid){
  //return id.toString().indexOf('_new_') > -1;
  return this._editor.isNewFeature(fid);
};
// funzione edit buffer che chiama il set dirty
proto._setDirty = function(bool) {
  // faccio un OR logico tra quello inviato da qualsiasi punto del'edit buffer
  // o quello dal relationEditBuffer object (che si può verificare)
  // nel caso in cui faccio un clena dell'editing della relazione
  // e la verifica sei i vari buffer sono oggetti vuoti
  var isDirty = bool || !_.isEmpty(this._geometriesBuffer) || !_.isEmpty(this._attributesBuffer) || !_.isEmpty(this._relationsAttributesBuffer);
  this._editor._setDirty(isDirty);
};

proto._resetVectorLayer = function(){
  this._editor.vectoLayer = this._origVectorLayer;
  this._origVectorLayer.getSource().clear();
};
// fa il cela di tutti i buffers
// e chiama il setDirty dell'edito passanogli false
// quindi disabilitando il tasto salva per inviare le modifiche
proto._clearBuffers = function() {
  this._geometriesBuffer = {};
  this._attributesBuffer = {};
  this._relationsAttributesBuffer = {};
  this._editor._setDirty(false);
};
//funzione cloneLayer
proto._cloneLayer = function() {
  var clonedFeatures = [];
  //ciclo sul tutte le feature del layer vettoriale originale
  this._editor.getVectorLayer().getSource().forEachFeature(function(feature) {
    clonedFeatures.push(feature.clone());
  }, this);
  // aggiungo tali feature sul layer "originale del buffer"
  this._origVectorLayer.getSource().addFeatures(clonedFeatures);
};