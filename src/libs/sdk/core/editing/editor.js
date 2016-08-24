var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var G3WObject = require('core/g3wobject');
var GUI = require('gui/gui');
var VectorLayer = require('core/map/layer/vectorlayer');

//var Sequencer = require('./stepsequencer');
var AddFeatureTool = require('./tools/addfeaturetool');
var MoveFeatureTool = require('./tools/movepointtool');
var ModifyFeatureTool = require('./tools/modifyfeaturetool');
var DeleteFeatureTool = require('./tools/deletefeaturetool');
var PickFeatureTool = require('./tools/pickfeaturetool');
var CutLineTool = require('./tools/cutlinetool');
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
function Editor(mapService,options){
  this._mapService = mapService;
  this._vectorLayer = null;
  this._editVectorLayer = null;
  this._editBuffer = null;
  this._activeTool = null;
  this._dirty = false;
  this._newPrefix = '_new_';
  
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
  this._toolsForGeometryTypes = {
      'Point': {
        addfeature: AddFeatureTool,
        movefeature: MoveFeatureTool,
        deletefeature: DeleteFeatureTool,
        editattributes: PickFeatureTool
      },
      'LineString': {
        addfeature: AddFeatureTool,
        modifyvertex: ModifyFeatureTool,
        movefeature: MoveFeatureTool,
        deletefeature: DeleteFeatureTool,
        editattributes: PickFeatureTool,
        cutline: CutLineTool
      }
  };
  
  this._activeTool = new function(){
    this.type = null;
    this.instance = null;
    
    this.setTool = function(type,instance){
      this.type = type;
      this.instance = instance;
    };
    
    this.getType = function(){
      return this.type;
    };
    
    this.getTool = function(){
      return this.instance;
    };
    
    this.clear = function(){
      this.type = null;
      this.instance = null;
    };
  }
  
  this._tools = {};
  
  base(this);
}
inherit(Editor,G3WObject);
module.exports = Editor;

var proto = Editor.prototype;

proto.getMapService = function() {
  return this._mapService;
};

// associa l'oggetto VectorLayer su cui si vuole fare l'editing
proto.setVectorLayer = function(vectorLayer){
  var geometrytype = vectorLayer.geometrytype;
  if (!geometrytype || ! this._isCompatibleType(geometrytype)){
    throw Error("Vector geometry type "+geometrytype+" is not valid for editing");
  }
  this._setToolsForVectorType(geometrytype);
  this._vectorLayer = vectorLayer;
};

// avvia la sessione di editazione con un determinato tool (es. addfeature)
proto.start = function(){
  // TODO: aggiungere notifica nel caso questo if non si verifichi
  var res = false;
  // se è stato settato il vectorLayer
  if (this._vectorLayer){
    // nel caso non sia già avviato prima lo stoppo;
    this.stop();
    
    // istanzio l'editVectorLayer
    this._editVectorLayer = new VectorLayer({
      name: "editvector",
      geometrytype: this._vectorLayer.geometrytype,
    })
    this._mapService.viewer.map.addLayer(this._editVectorLayer.getLayer());
    
    // istanzio l'EditBuffer
    this._editBuffer = new EditBuffer(this);
    this._setStarted(true);
    res = true;
  }
  return res;
};

// termina l'editazione
proto.stop = function(){
  if (this.isStarted()){
    if (this.stopTool()) {
      this._editBuffer.destroy();
      this._editBuffer = null;
      this.removeAllListeners();
      this._mapService.viewer.removeLayerByName(this._editVectorLayer.name);
      this._setStarted(false);
      return true;
    }
    return false;
  }
  return true;
};

proto.setTool = function(toolType,options){
  if (!this.stopTool()){
    return false;
  }
  var toolClass = this._tools[toolType];
  
  // se esiste il tool richiesto
  if (toolClass ){
    var toolInstance = new toolClass(this,options);
    this._activeTool.setTool(toolType,toolInstance);
    this._setToolSettersListeners(toolInstance,this._setterslisteners);
    toolInstance.run();
    return true;
  }
};

proto.stopTool = function(){
  if (this._activeTool.instance && !this._activeTool.instance.stop()){
    return false;
  }
  this._activeTool.clear();
  return true;
};

proto.getActiveTool = function(){
  return this._activeTool;
};

proto.isStarted = function(){
  return this._started;
};

proto.hasActiveTool = function(){
  return !_.isNull(this._activeTool.instance);
};

proto.isToolActive = function(toolType){
   if (this._activeTool.toolType){
    return this._activeTool.toolType == toolType;
   };
   return false;
};

proto.generateId = function(){
  return this._editBuffer.generateId();
};

proto.commit = function(newFeatures){
  this._editBuffer.commit(newFeatures);
};

proto.undoAll = function(){
  this._editBuffer.undoAll();
};

proto.setFeatureLocks = function(featureLocks){
  this._withFeatureLocks = true;
  this._featureLocks = featureLocks;
};

proto.getFeatureLocks = function(featureLocks){
  return this._featureLocks;
};

