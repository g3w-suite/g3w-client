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
  this._vector = null;
  this._editVector = null;
  this._editBuffer = null;
  this._running = false;
  this._sequencer = null;
  
  var options = options || {};
  
  if (options.editattributesonadd) {
    this._editattributesonadd = options.editattributesonadd;
  }
  
  // elenco dei tool e delle relative classi per tipo di geometria (in base a vector.geometrytype)
  this._tools = {
      addfeature: {
        'Point': AddPointTool,
      }
  };
  
  this._setterslisteners = {};
  
  base(this);
}
inherit(Editor,G3WObject);
module.exports = Editor;

var proto = Editor.prototype;

// associa l'oggetto VectorLayer su cui si vuole fare l'editing
proto.setVector = function(vector){
  this.vector = vector;
};

// avvia l'editazione con un determinato tool (es. addfeature)
proto.start = function(toolType){
  // TODO: aggiungere notifica nel caso questo if non si verifichi
  if (this.vector && this.vector.geometrytype){
    var geometrytype = this.vector.geometrytype;
    var toolClass = _.get(this._tools[toolType],geometrytype)
    if (toolClass){
      var tool = this._activeTool = new toolClass(this);
      this._setToolListeners(tool,this._setterslisteners);
      tool.run();
      this._setRunning(true);
    }
  }
};

// termina l'editazione
proto.stop = function(){
  if (this.isRunning()){
    if (this._activeTool) {
      this._activeTool.stop();
      this._activeTool = null;
    }
    this.removeAllListeners();
    if (this._editVector){
      MapService.viewer.removeLayerByName(this._editVector.name);
    }
    this._setRunning(false);
  }
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

proto.getEditVector = function(){
  if (!this._editVector){
    this._editVector = new VectorLayer({
      name: "editvector"
    })
    MapService.viewer.map.addLayer(this._editVector.getLayer());
  }
  return this._editVector;
};
