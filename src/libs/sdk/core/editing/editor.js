var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolve = require('core/utils/utils').resolve;
var G3WObject = require('core/g3wobject');
var GUI = require('gui/gui');
var VectorLayer = require('core/map/layer/vectorlayer');

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

// Editor generico
function Editor(options) {

  this.options = options || null;
  // vincoli alla possibilità di attivare l'editing
  this.constraints = this.options.constraints || {};
  this._layers = options.layers || [];
  this._baseurl = options.baseurl || '';
  this._mapService = null;
  this._vectorLayer = null;
  this._editVectorLayer = null;
  this._editBuffer = null;
  this._activeTool = null;
  this._dirty = false;
  this._newPrefix = '_new_';
  this._withFeatureLocks = false;
  this._featureLocks = null;
  this._started = false;
  this._currentEditingLayer;
  this._loadDataOnMapViewChangeListener = null;
  this._currentEditingLayer = null;
  this._loadedExtent = null;

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

  this.state = {
    editing: {
      on: false,
      enabled: false,
      layerCode: null,
      toolType: null,
      startingEditingTool: false,
      toolstep: {
        n: null,
        total: null,
        message: null
      },
    },
    retrievingData: false,
    hasEdits: false
  };

  this.extend = function(tools) {
    this.tools
  };

  this.init = function() {
    //prendo il mapserveice della mappa
    var self = this;
    this._mapService = GUI.getComponent('map').getService();
    // disabilito l'eventuale tool attivo se viene attivata un'interazione di tipo Pointer sulla mappa
    this._mapService.on('pointerInteractionSet',function(interaction){
      var currentEditingLayer = this.getCurrentEditingLayer();
      if (currentEditingLayer) {
        var activeTool = self.getCurrentEditingLayer().editor.getActiveTool().instance;
        if(activeTool && !activeTool.ownsInteraction(interaction)){ // devo verificare che non sia un'interazione attivata da uno dei tool di editing di iternet
          this.stopEditingTool();
        }
      }
    });
    //verifico se dopo il setMapView posso abilitare o disabilirare l'editing
    this._mapService.onafter('setMapView', function(bbox,resolution,center) {
      self.state.editing.enabled = (resolution < self.constraints.resolution) ? true : false;
    });

    this.state.editing.enabled = (this._mapService.getResolution() < this.constraints.resolution) ? true : false;

    _.forEach(this._layers, function(layer) {
      var layer = self._mapService.getProject().getLayerById(layer.id);
      layer.name = layer.getOrigName();
    });

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

    this.getToosl = function() {
      return this._tools;
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
};
inherit(Editor,G3WObject);
module.exports = Editor;

var proto = Editor.prototype;

proto.getMapService = function() {
  return this._mapService;
};

//INIZIO metodi importati da IternetService

proto.startEditing = function() {
  var self = this;
  this.setupAndLoadAllVectorsData()
      .then(function(data) {
        // se tutto è andato a buon fine aggiungo i VectorLayer alla mappa
        self.addToMap();
        self.state.editing.on = true;
        self.emit("editingstarted");

        if (!self._loadDataOnMapViewChangeListener){
          self._loadDataOnMapViewChangeListener = self._mapService.onafter('setMapView',function(){
            if (self.state.editing.on && self.state.editing.enabled){
              self.loadAllVectorsData();
            }
          });
        }
      })
};

proto.stopEditing = function(reset) {
  var self = this;
  // se posso stoppare tutti gli editor...
  if (self.stopEditor(reset)){
    _.forEach(this._layers,function(layer){
      var vector = layer.vector;
      self._mapService.viewer.removeLayerByName(vector.name);
      layer.vector= null;
      layer.editor= null;
      self.unlockLayer(layer);
    });
    this.updateEditingState();
    self.state.editing.on = false;
    self._cleanUp()
    self.emit("editingstopped");
  }
};

proto.cleanUp = function(){
  this._loadedExtent = null;
};

proto.startEditor = function(layer){
  // avvio l'editor
  if (layer.editor.start(this)){
    // e registro i listeners
    this.setCurrentEditingLayer(layer);
    return true;
  }
  return false;
};

proto.startEditingTool = function(layer,toolType,options){
  this.state.startingEditingTool = true;
  var canStartTool = true;
  if (!layer.editor.isStarted()){
    canStartTool = this._startEditor(layer);
  }
  if(canStartTool && layer.editor.setTool(toolType,options)){
    this.updateEditingState();
    this.state.startingEditingTool = false;
    return true;
  }
  this.state.startingEditingTool = false;
  return false;
};

proto.stopEditor = function(reset){
  var ret = true;
  var layer = this.getCurrentEditingLayer();
  if (layer) {
    ret = layer.editor.stop(reset);
    if (ret){
      this.setCurrentEditingLayer();
    }
  }
  return ret;
};

proto.stopEditingTool = function(){
  var ret = true;
  var layer = this.getCurrentEditingLayer();
  if(layer){
    ret = layer.editor.stopTool();
    if (ret){
      this.updateEditingState();
    }
  }
  return ret;
};

proto.setupAndLoadAllVectorsData = function(){
  var self = this;
  var deferred = $.Deferred();
  var layersReady = _.reduce(self._layers, function(ready, layer) {
    return  ready || !_.isNull(layer.vector);
  }, false);
  self.state.retrievingData = true;
  if (!layersReady) {
    // eseguo le richieste delle configurazioni e mi tengo le promesse
    var vectorLayersSetup = _.map(this._layers, function(layer){
      return self.setupVectorLayer(layer);
    });
    // aspetto tutte le promesse
    $.when.apply(this,vectorLayersSetup)
        .then(function(){
          var vectorLayers = Array.prototype.slice.call(arguments);

          _.forEach(self._layers, function(layer) {
            _.forEach(vectorLayers, function(vectorLayer){
              if (layer.id == vectorLayer.id) {
                layer.vector = vectorLayer;
                var editor = new layer.editorClasses(self._mapService);
                editor.setVectorLayer(vectorLayer);
                editor.on("dirty",function(dirty){
                  self.state.hasEdits = dirty;
                })
                layer.editor = editor;
                return true;
              }
            })
          });

          self.loadAllVectorsData()
              .then(function(){
                deferred.resolve();
              })
              .fail(function(){
                deferred.reject();
              })
              .always(function(){
                self.state.retrievingData = false;
              })
        })
        .fail(function(){
          deferred.reject();
        })
  }
  else{
    this.loadAllVectorsData()
        .then(function(){
          deferred.resolve();
        })
        .fail(function(){
          deferred.reject();
        })
        .always(function(){
          self.state.retrievingData = false;
        })
  }
  return deferred.promise();
};

proto.loadAllVectorsData = function(vectorLayers){
  var self = this;
  // verifico che il BBOX attuale non sia stato già caricato
  var bbox = this._mapService.state.bbox;
  var loadedExtent = this._loadedExtent;
  if (loadedExtent && ol.extent.containsExtent(loadedExtent,bbox)){
    return resolve();
  }
  if (!loadedExtent){
    this._loadedExtent = bbox;
  }
  else {
    this._loadedExtent = ol.extent.extend(loadedExtent,bbox);
  }

  var deferred = $.Deferred();
  var self = this;
  var vectorDataRequests = _.map(self._layers,function(Layer){
    return self.loadVectorData(Layer.vector, bbox);
  });
  $.when.apply(this,vectorDataRequests)
      .then(function(){
        var vectorsDataResponse = Array.prototype.slice.call(arguments);
        _.forEach(self._layers,function(layer){
          _.forEach(vectorsDataResponse, function(vectorDataResponse) {
            //verifico che ci siano features lock
            if (vectorDataResponse.featurelocks) {
              layer.editor.setFeatureLocks(vectorDataResponse.featurelocks);
            }
          })
        });
        deferred.resolve();
      })
      .fail(function(){
        deferred.reject();
      });

  return deferred.promise();
};

proto.setupVectorLayer = function(layer) {
  var self = this;
  var deferred = $.Deferred();
  // eseguo le richieste delle configurazioni e mi tengo le promesse
  this.getVectorLayerConfig(layer.name)
      .then(function(vectorConfigResponse) {
        // instanzio il VectorLayer
        var vectorConfig = vectorConfigResponse.vector;
        var vectorLayer = self.createVectorLayer({
          geometrytype: vectorConfig.geometrytype,
          format: vectorConfig.format,
          crs: "EPSG:3003",
          id: layer.id,
          name: layer.name,
          pk: vectorConfig.pk
        });
        // ottengo la definizione dei campi
        vectorLayer.setFields(vectorConfig.fields);
        var relations = vectorConfig.relations;
        if(relations){
          // per dire a vectorLayer che i dati delle relazioni verranno caricati solo quando richiesti (es. aperture form di editing)
          vectorLayer.lazyRelations = true;
          vectorLayer.setRelations(relations);
        }
        // setto lo stile del layer OL
        if (layer.style) {
          vectorLayer.setStyle(layer.style);
        }
        deferred.resolve(vectorLayer);
      })
      .fail(function(){
        deferred.reject();
      })
  return deferred.promise();
};

//funzione che carica il layer vettoriale geoJson
proto.loadVectorData = function(vectorLayer,bbox){
  var self = this;
  // eseguo le richieste de dati e mi tengo le promesse
  return self.getVectorLayerData(vectorLayer,bbox)
      .then(function(vectorDataResponse){
        vectorLayer.setData(vectorDataResponse.vector.data);
        return vectorDataResponse;
      })
};

// ottiene la configurazione del vettoriale (qui richiesto solo per la definizione degli input)
proto.getVectorLayerConfig = function(layerName){
  var d = $.Deferred();
  $.get(this._baseurl+layerName+"/?config")
      .done(function(data){
        d.resolve(data);
      })
      .fail(function(){
        d.reject();
      })
  return d.promise();
};

// ottiene il vettoriale in modalità editing
proto.getVectorLayerData = function(vectorLayer,bbox){
  var self = this;
  var d = $.Deferred();
  $.get(this._baseurl+vectorLayer.name+"/?editing&in_bbox="+bbox[0]+","+bbox[1]+","+bbox[2]+","+bbox[3])
      .done(function(data){
        d.resolve(data);
      })
      .fail(function(){
        d.reject();
      })
  return d.promise();
};

proto.unlockLayer = function(layerConfig) {
  $.get(this._baseurl+layerConfig.name+"/?unlock");
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

proto.createVectorLayer = function(options,data){
  var vector = new VectorLayer(options);
  return vector;
};

proto.getCurrentEditingLayer = function(){
  return this._currentEditingLayer;
};

proto.setCurrentEditingLayer = function(layer){
  if (!layer){
    this._currentEditingLayer = null;
  }
  else {
    this._currentEditingLayer = layer;
  }
};


proto.addToMap = function() {
  var self = this;
  var map = this._mapService.viewer.map;
  _.forEach(self._layers,function(layer){
    layer.vector.addToMap(map);
  })
};

proto.saveEdits = function(dirtyEditors) {
  var self = this;
  var deferred = $.Deferred();
  this.sendEdits(dirtyEditors)
      .then(function(response){
        GUI.notify.success("I dati sono stati salvati correttamente");
        self.commitEdits(dirtyEditors,response);
        self._mapService.refreshMap();
        deferred.resolve();
      })
      .fail(function(errors){
        GUI.notify.error("Errore nel salvataggio sul server");
        deferred.resolve();
      })
  return deferred.promise();
};

proto.sendEdits = function(dirtyEditors) {

  var deferred = $.Deferred();
  var editsToPush = _.map(dirtyEditors,function(editor){
    return {
      layername: editor.getVectorLayer().name,
      edits: editor.getEditedFeatures()
    }
  });

  this._postData(editsToPush)
      .then(function(returned){
        if (returned.result){
          deferred.resolve(returned.response);
        }
        else {
          deferred.reject(returned.response);
        }
      })
      .fail(function(returned){
        deferred.reject(returned.response);
      });
  return deferred.promise();
};

proto.commitEdits = function(editors, response) {
  var self = this;
  _.forEach(editors,function(editor){
    var newAttributesFromServer = null;
    if (response && response.new){
      _.forEach(response.new,function(updatedFeatureAttributes){
        var oldfid = updatedFeatureAttributes.clientid;
        var fid = updatedFeatureAttributes.id;
        editor.getEditVectorLayer().setFeatureData(oldfid,fid,null,updatedFeatureAttributes);
      })
    }
    editor.commit();
  });
};

proto.undoEdits = function(dirtyEditors) {
  var currentEditingLayerCode = this.getCurrentEditingLayer().layerCode;
  var editor = dirtyEditors[currentEditingLayerCode];
  this.stopEditing(true);
};

//FINE  metodi importati da IternetService



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
    this._mapService.viewer.map.addLayer(this._editVectorLayer.getMapLayer());
    
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
    relations: this._editBuffer.collectRelationsAttributes(),
    lockids: lockIds
  }
};

proto.setFieldsWithValues = function(feature,fields,relations){
  var attributes = {};
  _.forEach(fields,function(field){
    attributes[field.name] = field.value;
  });
  
  var relationsAttributes = null;
  if (relations){
    var relationsAttributes = {};
    _.forEach(relations,function(relation){
      var attributes = {};
      _.forEach(relation.fields,function(field){
        attributes[field.name] = field.value;
      });
      relationsAttributes[relation.name] = attributes;
    });
  }
  feature.setProperties(attributes);
  this._editBuffer.updateFields(feature,relationsAttributes);
};

proto.setFields = function(feature,fields){
  feature.setProperties(fields);
  this._editBuffer.updateFields(feature);
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
        _.forEach(relationsAttributes,function(relation){
          _.forEach(relations[relationKey].fields,function(field){
            field.value = relationsAttributes[relation.name][field.name];
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

proto.createRelationElement = function(relation) {
  var element = {}
  element.fields = _.cloneDeep(this._vectorLayer.getRelationFields(relation));
  element.id = this.generateId();
  return element;
};

proto.getRelationPkFieldIndex = function(relationName) {
  return this._vectorLayer.getRelationPkFieldIndex(relationName);
}

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

