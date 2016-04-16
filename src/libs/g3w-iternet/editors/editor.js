var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var resolvedValue = require('g3w/core/utils').resolvedValue;
var rejectedValue = require('g3w/core/utils').rejectedValue;
var G3WObject = require('g3w/core/g3wobject');
var MapService = require('g3w/core/mapservice');
var VectorLayer = require('g3w/core/vectorlayer');

//var Sequencer = require('./stepsequencer');
var AddPointTool = require('./tools/addpointtool');
var MoveFeatureTool = require('./tools/movepointtool');
var DeleteFeatureTool = require('./tools/deletefeaturetool');
var PickFeatureTool = require('./tools/pickfeaturetool');
var EditBuffer = require('./editbuffer');

var EditorGeometryTypes = [
  'Point',
  //'MultiPoint',
  'LineString',
  'MultiLineString',
  //'Polygon',
  //'MultiPolygon'
];

// Editor di vettori puntuali
function Editor(options){
  this._vectorLayer = null;
  this._editVectorLayer = null;
  this._editBuffer = null;
  
  this._withFeatureLocks = false;
  this._featureLocks = null;
  
  this._started = false;
  
  this._setterslisteners = {
      before: {},
      after: {}
  };
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
        addfeature: AddPointTool,
        movefeature: MoveFeatureTool,
        deletefeature: DeleteFeatureTool,
        pickfeature: PickFeatureTool
      },
      'LineString': {
        movefeature: MoveFeatureTool
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

proto.setFeatureLocks = function(featureLocks){
  this._withFeatureLocks = true;
  this._featureLocks = featureLocks;
};

// avvia la sessione di editazione con un determinato tool (es. addfeature)
proto.start = function(){
  // TODO: aggiungere notifica nel caso questo if non si verifichi
  var res = false;
  // se è stato settato il vectorLayer
  if (this._vectorLayer){
    
    // istanzio l'editVectorLayer
    this._editVectorLayer = new VectorLayer({
      name: "editvector"
    })
    MapService.viewer.map.addLayer(this._editVectorLayer.getLayer());
    
    // istanzio l'EditBuffer
    this._editBuffer = new EditBuffer(this._vectorLayer,this._editVectorLayer);
    this._setStarted(true);
    res = true;
  }
  return res;
};

// termina l'editazione
proto.stop = function(){
  if (this.isStarted()){
    if (this.stopTool()) {
      this.removeAllListeners();
      MapService.viewer.removeLayerByName(this._editVectorLayer.name);
      this._editBuffer = null;
      this._setStarted(false);
      return true;
    }
    return false;
  }
  return true;
};

proto.getEditedFeatures = function(){
  return this._editBuffer.getFeatures();
};

proto.getFieldsWithAttributes = function(fid){
  if (!fid){
    return this._vectorLayer.getFieldsWithAttributes(fid);
  }
  else {
    var attributes;
    var fields = this._vectorLayer.getFields();
    
    var hasEdits = this._editBuffer.areFeatureAttributesEdited(fid);
    if (hasEdits){
      attributes = this._editBuffer.getFeatureAttributes(fid);
      _.forEach(fields,function(field){
        field.value = attributes[field.name];
      });
    }
    else{ // se non ha edits allora si sta chiedendo sicuramente una feature vecchia
      fields = this._vectorLayer.getFieldsWithAttributes(fid);
    }
    return fields;
  }
};

proto.getRelationsWithAttributes = function(fid){
  var fieldsPromise;
  if (!fid){
    fieldsPromise = this._vectorLayer.getRelationsWithAttributes(fid);
  }
  else {    
    var hasEdits = this._editBuffer.areFeatureRelationsEdited(fid);
    if (hasEdits){
      var relations = this._vectorLayer.getRelations();
      var relationsAttributes = this._editBuffer.getRelationsAttributes(fid);
      _.forEach(relationsAttributes,function(relation,relationKey){
        _.forEach(relations[relationKey].fields,function(field){
          field.value = relationsAttributes[relationKey][field.name];
        });
      });
      
      fieldsPromise = resolvedValue(relations);
    }
    else{ // se non ha edits allora si sta chiedendo sicuramente una feature vecchia
      fieldsPromise = this._vectorLayer.getRelationsWithAttributes(fid);
    }
  }
  return fieldsPromise;
};

proto.isDirty = function(){
  return this._editBuffer ? this._editBuffer.isDirty() : false;
};

proto.setTool = function(toolType){
  if (!this.stopTool()){
    return false;
  }
  var toolClass = this._tools[toolType];
  
  // se esiste il tool richiesto
  if (toolClass ){
    var tool = this._activeTool = new toolClass(this);
    this._setToolListeners(tool,this._setterslisteners);
    tool.run();
    return true;
  }
};

proto.stopTool = function(){
  if (this._activeTool && !this._activeTool.stop()){
    return false;
  }
  this._activeTool = false;
  return true;
};

proto.isStarted = function(){
  return this._started;
};

proto.getActiveTool = function(){
  return this._activeTool;
};

proto.onafter = function(setter,listener){
  this._onaftertoolaction(setter,listener);
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

proto._onaftertoolaction = function(setter,listener){
  if (!_.get(this._setterslisteners,setter)){
    this._setterslisteners.after[setter] = [];
  }
  this._setterslisteners.after[setter].push({
    fnc: listener
  });
}

proto._onbeforetoolaction = function(setter,listener,async){
  if (!_.get(this._setterslisteners,setter)){
    this._setterslisteners.before[setter] = [];
  }
  this._setterslisteners.before[setter].push({
    fnc: listener,
    how: async ? 'async' : 'sync'
  });
}

// una volta istanziato il tool aggiungo a questo tutti i listener definiti a livello di editor
proto._setToolListeners = function(tool,settersListeners){
  _.forEach(settersListeners.before,function(listeners,setter){
    if (_.hasIn(tool.setters,setter)){
      _.forEach(listeners,function(listener){
        if (listener.how == 'sync'){
          tool.onbefore(setter,listener.fnc);
        }
        else {
          tool.onbeforeasync(setter,listener.fnc);
        }
      })
    }
  });
  
  _.forEach(settersListeners.after,function(listeners,setter){
    if (_.hasIn(tool.setters,setter)){
      _.forEach(listeners,function(listener){
          tool.onafter(setter,listener.fnc);
      })
    }
  })
};

proto._setStarted = function(bool){
  this._started = bool;
};

proto.setFieldsWithAttributes = function(feature,fields,relations){
  var attributes = {};
  _.forEach(fields,function(field){
    attributes[field.name] = field.value;
  });
  
  var relationsAttributes = null;
  if (relations){
    var relationsAttributes = {};
    _.forEach(relations,function(relation,relationKey){
      var attributes = {};
      _.forEach(relation.fields,function(field){
        attributes[field.name] = field.value;
      });
      relationsAttributes[relationKey] = attributes;
    });
  }
  
  this._editBuffer.setAttributes(feature,attributes,relationsAttributes);
};


proto.addFeature = function(feature){
  this._editBuffer.addFeature(feature);
};

proto.updateFeature = function(feature){
  this._editBuffer.updateFeature(feature);
};

proto.deleteFeature = function(feature){
  this._editBuffer.deleteFeature(feature);
};

proto.getVectorLayer = function(){
  return this._vectorLayer;
};

proto.getEditVectorLayer = function(){
  return this._editVectorLayer;
};
