var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var geom = require('core/geometry/geom');
var PickFeatureInteraction = require('g3w-ol3/src/interactions/pickfeatureinteraction');
var PickCoordinatesInteraction = require('g3w-ol3/src/interactions/pickcoordinatesinteraction');

var EditingTool = require('./editingtool');

function CutLineTool(editor, options){
  this.setters = {
    cutLine: CutLineTool.prototype._cutLine
  };

  base(this,editor,options);
  this.steps = new EditingTool.Steps(CutLineTool.steps);
  this._origFeature = null;
  this._origGeometry = null;
  this._newFeatures = [];
  this._linePickInteraction = null;
  this._pointPickInteraction = null;
  this._pointLayer = options.pointLayer || null;
  this._minCutPointDistance = options.minCutPointDistance || Infinity;
  this._modType = options.modType || 'MODONCUT'; // 'NEWONCUT' | 'MODONCUT'
  //selected line vecor di overlay
  this._selectedLineOverlay = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'rgb(255,255,0)',
        width: 4
      })
    })
  });
  // vetoore della line di overlay che è matentuta
  // ha lo stile di quella originale
  this._lineToKeepOverlay = new ol.layer.Vector({
    source: new ol.source.Vector()
  });
}

inherit(CutLineTool, EditingTool);

module.exports = CutLineTool;

var proto = CutLineTool.prototype;
// funzione che viene chiamata quando viene eseguita il setTool dell'editor
proto.run = function() {
  var self = this;
  this._linePickInteraction = new PickFeatureInteraction({
    layers: [this.layer, this.editingLayer]
  });
  // aggiungo il pick feature interaction
  this.addInteraction(this._linePickInteraction);
  // vado al primo step:
  // In questo caso selzionare la linea da tagliare
  self.steps.next();
  // i metto in ascolto dell'evento picked sulla feature
  this._linePickInteraction.on('picked', function(e) {
    var cutFeature;
    // prendo la feature selzionata
    var feature = self._origFeature = e.feature;
    // clono la geometria della feature selezionata
    self._origGeometry = feature.getGeometry().clone();
    // visualizzo lo show selection
    self._showSelection(self._origGeometry, 300);
    // viene rimossa l'interazione
    self.removeInteraction(this);
    if (self._pointLayer) {
      // se è stato definto il pointLayer (il layer puntuale da utilizzare)
      self._pointPickInteraction = new PickFeatureInteraction({
        layers: [self._pointLayer]
      });
    }
    else {
      // altrimenti uso il pick layer interaction su se stesso
      self._pointPickInteraction = new PickCoordinatesInteraction();
    }
    // pesco coordinata o feature di taglio selezionata
    self.steps.next();
    // ascolto l'emssione dell'evento picked sul layer puntuale o su se stesso
    self._pointPickInteraction.on('picked',function(e) {
      // rimovo l'interazione
      self.removeInteraction(this);
      var coordinate;
      if (e.feature){
        cutFeature = e.feature;
        coordinate = cutFeature.getGeometry().getCoordinates();
      }
      else {
        coordinate = e.coordinate;
      }
      // se ci sono le coordinate del punto
      if (coordinate){
        // snappo sulla linea
        var closestCoordinate = feature.getGeometry().getClosestPoint(coordinate);
        var distance = geom.distance(coordinate,closestCoordinate);
        // se lo snap è entro la tolleranza
        if (distance < self._minCutPointDistance){
          // taglio la linea e ottengo l'array con le due nuove feature
          var slicedLines = self._cut(feature.getGeometry(),closestCoordinate);
          if (slicedLines){
            var prevLineFeature = slicedLines[0];
            var nextLineFeature = slicedLines[1];
            
            var newId = self.editor.generateId();
            prevLineFeature.setId(newId+'_1');
            nextLineFeature.setId(newId+'_2');
            
            // prendo le proprietà della feature originale (esclusa la geometria)
            var origProperties = feature.getProperties();
            delete origProperties[feature.getGeometryName()];
            
            self._showSelection(prevLineFeature.getGeometry(),300);
            setTimeout(function(){
              self._showSelection(nextLineFeature.getGeometry(),300);
            }, 300);
            
            // nel caso di modifica su taglio
            if (self._modType == 'MODONCUT') {
              // seleziono la porzione da mantenere/modificare
              // andando al prossimo next
              self.steps.next();
              self._selectLineToKeep(prevLineFeature, nextLineFeature)
              .then(function(featureToKeep) {
                // aggiorno la feature originale con la geometria della feature che si è selezionato da mantenere
                feature.setGeometry(featureToKeep.getGeometry().clone());
                var featureToAdd;
                // rimuovo una delle due nuove feature e mi tengo l'unica feature da aggiungere come nuova
                if (prevLineFeature.getId() == featureToKeep.getId()){
                  delete prevLineFeature;
                  featureToAdd = nextLineFeature;
                }
                else if (nextLineFeature.getId() == featureToKeep.getId()){
                  delete nextLineFeature;
                  featureToAdd = prevLineFeature;
                }
                self._newFeatures.push(featureToAdd);
                // tramite l'editor assegno alla nuova feature gli stessi attributi dell'altra, originale, modificata
                featureToAdd.setProperties(origProperties);
                // e la aggiungo al layer di editing, così mi viene mostrata come nuova feature sulla mappa
                //self.editor._editVectorLayer.getSource().addFeatures([featureToAdd]);
                self.editingLayer.getSource().addFeatures([featureToAdd]);
                var data = {
                  added: [featureToAdd],
                  updated: feature,
                  cutfeature:cutFeature
                };
                // a questo punto avvio il setter, che si occuperò di aggiornare l'editbuffer a seconda del tipo di modifica
                self.cutLine(data, self._modType)
                .fail(function(){
                  self._rollBack();
                  self.rerun();
                });
              })
            }
            else {
              // nel caso la modifica sia aggiungo su taglia, allora rimuovo l'originale e aggiungo le due nuove feature
              self.layer.getSource().removeFeature(feature);
              //self.editor.setAttributes(prevLineFeature,origProperties);
              //self.editor.setAttributes(nextLineFeature,origProperties);
              self._newFeatures.push(prevLineFeature);
              self._newFeatures.push(nextLineFeature);
              self.editingLayer.getSource().addFeatures([featureToAdd,prevLineFeature]);
              
              var data = {
                added: [prevLineFeature,nextLineFeature],
                removed: feature
              };
              self.cutLine(data, self._modType)
              .fail(function(){
                self._rollBack();
                self.rerun();
              })
            }
          }
          else {
            self.rerun();
          }
        }
      }
    });
    self.addInteraction(self._pointPickInteraction);
  });
};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    this._linePickInteraction.setActive(false);
    this._pointPickInteraction.setActive(false);
  }
  else {
    this._linePickInteraction.setActive(true);
    this._pointPickInteraction.setActive(true);
  }
};

