var inherit = require('g3w/core/utils').inherit;
var StateProvider = require('g3w/core/stateprovider');
var ProjectService = require('g3w/core/projectservice');
var MapService = require('g3w/core/mapservice');
var VectorLayer = require('g3w/core/vectorlayer');

var PointEditor = require('./editors/pointeditor');
var LineEditor = require('./editors/lineeditor');

function IternetService(){
  var self = this;
  var editors = {
    accessi: new PointEditor,
    giunzioni: new PointEditor,
    strade: new LineEditor
  };
  
  // test listener transizione editor
  editors.accessi.onTransition("addpoint","addstarted",function(next){
      console.log("Uno step prima dell'avvio");
      //next(false);
      next();
    }
  );
  
  var vectors = {
    accessi: null,
    giunzioni: null,
    strade: null
  };
  
  var editingConstraints = {
    resolution: 1
  }
  
  this.state = {
    editingEnabled: false,
    editingOn: false,
    retrievingData: false
  };
  
  MapService.onafter('setResolution',function(resolution){
    self.state.editingEnabled = (resolution < editingConstraints.resolution) ? true : false;
  });
  
  this.init = function(config){
    this.config = config;
  };
  
  this.togglEditing = function(){
    if (this.state.editingEnabled && !this.state.editingOn){
      this._startEditing();
    }
    else if (this.state.editingOn) {
      this._stopEditing();
    }
  };
  
  this._startEditing = function(){
    this._getData()
    .then(function(data){
      self._addToMap();
      self.emit("editingstarted");
      self.state.editingOn = true;
      // test avvio editor
      var editor = editors.accessi;
      editor.setVector(vectors.accessi);
      editor.startAdd();
    })
  };
  
  this._stopEditing = function(){
    _.forEach(vectors,function(vector, key){
      MapService.viewer.removeLayerByName(vector.name);
      delete vector;
      vectors[key]= null;
    });
    editors.accessi.stop();
    self.state.editingOn = false;
  };
  
  this._addToMap = function(){
    var map = MapService.viewer.map;
    _.forEach(vectors,function(vector){
      map.addLayer(vector.olLayer);
    })
  };
  
  this._getData = function(){
    this.state.retrievingData = true;
    return $.when(
      self._getLayerData(self.config.layers.accessi),
      self._getLayerData(self.config.layers.giunzioni),
      self._getLayerData(self.config.layers.strade)
    )
    .then(function(accessi,giunzioni,strade){
      var layerAccessi = self.config.layers.accessi;
      var vectorAccessi = vectors.accessi = self._createVector({
        geometrytype: accessi.geometrytype,
        format: accessi.format,
        crs: "EPSG:3003",
        id: layerAccessi.id,
        name: layerAccessi.name
      });
      vectorAccessi.addFeatures(accessi.vector.data);
      var layerGiunzioni = self.config.layers.giunzioni;
      var vectorGiunzioni = vectors.giunzioni = self._createVector({
        geometrytype: giunzioni.geometrytype,
        format: giunzioni.format,
        crs: "EPSG:3003",
        id: layerGiunzioni.id,
        name: layerGiunzioni.name
      });
      vectorGiunzioni.addFeatures(giunzioni.vector.data);
      var layerStrade = self.config.layers.strade;
      var vectorStrade = vectors.strade = self._createVector({
        geometrytype: strade.geometrytype,
        format: strade.format,
        crs: "EPSG:3003",
        id: layerStrade.id,
        name: layerStrade.name,        
      });
      vectorStrade.addFeatures(strade.vector.data);
      self.state.retrievingData = false;
    })
    .fail(function(){
      self.state.retrievingData = false;
    })
  };
  
  this._createVector = function(options,data){
    var vector = new VectorLayer(options);
    return vector;
  };
  
  this._getLayerData = function(layerConfig){
    var d = $.Deferred();
    var bbox = MapService.state.bbox;
    $.get("/it/iternet/api/editing/"+layerConfig.name+"/?in_bbox="+bbox[0]+","+bbox[1]+","+bbox[2]+","+bbox[3])
    .done(function(data){
      d.resolve(data)
    })
    .fail(function(){
      d.reject();
    })
    return d.promise();
    /*var data;
    var resolvedValue = require('g3w/core/utils').resolvedValue;
    switch (layerConfig.name){
      case "accesso":
        data = require('./data/accessi');
        break;
      case "giunzione_stradale":
        data = require('./data/giunzioni_stradali');
        break;
      case "elemento_stradale":
        data = require('./data/elementi_stradali');
        break;
    }
    return resolvedValue(data);*/
  };
}
inherit(IternetService,StateProvider);

module.exports = new IternetService;
