var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var geom = require('g3w/core/geom');
var MapService = require('g3w/core/mapservice');
var PickCoordinatesInteraction = require('g3w/core/interactions/pickcoordinatesinteraction');
var PickFeatureInteraction = require('g3w/core/interactions/pickfeatureinteraction');

var EditingTool = require('./tool');



function CutLineTool(editor,options){
  this.setters = {
    cutLine: CutLineTool.prototype._cutLine
  };
  
  base(this,editor,options);
  
  var self = this;
  this.isPausable = true;
  this.steps = new EditingTool.Steps(CutLineTool.steps);
  
  this._origFeature = null;
  this._origGeometry = null;
  this._newFeatures = [];
  this._linePickInteraction = null;
  this._pointPickInteraction = null;
  this._selectLineToKeepInteraction = null;
  this._pointLayer = options.pointLayer || null;
  this._minCutPointDistance = options.minCutPointDistance || Infinity;
  this._modType = options.modType || 'MODONCUT'; // 'NEWONCUT' | 'MODONCUT'
  
  this._selectedLineOverlay = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'rgb(255,255,0)',
        width: 4
      })
    })
  });
  
  //var cutLineIdx = 0;
  //var cutLineColors = ['rgb(255,0,0)','rgb(0,0,255)']
  this._lineToKeepOverlay = new ol.layer.Vector({
    source: new ol.source.Vector(),
    /*style: function(feature){ 
      cutLineIdx += 1;
      return [new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: cutLineColors[cutLineIdx%2],
          width: 4
        })
      })]
    }*/
  });

  
}
inherit(CutLineTool,EditingTool);
module.exports = CutLineTool;

var proto = CutLineTool.prototype;

proto.run = function(){
  var self = this;
  
  this._linePickInteraction = new PickFeatureInteraction({
    layers: [this.layer,this.editingLayer]
  });
  
  this.map.addInteraction(this._linePickInteraction);
  
  // seleziono la linea da tagliare
  self.steps.next();
  this._linePickInteraction.on('picked',function(e){
    var cutFeature;
    var feature = self._origFeature = e.feature;
    self._origGeometry = feature.getGeometry().clone();
    self._showSelection(self._origGeometry,300);
    self.map.removeInteraction(this);

    
    if (self._pointLayer){
      self._pointPickInteraction = new PickFeatureInteraction({
        layers: [self._pointLayer]
      });
    }
    else {
      self._pointPickInteraction = new PickCoordinatesInteraction();
    }
    
    // pesco coordinata o feature di taglio selezionata
    self.steps.next();
    self._pointPickInteraction.on('picked',function(e){
      self.map.removeInteraction(this);
      var coordinate;
      if (e.feature){
        cutFeature = e.feature;
        coordinate = cutFeature.getGeometry().getCoordinates();
      }
      else {
        coordinate = e.coordinate;
      }
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
            },300)
            
            // nel caso di modifica su taglio
            if (self._modType == 'MODONCUT'){
              // seleziono la porzione da mantenere/modificare
              self.steps.next();
              self._selectLineToKeep(prevLineFeature,nextLineFeature)
              .then(function(featureToKeep){
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
                self.editingLayer.getSource().addFeatures([featureToAdd]);
                
                var data = {
                  added: [featureToAdd],
                  updated: feature,
                  cutfeature:cutFeature
                }
                
                // a questo punto avvio il setter, che si occuperò di aggiornare l'editbuffer a seconda del tipo di modifica
                self.cutLine(data,self._modType)
                .fail(function(){
                  self._rollBack();
                  self.rerun();
                })
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
              }
              
              self.cutLine(data,self._modType)
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
    })
    self.map.addInteraction(self._pointPickInteraction);
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
  
  var stop = EditingTool.prototype.stop.call(this);
  
  if (stop) {
    this.map.removeInteraction(this._linePickInteraction);
    this.map.removeInteraction(this._pointPickInteraction);
    this._linePickInteraction = null;
    this._pointPickInteraction = null;
  }

  return stop;
};

proto._cleanUp = function(){
  this._origFeature = null;
  this._origGeometry = null;
  this._newFeatures = [];
  this._lineToKeepOverlay.setMap(null);
  this._selectedLineOverlay.setMap(null);
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
  catch (e) {};
};

proto._cutLine = function(data,modType){
  // se modifico su taglio aggiorno la vecchia feature e aggiungo la nuova
  if (modType == 'MODONCUT'){
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
  this.steps.completed();
  this.rerun();
  return true;
};

proto._selectLineToKeep = function(prevLineFeature,nextLineFeature){
  var d = $.Deferred();
  var self = this;
  var layer = this._lineToKeepOverlay;
  layer.getSource().addFeatures([prevLineFeature,nextLineFeature]);
  layer.setMap(this.map);
  
  var selectLineInteraction = new PickFeatureInteraction({
    layers: [this._lineToKeepOverlay],
  });
  this.map.addInteraction(selectLineInteraction);
  
  selectLineInteraction.on('picked',function(e){
    layer.setMap(null);
    self.map.removeInteraction(this);
    d.resolve(e.feature);
  });
  
  return d.promise();
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

proto._cut = function(geometry,cutCoordinate){
  while (cutCoordinate.length < geometry.getStride()) {
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
  })
  
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
proto._showSelection = function(geometry,duration){
  var self = this;
  var duration = duration || null;
  var overlay = this._selectedLineOverlay;
  
  var feature = new ol.Feature();
  feature.setGeometry(geometry);
  overlay.getSource().addFeatures([feature]);
  overlay.setMap(this.map);
  if(duration){
    setTimeout(function(){
      overlay.setMap(null);
      self._selectedLineOverlay.getSource().clear();
    },duration);
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
]