proto.rerun = function(){
  this.stop();
  this.run();
};

proto.stop = function(){
  this._cleanUp();
  var stop = base(this, 'stop');
  if (stop) {
    this.removeInteraction(this._linePickInteraction);
    this.removeInteraction(this._pointPickInteraction);
    this._linePickInteraction = null;
    this._pointPickInteraction = null;
  }

  return stop;
};

proto._cleanUp = function(){
  this.steps.completed();
  this._origFeature = null;
  this._origGeometry = null;
  this._newFeatures = [];
  this._lineToKeepOverlay.setMap(null);
  this._selectedLineOverlay.setMap(null);
  // evito di fare il clean up delle editing features
  //this.editingLayer.getSource().getFeaturesCollection().clear();
};

proto._rollBack = function(){
  // rimetto la vecchia geometria
  this._origFeature.setGeometry(this._origGeometry);
  // rimuovo le feature (nuove) editate dal layer di editazione
  try {
    _.forEach(this._newFeatures,function(feature){
      self.editingLayer.getSource().removeFeature(feature);
    });
  }
  catch (e) {}
};

proto._cutLine = function(data, modType) {
  // se modifico su taglio aggiorno la vecchia feature e aggiungo la nuova
  if (modType == 'MODONCUT') {
    var featureToUpdate = data.updated;
    var featureToAdd = data.added[0];
    this.editor.updateFeature(featureToUpdate);
    this.editor.addFeature(featureToAdd);
  }
  // altrimenti rimuovo la vecchia e aggiungo le nuove
  else{
    var featureToRemove = data.removed;
    var featureToAdd1 = data.added[0];
    var featureToAdd2 = data.added[1];
    this.editor.deleteFeature(featureToRemove);
    this.editor.addFeature(featureToAdd1);
    this.editor.addFeature(featureToAdd2);
  }
  this._busy = false;
  this.pause(false);
  this.rerun();
  return true;
};