proto.getFeatureLockIds = function(){
  return _.map(this._featureLocks,function(featurelock){
    return featurelock.lockid;
  });
};

proto.getFeatureLocksLockIds = function(featureLocks){
  var featureLocks = featureLocks || this._featureLocks;
  return _.map(featureLocks,function(featurelock){
    return featurelock.lockid;
  });
};

proto.getFeatureLocksFeatureIds = function(featureLocks){
  var featureLocks = featureLocks || this._featureLocks;
  return _.map(featureLocks,function(featurelock){
    return featurelock.featureid;
  });
};

proto.getFeatureLockIdsForFeatureIds = function(fids){
  var featurelocksForFids = _.filter(this._featureLocks,function(featurelock){
    return _.includes(fids,featurelock.featureid);
  });
  
  return this.getFeatureLocksLockIds(featurelocksForFids);
};

proto.getEditedFeatures = function(){
  var modifiedFids = this._editBuffer.collectFeatureIds();
  var lockIds = this.getFeatureLockIdsForFeatureIds(modifiedFids);
  return {
    add: this._editBuffer.collectFeatures('new',true),
    update: this._editBuffer.collectFeatures('updated',true),
    delete: this._editBuffer.collectFeatures('deleted',true),
    relationsattributes: this._editBuffer.collectRelationsAttributes(),
    lockids: lockIds
  }
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
  feature.setProperties(attributes);
  this._editBuffer.updateAttributes(feature,relationsAttributes);
};

proto.setAttributes = function(feature,attributes){
  feature.setProperties(attributes);
  this._editBuffer.updateAttributes(feature);
};

proto.getRelationsWithValues = function(feature){
  var fid = feature.getId();
  if (this._vectorLayer.hasRelations()){
    var fieldsPromise;
    // se non ha fid vuol dire che è nuovo e senza attributi, quindi prendo i fields vuoti
    if (!fid){
      fieldsPromise = this._vectorLayer.getRelationsWithValues();
    }
    // se per caso ha un fid ma è un vettoriale nuovo
    else if (!this._vectorLayer.getFeatureById(fid)){
      // se questa feature, ancora non presente nel vectorLayer, ha comunque i valori delle FKs popolate, allora le estraggo
      if (this._vectorLayer.featureHasRelationsFksWithValues(feature)){
        var fks = this._vectorLayer.getRelationsFksWithValuesForFeature(feature);
        fieldsPromise = this._vectorLayer.getRelationsWithValuesFromFks(fks);
      }
      // altrimenti prendo i fields vuoti
      else {
        fieldsPromise = this._vectorLayer.getRelationsWithValues();
      }
    }
    // se invece è un vettoriale preesistente controllo intanto se ha dati delle relazioni già editati
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
        
        fieldsPromise = resolve(relations);
      }
      // se non ce li ha vuol dire che devo caricare i dati delle relazioni da remoto
      else {
        fieldsPromise = this._vectorLayer.getRelationsWithValues(fid);
      }
    }
  }
  else {
    fieldsPromise = resolve(null);
  }
  return fieldsPromise;
};

proto.getField = function(name,fields){
  var fields = fields || this.getVectorLayer().getFieldsWithValues();
  var field = null;
  _.forEach(fields,function(f){
    if (f.name == name){
      field = f;
    }
  })
  return field;
};

proto.isDirty = function(){
  return this._dirty;
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

proto.generateId = function(){
  return this._newPrefix+Date.now();
};

proto.isNewFeature = function(fid){
  if (fid) {
    return fid.toString().indexOf(this._newPrefix) == 0;
  }
  return true;
};

/*proto.isNewFeature = function(fid){
  if (fid) {
    if(!this.getVectorLayer().getFeatureById(fid)){
      return true;
    }
    return false;
  }
  else {
    return true
  }
};*/

proto._isCompatibleType = function(geometrytype){
  return this._geometrytypes.indexOf(geometrytype) > -1;
};

proto._setToolsForVectorType = function(geometrytype){
  var self = this;
  var tools = this._toolsForGeometryTypes[geometrytype];
  _.forEach(tools,function(toolClass,tool){
    self._tools[tool] = toolClass;
  })
};

proto._onaftertoolaction = function(setter,listener){
  if (!_.get(this._setterslisteners.after,setter)){
    this._setterslisteners.after[setter] = [];
  }
  this._setterslisteners.after[setter].push({
    fnc: listener
  });
}

proto._onbeforetoolaction = function(setter,listener,async){
  if (!_.get(this._setterslisteners.before,setter)){
    this._setterslisteners.before[setter] = [];
  }
  this._setterslisteners.before[setter].push({
    fnc: listener,
    how: async ? 'async' : 'sync'
  });
}

// una volta istanziato il tool aggiungo a questo tutti i listener definiti a livello di editor
proto._setToolSettersListeners = function(tool,settersListeners){
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

proto._setDirty = function(bool){
  if (_.isNil(bool)){
    this._dirty = true;
  }
  else {
    this._dirty = bool;
  }
  this.emit("dirty",this._dirty);
};
