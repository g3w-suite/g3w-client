var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');
var MapService = require('g3w/core/mapservice');
var VectorLayer = require('g3w/core/vectorlayer');

//var Sequencer = require('./stepsequencer');
var AddPointTool = require('./tools/addpointtool');
var EditBuffer = require('./editbuffer');

// Editor di vettori puntuali
function Editor(options){
  this._vectorLayer = null;
  this._editVectorLayer = null;
  this._editBuffer = null;
  this._running = false;
  
  this._setterslisteners = {};
  this._geometrytypes = [
    'Point',
    //'MultiPoint',
    'LineString',
    'MultiLineString',
    //'Polygon',
    //'MultiPolygon'
  ];
  
  // elenco dei tool e delle relative classi per tipo di geometria (in base a vector.geometrytype)
  this._toolsForTypes = {
      'Point': {
        addfeature: AddPointTool
      }
  };
  
  this._tools = {};
  
  base(this);
}
inherit(Editor,G3WObject);
module.exports = Editor;

var proto = Editor.prototype;

// associa l'oggetto VectorLayer su cui si vuole fare l'editing
proto.setVectorLayer = function(vectorLayer){
  var geometrytype = vectorLayer.geometrytype;
  if (!geometrytype || ! this._isCompatibleType(geometrytype)){
    throw Error("Vector geometry type "+geometrytype+" is not valid for editing");
  }
  this._setToolsForVectorType(geometrytype);
  this._vectorLayer = vectorLayer;
};

// avvia l'editazione con un determinato tool (es. addfeature)
proto.start = function(toolType){
  // TODO: aggiungere notifica nel caso questo if non si verifichi
  var res = false;
  // se è stato settato il vectorLayer
  if (this._vectorLayer){
    var toolClass = this._tools[toolType];
    // se esiste il tool richiesto
    if (toolClass){
      // istanzio l'editVectorLayer
      this._editVectorLayer = new VectorLayer({
        name: "editvector"
      })
      MapService.viewer.map.addLayer(this._editVectorLayer.getLayer());
      
      // istanzio l'EditBuffer
      this._editBuffer = new EditBuffer(this._vectorLayer,this._editVectorLayer);
      
      var tool = this._activeTool = new toolClass(this);
      this._setToolListeners(tool,this._setterslisteners);
      tool.run();
      this._setRunning(true);
      res = true
    }
  }
  return res;
};

// termina l'editazione
proto.stop = function(){
  if (this.isRunning()){
    if (this._activeTool) {
      this._activeTool.stop();
      this._activeTool = null;
    }
    this.removeAllListeners();
    if (this._editVectorLayer){
      MapService.viewer.removeLayerByName(this._editVectorLayer.name);
    }
    this._setRunning(false);
  }
  return true;
};

proto.isRunning = function(){
  return this._running;
};

proto.getActiveTool = function(){
  return this._activeTool;
};

// permette di inserire un setter listener sincrono prima che venga effettuata una operazione da un tool (es. addfeature)
proto.onbefore = function(setter,listener){
  this._onbeforetoolaction(setter,listener,false);
};

// come onbefore() ma per listener asincroni
proto.onbeforeasync = function(setter,listener){
  this._onbeforetoolaction(setter,listener,true);
};

proto._isCompatibleType = function(geometrytype){
  return this._geometrytypes.indexOf(geometrytype) > -1;
};

proto._setToolsForVectorType = function(geometrytype){
  var self = this;
  var tools = this._toolsForTypes[geometrytype];
  _.forEach(tools,function(toolClass,tool){
    self._tools[tool] = toolClass;
  })
};

proto._onbeforetoolaction = function(setter,listener,async){
  if (!_.get(this._setterslisteners,setter)){
    this._setterslisteners[setter] = [];
  }
  this._setterslisteners[setter].push({
    fnc: listener,
    how: async ? 'async' : 'sync'
  });
}

// una volta istanziato il tool aggiungo a questo tutti i listener definiti a livello di editor
proto._setToolListeners = function(tool,settersListeners){
  _.forEach(settersListeners,function(listeners,setter){
    _.forEach(listeners,function(listener){
      if (listener.how == 'sync'){
        tool.onbefore(setter,listener.fnc);
      }
      else {
        tool.onbeforeasync(setter,listener.fnc);
      }
    })
  })
};

proto._setRunning = function(bool){
  this._running = bool;
}

proto.addFeature = function(feature){
  this._editBuffer.addFeature(feature);
};

proto.updateFeature = function(feature){
};

proto.deleteFeature = function(feature){
};

proto.getEditVectorLayer = function(){
  return this._editVectorLayer;
};