proto._selectLineToKeep = function(prevLineFeature,nextLineFeature){
  var d = $.Deferred();
  var self = this;
  var layer = this._lineToKeepOverlay;
  layer.getSource().addFeatures([prevLineFeature,nextLineFeature]);
  layer.setMap(this.editor.getMapService().viewer.map);
  
  var selectLineInteraction = new PickFeatureInteraction({
    layers: [this._lineToKeepOverlay]
  });
  this.addInteraction(selectLineInteraction);
  
  selectLineInteraction.on('picked',function(e){
    layer.setMap(null);
    self.removeInteraction(this);
    d.resolve(e.feature);
  });
  
  return d.promise();
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

proto._cut = function(geometry,cutCoordinate){
  while (cutCoordinate.length < geometry.getLayout().length) {
    cutCoordinate.push(0);
  }

  var minDistance = Infinity;
  var closestIndex = 0;
  var index = 0;
  // cerco l'indice del segmento lineare su cui ricade la coordinata di taglio
  geometry.forEachSegment(function(v0,v1){
    var segmentPoint = geom.closestOnSegment(cutCoordinate,[v0,v1]);
    var distance = geom.distance(cutCoordinate,segmentPoint);
    if (distance < minDistance){
      minDistance = distance;
      closestIndex = index;
    }
    index += 1;
  });
  
  var coordinates = geometry.getCoordinates();
  // prendo la prima porzione di coordinate
  var prevCoords = coordinates.slice(0,closestIndex+1);
  // aggiungo la coordinata di taglio alla prima porzione
  prevCoords.splice(prevCoords.length,0,cutCoordinate);
  // prendo la seconda porzione di coordinate
  var nextCoords = coordinates.slice(closestIndex);
  // aggiungo la coordinata di taglio alla seconda porzione
  nextCoords.splice(0,1,cutCoordinate);
  
  if (prevCoords.length < 2 || nextCoords.length < 2){
    return false;
  }
  
  // creo le geometrie
  var prevLine = new ol.geom.LineString();
  prevLine.setCoordinates(prevCoords);
  var nextLine = new ol.geom.LineString();
  nextLine.setCoordinates(nextCoords);
  
  // creo le nuove feature
  var prevLineFeat = new ol.Feature({
    geometry: prevLine
  });
  var nextLineFeat = new ol.Feature({
    geometry: nextLine
  });
  
  return [prevLineFeat,nextLineFeat];
};


// TODO questo andrà spostato dentro MapService o comunque in una libreria core
// funzione show selection
proto._showSelection = function(geometry, duration){
  var self = this;
  var duration = duration || null;
  // prendo l'elemento(vettore) overlay
  var overlay = this._selectedLineOverlay;
  // creo la feature
  var feature = new ol.Feature();
  // inserisco la geometria della feature precedentemente selezionata
  feature.setGeometry(geometry);
  // l'aggiungo alla feature di overlay
  overlay.getSource().addFeatures([feature]);
  // setto la mappa del vettore di overlay
  // setMap è un metodo del layer di ol3 per far visulizzare temporaneamente un layer
  // la mappa non può interagire con esso. Il layer biene messo on top alla mappa
  overlay.setMap(this.editor.getMapService().viewer.map);
  if (duration) {
    // veridfico se è staato settato la duration
    setTimeout(function(){
      overlay.setMap(null);
      self._selectedLineOverlay.getSource().clear();
    }, duration);
  }
};

proto._isNew = function(feature){
  return (!_.isNil(this.editingLayer.getSource().getFeatureById(feature.getId())));
};

CutLineTool.steps = [
  {
    type: "selectline"
  },
  {
    type: "selectcutpoint"
  },
  {
    type: "selectparttokeep"
  }
];
