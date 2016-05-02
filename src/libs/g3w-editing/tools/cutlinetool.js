var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var geom = require('g3w/core/geom');
var G3WObject = require('g3w/core/g3wobject');
var MapService = require('g3w/core/mapservice');
var PickCoordinatesInteraction = require('g3w/core/interactions/pickcoordinatesinteraction');
var PickFeatureInteraction = require('g3w/core/interactions/pickfeatureinteraction');

function CutLineTool(editor,options){
  var self = this;
  this.editor = editor;
  this.isPausable = true;
  this.layer = null;
  this.editingLayer = null;
  
  this._origGeometry = null;
  this._linePickInteraction = null;
  this._pointPickInteraction = null;
  this._pointLayer = options.pointLayer || null;
  this._minCutPointDistance = options.minCutPointDistance || Infinity;
  
  this._selectedLineOverlay = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'rgb(255,255,0)',
        width: 4
      })
    })
  });

  this.setters = {
    modifyLines: CutLineTool.prototype._modifyLines
  };
  
  base(this);
}
inherit(CutLineTool,G3WObject);
module.exports = CutLineTool;

var proto = CutLineTool.prototype;

proto.run = function(){
  var self = this;
  var map = MapService.viewer.map;
  this.layer = this.editor.getVectorLayer().getLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getLayer();
  
  this._linePickInteraction = new PickFeatureInteraction({
    layers: [this.layer,this.editingLayer]
  });
  
  map.addInteraction(this._linePickInteraction);
  
  this._linePickInteraction.on('picked',function(e){
    var feature = e.feature;
    self._showSelection(feature,300);
    self._origGeometry = feature.getGeometry();
    map.removeInteraction(this);

    
    if (self._pointLayer){
      self._pointPickInteraction = new PickFeatureInteraction({
        layers: [self._pointLayer]
      });
    }
    else {
      self._pointPickInteraction = new PickCoordinatesInteraction();
    }
    self._pointPickInteraction.on('picked',function(e){
      if (e.feature){
        
      }
      if (e.coordinate){
        var closestCoordinate = feature.getGeometry().getClosestPoint(e.coordinate);
        var distance = geom.distance(e.coordinate,closestCoordinate);
        if (distance < self._minCutPointDistance){
          var slicedLines = self._cutLine(feature.getGeometry(),closestCoordinate);
          if (slicedLines){
            self.modifyLines(slicedLines)
            .fail(function(){
              self.loop();
            })
          }
          else {
            self.loop();
          }
        }
      }
    })
    map.addInteraction(self._pointPickInteraction);
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

proto.loop = function(){
  this.stop();
  this.run();
};

proto.stop = function(){
  var map = MapService.viewer.map;
  map.removeInteraction(this._selectInteraction);
  map.removeInteraction(this._pointPickInteraction);
  return true;
};

proto._modifyLines = function(slicedLines){
  //this.editor.updateFeature(feature,isNew);
  console.log("Pronto per inserire le modifiche di "+slicedLines);
  this._busy = false;
  this.pause(false);
  return true;
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

proto._cutLine = function(geometry,cutCoordinate){
  while (cutCoordinate.length < geometry.getStride()) {
    cutCoordinate.push(0);
  }

  var minDistance = Infinity;
  var closestIndex = 0;
  var index = 0;
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
  var prevCoords = coordinates.slice(0,closestIndex+1);
  prevCoords.splice(prevCoords.length,0,cutCoordinate);
  var nextCoords = coordinates.slice(closestIndex);
  nextCoords.splice(0,1,cutCoordinate);
  
  if (prevCoords.length < 2 || nextCoords.length < 2){
    return false;
  }
  
  var prevLine = new ol.geom.LineString();
  prevLine.setCoordinates(prevCoords);
  var nextLine = new ol.geom.LineString();
  nextLine.setCoordinates(nextCoords);

  var prevLineFeat = new ol.Feature({
    geometry: prevLine
  });
  var nextLineFeat = new ol.Feature({
    geometry: nextLine
  });
  
  var self = this;
  this._showSelection(prevLineFeat,300);
  setTimeout(function(){
    self._showSelection(nextLineFeat,300);
  },300)
  
  return [prevLineFeat,nextLineFeat];
};

proto._showSelection = function(feature,duration){
  var self = this;
  var duration = duration || null;
  var map = MapService.viewer.map;
  var overlay = this._selectedLineOverlay;
  overlay.getSource().addFeatures([feature]);
  overlay.setMap(map);
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
