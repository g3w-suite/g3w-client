(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.g3wsdk = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var reject = require('core/utils/utils').reject;

function ApiService(){
  this._config = null;
  this._baseUrl = null;
  this._apiUrls = {};
  
  this.init = function(config) {

    this._config = config;
    this._baseUrl = config.urls.api;
    this._apiEndpoints = config.urls.apiEndpoints;
  };
  
  var howManyAreLoading = 0;
  this._incrementLoaders = function(){
    if (howManyAreLoading == 0){
      this.emit('apiquerystart');
    }
    howManyAreLoading += 1;
  };
  
  this._decrementLoaders = function(){
    howManyAreLoading -= 1;
    if (howManyAreLoading == 0){
      this.emit('apiqueryend');
    }
  };
  
  this.get = function(api, options) {
    var self = this;
    var apiEndPoint = this._apiEndpoints[api];
    if (apiEndPoint) {
      var completeUrl = this._baseUrl + '/' + apiEndPoint;
      if (options.request) {
         completeUrl = completeUrl + '/' + options.request;
      }
      var params = options.params || {};
      
      self.emit(api+'querystart');
      this._incrementLoaders();
      return $.get(completeUrl,params)
      .done(function(response){
        self.emit(api+'queryend',response);
        return response;
      })
      .fail(function(e){
        self.emit(api+'queryfail',e);
        return e;
      })
      .always(function(){
        self._decrementLoaders();
      });
    }
    else {
      return reject();
    }
  };
  
  base(this);
}
inherit(ApiService,G3WObject);

module.exports = new ApiService;

},{"core/g3wobject":13,"core/utils/utils":34}],2:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ApiService = require('core/apiservice');
var RouterService = require('core/router');
var ProjectsRegistry = require('core/project/projectsregistry');
var PluginsRegistry = require('core/plugin/pluginsregistry');

var ApplicationService = function(){
  this.secret = "### G3W Client Application Service ###";
  var self = this;
  this.ready = false;
  this.complete = false;
  this._modalOverlay = null;
  this._acquirePostBoostrap = false;
  this.config = {};

  // chiama il costruttore di G3WObject (che in questo momento non fa niente)
  base(this);
  
  this.init = function(config, acquirePostBoostrap){
    this._config = config;
    if (acquirePostBoostrap) {
      this._acquirePostBoostrap = true;
    }
    this._bootstrap();
  };
  
  this.getConfig = function() {
    return this._config;
  };
  
  this.getRouterService = function() {
    return RouterService;
  };
  
  this.postBootstrap = function() {

    if (!this.complete) {
      RouterService.init();
      this.complete = true;
    }
  };
  
  this._bootstrap = function(){
    var self = this;
    //nel caso in cui (prima volta) l'application service non è pronta
    //faccio una serie di cose
    if (!this.ready) {
      // Inizializza la configurazione dei servizi.
      // Ognungo cercherà dal config quello di cui avrà bisogno
      // una volta finita la configurazione emetto l'evento ready.
      // A questo punto potrò avviare l'istanza Vue globale
      $.when(
        ApiService.init(this._config),
        ProjectsRegistry.init(this._config)
      ).then(function(){
        PluginsRegistry.init({
          plusingBaseUrl: self._config.urls.staticurl,
          pluginsConfigs: self._config.plugins
        });
        self.emit('ready');
        if (!self._acquirePostBoostrap) {
          self.postBootstrap();
        }
        this.initialized = true;
      });
    };
  };
};
inherit(ApplicationService,G3WObject);

module.exports = new ApplicationService;

},{"core/apiservice":1,"core/g3wobject":13,"core/plugin/pluginsregistry":24,"core/project/projectsregistry":27,"core/router":32,"core/utils/utils":34}],3:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');
var RelationEditBuffer = require('./relationeditbuffer');

function EditBuffer(editor){
  this._editor = editor;
  
  this._origVectorLayer = new ol.layer.Vector({
    source: new ol.source.Vector()
  });
  this._cloneLayer();
  
  //buffer delle geometrie
  this._geometriesBuffer = {};
  
  // buffer degli attributi
  this._attributesBuffer = {};
  
  // buffer degli attributi delle relazioni
  this._relationsBuffers = null;
  /*var relations = editor.getVectorLayer().getRelations();
  if (relations) {
    this._setupRelationsBuffers(relations);
  }*/
  
}
inherit(EditBuffer,G3WObject);
module.exports = EditBuffer;

var proto = EditBuffer.prototype;

proto.commit = function(){
  var newFeatures = this._editor.getEditVectorLayer().getFeatures();
  this._editor.getVectorLayer().addFeatures(newFeatures);
  this._editor.getEditVectorLayer().clear();
  this._clearBuffers();
  this._cloneLayer();
};

proto.undoAll = function(){
  this._resetVectorLayer();
  this._clearBuffers();
};

proto.destroy = function(){
  this._clearBuffers();
};

proto.generateId = function(){
  return this._editor.generateId();
};

/*proto._setupRelationsBuffers = function(relations) {
  var self = this;
  _.forEach(relations,function(relation){
    var relationBuffer = RelationEditBuffer(this._editor,relation.name);
    self._relationsBuffers[relation.name] = relationBuffer;
  })
}*/

proto.addFeature = function(feature){
  if(!feature.getId()){
    feature.setId(this.generateId());
  }
  this._addEditToGeometryBuffer(feature,'add');
};

proto.updateFeature = function(feature){
  this._addEditToGeometryBuffer(feature,'update');
};

proto.deleteFeature = function(feature){
  this._addEditToGeometryBuffer(feature,'delete');
};

proto.updateFields = function(feature,relationsAttributes){
  if(!feature.getId()){
    feature.setId(this.generateId());
  }
  this._addEditToAttributesBuffer(feature,relationsAttributes);
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

proto.getRelationsAttributes = function(fid){
  return this._relationsAttributesBuffer[fid].slice(-1)[0];
};

proto.areFeatureRelationsEdited = function(fid){
  _.forEach(this._relationsBuffers,function(relationBuffer){
    if (relationBuffer[fid]){
      return this._relationsAttributesBuffer[fid].length > -1;
    }
  }) 
  
  return false;
};

proto.collectFeatureIds = function(){
  var geometriesBuffers = this._geometriesBuffer;
  var attributesBuffers = this._attributesBuffer;
  
  var modifiedFids = [];

  modifiedFids = _.concat(modifiedFids,_.keys(geometriesBuffers));
  modifiedFids = _.concat(modifiedFids,_.keys(attributesBuffers));
  
  return _.uniq(modifiedFids);
};

proto.collectFeatures = function(state,asGeoJSON){
  var self = this;
  var geometriesBuffers = this._geometriesBuffer;
  var attributesBuffers = this._attributesBuffer;
  var asGeoJSON = asGeoJSON || false;
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
  _.forEach(modifiedFids,function(fid){
    
    var feature = layer.getFeatureById(fid);
    var isNew = self._isNewFeature(fid);
    var addedFeature = (state == 'new' && isNew && feature);
    var updatedFeature = (state == 'updated' && !isNew && feature);
    var deletedFeature = (state == 'deleted' && !isNew && !feature);
    
    if (addedFeature || updatedFeature){
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

proto.createFeature = function(fid,geometry,attributes){
  var feature = new ol.Feature();
  feature.setId(fid);
  feature.setGeometry(geometry);
  feature.setProperties(attributes);
  return feature;
};

proto.collectRelationsAttributes = function(){
  var relationsAttributes = {};
  _.forEach(this._relationsAttributesBuffer,function(relationsBuffer,fid){
    lastRelationsAttributes = relationsBuffer[relationsBuffer.length-1];
    relationsAttributes[fid] = lastRelationsAttributes;
  })
  return relationsAttributes;
};

proto._addEditToGeometryBuffer = function(feature,operation){
  var geometriesBuffer = this._geometriesBuffer;
  
  var id = feature.getId();
  var geometry = feature.getGeometry();
  
  if (operation == 'delete'){
      geometry = null;
      var layer = this._isNewFeature(id) ? this._editor._editVectorLayer : this._editor._vectorLayer;
      layer.getSource().removeFeature(feature);
  } 
  
  if (!_.has(geometriesBuffer,id)){
    geometriesBuffer[id] = [];
  }
  geometriesBuffer[id].push(geometry);
  this._setDirty();
};

proto._addEditToAttributesBuffer = function(feature,relationsAttributes){
  var fid = feature.getId();
  var attributes = feature.getProperties();
  var attributesBuffer = this._attributesBuffer;

  if (!_.has(attributesBuffer,fid)){
    attributesBuffer[fid] = [];
  }
  attributesBuffer[fid].push(attributes);
  
  if (relationsAttributes){
    if (!_.has(this._relationsAttributesBuffer,fid)){
    this._relationsAttributesBuffer[fid] = [];
  }
    this._relationsAttributesBuffer[fid].push(relationsAttributes);
  }
  this._setDirty();
};

// guardo se è una feature già presente nel buffer delle nuove geometrie
proto._isNewFeature = function(fid){
  //return id.toString().indexOf('_new_') > -1;
  return this._editor.isNewFeature(fid);
};

proto._setDirty = function(){
  this._editor._setDirty();
};

proto._resetVectorLayer = function(){
  this._editor.vectoLayer = this._origVectorLayer;
  this._origVectorLayer.getSource().clear();
};

proto._clearBuffers = function(){
  this._geometriesBuffer = {};
  this._attributesBuffer = {};
  this._relationsAttributesBuffer = {};
  this._editor._setDirty(false);
};

proto._cloneLayer = function(){
  var clonedFeatures = [];
  this._editor._vectorLayer.getSource().forEachFeature(function(feature){
    clonedFeatures.push(feature.clone());
  },this);
  this._origVectorLayer.getSource().addFeatures(clonedFeatures);
};

},{"./relationeditbuffer":5,"core/g3wobject":13,"core/utils/utils":34}],4:[function(require,module,exports){
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
    // nel caso non sia già  avviato prima lo stoppo;
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
    // se non ha fid vuol dire che Ã¨ nuovo e senza attributi, quindi prendo i fields vuoti
    if (!fid){
      fieldsPromise = this._vectorLayer.getRelationsWithValues();
    }
    // se per caso ha un fid ma Ã¨ un vettoriale nuovo
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
    // se invece Ã¨ un vettoriale preesistente controllo intanto se ha dati delle relazioni giÃ  editati
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

proto.getField = function(name, fields){
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
},{"./editbuffer":3,"./tools/addfeaturetool":6,"./tools/cutlinetool":7,"./tools/deletefeaturetool":8,"./tools/modifyfeaturetool":10,"./tools/movepointtool":11,"./tools/pickfeaturetool":12,"core/g3wobject":13,"core/map/layer/vectorlayer":20,"core/utils/utils":34,"gui/gui":58}],5:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

function RelationEditBuffer(editor,relationName){
  this._name = relationName;
  this._editor = editor;
  
  // buffer degli attributi
  this._attributesBuffer = {};
}
inherit(RelationEditBuffer,G3WObject);
module.exports = RelationEditBuffer;

var proto = RelationEditBuffer.prototype;

proto.commit = function(){
  this._clearBuffers();
  this._cloneLayer();
};

proto.undoAll = function(){
  this._resetVectorLayer();
  this._clearBuffers();
};

proto.destroy = function(){
  this._clearBuffers();
};

proto.generateId = function(){
  return this._editor.generateId();
};

proto.addElement = function(element){
  if(!element.id){
    element.id = (this.generateId());
  }
  this._addEditToBuffer(element,'add');
};

proto.updateElement = function(element){
  this._addEditToBuffer(element,'update');
};

proto.deleteElement = function(element){
  this._addEditToBuffer(element,'delete');
};

proto.getElementAttributes = function(elementId){
  if(this._attributesBuffer[elementId]){
    return this._attributesBuffer[elementId].slice(-1)[0];
  }
  return null;
};

proto.areElementAttributesEdited = function(elementId){
  if (this._attributesBuffer[elementId]){
    return this._attributesBuffer[elementId].length > -1;
  }
  return false;
};

proto.collectFeatureIds = function(){
  var geometriesBuffers = this._geometriesBuffer;
  var attributesBuffers = this._attributesBuffer;
  
  var modifiedFids = [];

  modifiedFids = _.concat(modifiedFids,_.keys(geometriesBuffers));
  modifiedFids = _.concat(modifiedFids,_.keys(attributesBuffers));
  
  return _.uniq(modifiedFids);
};

proto.collectElements = function(state,asGeoJSON){
  var self = this;
  var geometriesBuffers = this._geometriesBuffer;
  var attributesBuffers = this._attributesBuffer;
  var asGeoJSON = asGeoJSON || false;
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
  _.forEach(modifiedFids,function(fid){
    
    var feature = layer.getFeatureById(fid);
    var isNew = self._isNewFeature(fid);
    var addedFeature = (state == 'new' && isNew && feature);
    var updatedFeature = (state == 'updated' && !isNew && feature);
    var deletedFeature = (state == 'deleted' && !isNew && !feature);
    
    if (addedFeature || updatedFeature){
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

proto.collectRelationAttributes = function(){
  var relationsAttributes = {};
  _.forEach(this._relationsAttributesBuffer,function(relationsBuffer,fid){
    lastRelationsAttributes = relationsBuffer[relationsBuffer.length-1];
    relationsAttributes[fid] = lastRelationsAttributes;
  })
  return relationsAttributes;
};

proto._addEditToBuffer = function(element,operation){
  var id = element.id;
  
  if (!_.has(attributesBuffer,id)){
    attributesBuffer[id] = [];
  }
  
  if(operation == 'delete') {
    element = null;
  }
  
  attributesBuffer[id].push(element);
  this._setDirty();
};

proto._setDirty = function(bool){
  this._editor._setDirty(bool);
};

proto._clearBuffers = function(){
  this._attributesBuffer = {};
  this._setDirty(false);
};

},{"core/g3wobject":13,"core/utils/utils":34}],6:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

var EditingTool = require('./editingtool');

function AddFeatureTool(editor,options){
  var self = this;
  var options = options || {};
  this._running = false;
  this._busy = false;
  this.source = editor.getEditVectorLayer().getMapLayer().getSource();
  this.isPausable = true;
  
  this.drawInteraction = null;
  this._snap = options.snap || null;
  this._snapInteraction = null; 
  
  this._finishCondition = options.finishCondition || _.constant(true);
  
  this._condition = options.condition || _.constant(true);
  
  // qui si definiscono i metodi che vogliamo poter intercettare, ed eventualmente bloccare (vedi API G3WObject)
  this.setters = {
    addFeature: {
      fnc: AddFeatureTool.prototype._addFeature,
      fallback: AddFeatureTool.prototype._fallBack
    }
  };
  
  base(this,editor);
}
inherit(AddFeatureTool,EditingTool);
module.exports = AddFeatureTool;

var proto = AddFeatureTool.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(){
  var self = this;
  
  this.drawInteraction = new ol.interaction.Draw({
    type: this.editor.getEditVectorLayer().geometrytype,
    source: this.source,
    condition: this._condition,
    finishCondition: this._finishCondition // disponibile da https://github.com/openlayers/ol3/commit/d425f75bea05cb77559923e494f54156c6690c0b
  });
  this.addInteraction(this.drawInteraction);
  this.drawInteraction.setActive(true);
  
  this.drawInteraction.on('drawstart',function(e){
    self.editor.emit('drawstart',e);
  });
  
  this.drawInteraction.on('drawend',function(e){
    self.editor.emit('drawend',e);
    if (!self._busy){
      self._busy = true;
      self.pause();
      self.addFeature(e.feature);
    }
  });
  
  if (this._snap){
    this._snapInteraction = new ol.interaction.Snap({
      source: this._snap.vectorLayer.getSource()
    });
    this.addInteraction(this._snapInteraction);
  }
};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    if (this._snapInteraction){
      this._snapInteraction.setActive(false);
    }
    this.drawInteraction.setActive(false);
  }
  else {
    if (this._snapInteraction){
      this._snapInteraction.setActive(true);
    }
    this.drawInteraction.setActive(true);
  }
};

// metodo eseguito alla disattivazione del tool
proto.stop = function(){
  if (this._snapInteraction){
     this.removeInteraction(this._snapInteraction);
     this._snapInteraction = null;
  }
  this.removeInteraction(this.drawInteraction);
  this.drawInteraction = null;
  return true;
};

proto.removeLastPoint = function(){
  if (this.drawInteraction){
    // provo a rimuovere l'ultimo punto. Nel caso non esista la geometria gestisco silenziosamente l'errore
    try{
      this.drawInteraction.removeLastPoint();
    }
    catch (e){
      //
    }
  }
};

proto._addFeature = function(feature){
  // aggiungo la geometria nell'edit buffer
  this.editor.addFeature(feature);
  this._busy = false;
  this.pause(false);
  return true;
};

proto._fallBack = function(feature){
  this._busy = false;
  // rimuovo l'ultima feature inserita, ovvero quella disegnata ma che non si vuole salvare
  this.source.getFeaturesCollection().pop();
  this.pause(false);
};

},{"./editingtool":9,"core/g3wobject":13,"core/utils/utils":34}],7:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var geom = require('core/geometry/geom');
var PickFeatureInteraction = require('g3w-ol3/src/interactions/pickfeatureinteraction');
var PickCoordinatesInteraction = require('g3w-ol3/src/interactions/pickcoordinatesinteraction');

var EditingTool = require('./editingtool');

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
  
  this.addInteraction(this._linePickInteraction);
  
  // seleziono la linea da tagliare
  self.steps.next();
  this._linePickInteraction.on('picked',function(e){
    var cutFeature;
    var feature = self._origFeature = e.feature;
    self._origGeometry = feature.getGeometry().clone();
    self._showSelection(self._origGeometry,300);
    self.removeInteraction(this);

    
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
      self.removeInteraction(this);
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
  
  var stop = EditingTool.prototype.stop.call(this);
  
  if (stop) {
    this.removeInteraction(this._linePickInteraction);
    this.removeInteraction(this._pointPickInteraction);
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
  layer.setMap(this.editor.getMapService().viewer.map);
  
  var selectLineInteraction = new PickFeatureInteraction({
    layers: [this._lineToKeepOverlay],
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
  overlay.setMap(this.editor.getMapService().viewer.map);
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

},{"./editingtool":9,"core/geometry/geom":14,"core/utils/utils":34,"g3w-ol3/src/interactions/pickcoordinatesinteraction":43,"g3w-ol3/src/interactions/pickfeatureinteraction":44}],8:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var DeleteInteraction = require('g3w-ol3/src/interactions//deletefeatureinteraction');

var EditingTool = require('./editingtool');

function DeleteFeatureTool(editor){
  var self = this;
  this.editor = editor;
  this.isPausable = true;
  this.drawInteraction = null;
  this.layer = null;
  this.editingLayer = null;

  this.setters = {
    deleteFeature: DeleteFeatureTool.prototype._deleteFeature
  };
  
  base(this,editor);
}
inherit(DeleteFeatureTool,EditingTool);
module.exports = DeleteFeatureTool;

var proto = DeleteFeatureTool.prototype;

/* BRUTTISSIMO! Tocca ridefinire tutte le parti interne di OL3 non esposte dalle API */

ol.geom.GeometryType = {
  POINT: 'Point',
  LINE_STRING: 'LineString',
  LINEAR_RING: 'LinearRing',
  POLYGON: 'Polygon',
  MULTI_POINT: 'MultiPoint',
  MULTI_LINE_STRING: 'MultiLineString',
  MULTI_POLYGON: 'MultiPolygon',
  GEOMETRY_COLLECTION: 'GeometryCollection',
  CIRCLE: 'Circle'
};

var styles = {};
var white = [255, 255, 255, 1];
var blue = [0, 153, 255, 1];
var red = [255, 0, 0, 1];
var width = 3;
styles[ol.geom.GeometryType.POLYGON] = [
  new ol.style.Style({
    fill: new ol.style.Fill({
      color: [255, 255, 255, 0.5]
    })
  })
];
styles[ol.geom.GeometryType.MULTI_POLYGON] =
    styles[ol.geom.GeometryType.POLYGON];

styles[ol.geom.GeometryType.LINE_STRING] = [
  new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: white,
      width: width + 2
    })
  }),
  new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: red,
      width: width
    })
  })
];
styles[ol.geom.GeometryType.MULTI_LINE_STRING] =
    styles[ol.geom.GeometryType.LINE_STRING];

styles[ol.geom.GeometryType.CIRCLE] =
    styles[ol.geom.GeometryType.POLYGON].concat(
        styles[ol.geom.GeometryType.LINE_STRING]
    );


styles[ol.geom.GeometryType.POINT] = [
  new ol.style.Style({
    image: new ol.style.Circle({
      radius: width * 2,
      fill: new ol.style.Fill({
        color: red
      }),
      stroke: new ol.style.Stroke({
        color: white,
        width: width / 2
      })
    }),
    zIndex: Infinity
  })
];
styles[ol.geom.GeometryType.MULTI_POINT] =
    styles[ol.geom.GeometryType.POINT];

styles[ol.geom.GeometryType.GEOMETRY_COLLECTION] =
    styles[ol.geom.GeometryType.POLYGON].concat(
        styles[ol.geom.GeometryType.LINE_STRING],
        styles[ol.geom.GeometryType.POINT]
    );


styles[ol.geom.GeometryType.POLYGON] = _.concat(styles[ol.geom.GeometryType.POLYGON],styles[ol.geom.GeometryType.LINE_STRING]);
styles[ol.geom.GeometryType.GEOMETRY_COLLECTION] = _.concat(styles[ol.geom.GeometryType.GEOMETRY_COLLECTION],styles[ol.geom.GeometryType.LINE_STRING]);
    
/* FINE BRUTTISSIMO! */

proto.run = function(){
  var self = this;
  this.layer = this.editor.getVectorLayer().getLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getLayer();
  
  this._selectInteraction = new ol.interaction.Select({
    layers: [this.layer,this.editingLayer],
    condition: ol.events.condition.click,
    style: function(feature, resolution) {
      return styles[feature.getGeometry().getType()];
    }
  });
  this.addInteraction(this._selectInteraction);
  
  this._deleteInteraction = new DeleteInteraction({
    features: this._selectInteraction.getFeatures()
  });
  this.addInteraction(this._deleteInteraction);
  
  var origGeometry = null;
  
  /*this._selectInteraction.on('select',function(e){
    var feature = e.selected[0];
    origGeometry = feature.getGeometry();
  });*/
  
  this._deleteInteraction.on('deleteend',function(e){
    var feature = e.features.getArray()[0];
    var isNew = self._isNew(feature);
    //try {
      if (!self._busy){
        self._busy = true;
        self.pause(true);
        self.deleteFeature(feature,isNew)
        .always(function(){
          self._busy = false;
          self.pause(false);
        })
      }
    //}
    /*catch (error){
      console.log(error);
      feature.setGeometry(origGeometry);
    }*/
  });

};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    this._selectInteraction.setActive(false);
    this._deleteInteraction.setActive(false);
  }
  else {
    this._selectInteraction.setActive(true);
    this._deleteInteraction.setActive(true);
  }
};

proto.stop = function(){
  var map = GUI.getComponent('map').getService().viewer.map;
  this._selectInteraction.getFeatures().clear();
  this.removeInteraction(this._selectInteraction);
  this._selectInteraction = null;
  this.removeInteraction(this._deleteInteraction);
  this._deleteInteraction = null;
  return true;
};

proto._deleteFeature = function(feature,isNew){
  this.editor.deleteFeature(feature,isNew);
  this._selectInteraction.getFeatures().clear();
  this._busy = false;
  this.pause(false);
  return true;
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

proto._isNew = function(feature){
  return (!_.isNil(this.editingLayer.getSource().getFeatureById(feature.getId())));
};

},{"./editingtool":9,"core/g3wobject":13,"core/utils/utils":34,"g3w-ol3/src/interactions//deletefeatureinteraction":42}],9:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

function EditingTool(editor,options) {
  var self = this;
  this._interactions = [];
  this.editor = editor;
  this.layer = this.editor.getVectorLayer().getMapLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getMapLayer();
  this.isPausable = false;
  this.options = options || {};
  this.steps = null;
  
  base(this);
}
inherit(EditingTool,G3WObject);

var proto = EditingTool.prototype;

proto.addInteraction = function(interaction) {
  var mapService = this.editor.getMapService();
  mapService.addInteraction(interaction);
  this._interactions.push(interaction);
};

proto.removeInteraction = function(interaction) {
  var _interactions = this._interactions;
  var mapService = this.editor.getMapService();
  _.forEach(_interactions,function(_interaction,idx) {
    if (_interaction == interaction) {
      _interactions.splice(idx,1);
    }
  });
  mapService.removeInteraction(interaction);
};

proto.ownsInteraction = function(interaction) {
  var owns = false;
  _.forEach(this._interactions,function(_interaction) {
    if (_interaction == interaction) {
      owns = true;
    }
  })
  return owns;
};

proto.stop = function(){
  if (this.steps) {
    this.steps.destroy();
  }
  return true;
}

EditingTool.Steps = function(steps){
  var index = -1;
  var steps = steps;
  
  this.next = function(){
    index += 1;
    var step = steps[index];
    this.emit('step',index,step);
  };
  
  this.currentStep = function(){
    return steps[index];
  };
  
  this.currentStepIndex = function(){
    return index;
  };
  
  this.totalSteps = function(){
    return steps.length;
  };
  
  this.reset = function(){
    index = 0;
  };
  
  this.destroy = function(){
    this.removeAllListeners();
  };
  
  this.completed = function(){
    this.emit('complete');
    this.reset();
  };
  
  this.insertStepAt = function(idx,step){
    steps.splice(idx,0,step);
  }
}
inherit(EditingTool.Steps,G3WObject);

module.exports = EditingTool;

},{"core/g3wobject":13,"core/utils/utils":34}],10:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

var EditingTool = require('./editingtool');

function ModifyFeatureTool(editor,options){
  var self = this;
  this.editor = editor;
  this.isPausable = true;
  this.drawInteraction = null;
  this.layer = null;
  this.editingLayer = null;
  this._deleteCondition = options.deleteCondition || undefined;
  this._snap = options.snap || null;
  this._snapInteraction = null; 

  this.setters = {
    modifyFeature: ModifyFeatureTool.prototype._modifyFeature
  };
  
  base(this,editor);
}
inherit(ModifyFeatureTool,EditingTool);
module.exports = ModifyFeatureTool;

var proto = ModifyFeatureTool.prototype;

proto.run = function(){
  var self = this;
  this.layer = this.editor.getVectorLayer().getMapLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getMapLayer();
  
  this._selectInteraction = new ol.interaction.Select({
    layers: [this.layer,this.editingLayer],
  });
  this.addInteraction(this._selectInteraction);
  
  this._modifyInteraction = new ol.interaction.Modify({
    features: this._selectInteraction.getFeatures(),
    deleteCondition: this._deleteCondition,
  });
  this.addInteraction(this._modifyInteraction);
  
  var origGeometry = null;
  
  this._modifyInteraction.on('modifystart',function(e){
    var feature = e.features.getArray()[0];
    origGeometry = feature.getGeometry().clone();
  });
  
  this._modifyInteraction.on('modifyend',function(e){
    var feature = e.features.getArray()[0];
    var isNew = self._isNew(feature);
    //try {
      if (!self._busy){
        self._busy = true;
        self.pause(true);
        self.modifyFeature(feature,isNew)
        .fail(function(){
          feature.setGeometry(origGeometry);
        })
        .always(function(){
          self._busy = false;
          self.pause(false);
        })
      }
    //}
    //catch (error){
    //  console.log(error);
    //  feature.setGeometry(origGeometry);
    //}
  });
  
  if (this._snap){
    this._snapInteraction = new ol.interaction.Snap({
      source: this._snap.vectorLayer.getSource()
    });
    this.addInteraction(this._snapInteraction);
  }
};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    if (this._snapInteraction){
      this._snapInteraction.setActive(false);
    }
    this._selectInteraction.setActive(false);
    this._modifyInteraction.setActive(false);
  }
  else {
    if (this._snapInteraction){
      this._snapInteraction.setActive(true);
    }
    this._selectInteraction.setActive(true);
    this._modifyInteraction.setActive(true);
  }
};

proto.stop = function(){
  this._selectInteraction.getFeatures().clear();
  if (this._snapInteraction){
     this.removeInteraction(this._snapInteraction);
     this._snapInteraction = null;
  }
  this.removeInteraction(this._selectInteraction);
  this._selectInteraction = null;
  this.removeInteraction(this._modifyInteraction);
  this._modifyInteraction = null;
  return true;
};

proto._modifyFeature = function(feature,isNew){
  // aggionro la geometria nel buffer di editing
  this.editor.updateFeature(feature,isNew);
  this._selectInteraction.getFeatures().clear();
  this._busy = false;
  this.pause(false);
  return true;
};

proto.removePoint = function(coordinate){
  if (this._modifyInteraction){
    // provo a rimuovere l'ultimo punto. Nel caso non esista la geometria gestisco silenziosamente l'errore
    try{
      this._modifyInteraction.removePoint();
    }
    catch (e){
      console.log(e);
    }
  }
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

proto._isNew = function(feature){
  return (!_.isNil(this.editingLayer.getSource().getFeatureById(feature.getId())));
};

},{"./editingtool":9,"core/g3wobject":13,"core/utils/utils":34}],11:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;

var EditingTool = require('./editingtool');

function MoveFeatureTool(editor){
  var self = this;
  this.editor = editor;
  this.isPausable = true;
  this.drawInteraction = null;
  this.layer = null;
  this.editingLayer = null;
  
  this._origGeometry = null;

  this.setters = {
    moveFeature: {
      fnc: MoveFeatureTool.prototype._moveFeature,
      fallback: MoveFeatureTool.prototype._fallBack
    }
  };
  
  base(this,editor);
}
inherit(MoveFeatureTool,EditingTool);
module.exports = MoveFeatureTool;

var proto = MoveFeatureTool.prototype;

proto.run = function(){
  var self = this;
  this.layer = this.editor.getVectorLayer().getMapLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getMapLayer();
  
  this._selectInteraction = new ol.interaction.Select({
    layers: [this.layer,this.editingLayer],
    condition: ol.events.condition.click
  });
  this.addInteraction(this._selectInteraction);
  
  this._translateInteraction = new ol.interaction.Translate({
    features: this._selectInteraction.getFeatures()
  });
  this.addInteraction(this._translateInteraction);
  
  this._translateInteraction.on('translatestart',function(e){
    var feature = e.features.getArray()[0];
    self._origGeometry = feature.getGeometry().clone();
    self.editor.emit('movestart',feature);
  });
  
  this._translateInteraction.on('translateend',function(e){
    var feature = e.features.getArray()[0];
    //try {
      if (!self._busy){
        self._busy = true;
        self.pause();
        self.moveFeature(feature)
        .then(function(res){
          self.pause(false);
        })
        .fail(function(){
          feature.setGeometry(self._origGeometry);
        });
      }
    //}
    /*catch (error){
      console.log(error);
      feature.setGeometry(self._origGeometry);
    }*/
  });

};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    this._selectInteraction.setActive(false);
    this._translateInteraction.setActive(false);
  }
  else {
    this._selectInteraction.setActive(true);
    this._translateInteraction.setActive(true);
  }
};

proto.stop = function(){
  this._selectInteraction.getFeatures().clear();
  this.removeInteraction(this._selectInteraction);
  this._selectInteraction = null;
  this.removeInteraction(this._translateInteraction);
  this._translateInteraction = null;
  return true;
};

proto._moveFeature = function(feature){
  this.editor.emit('moveend',feature);
  this.editor.updateFeature(feature);
  this._selectInteraction.getFeatures().clear();
  this._busy = false;
  this.pause(false);
  return true;
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

},{"./editingtool":9,"core/utils/utils":34}],12:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var noop = require('core/utils/utils').noop;
var PickFeatureInteraction = require('g3w-ol3/src/interactions/pickfeatureinteraction');

var EditingTool = require('./editingtool');

function PickFeatureTool(editor){
  var self = this;
  this.isPausable = true;
  this.pickFeatureInteraction = null;
  this._running = false;
  this._busy = false;
  
  // qui si definiscono i metodi che vogliamo poter intercettare, ed eventualmente bloccare (vedi API G3WObject)
  this.setters = {
    pickFeature: noop,
  };
  
  base(this,editor);
}
inherit(PickFeatureTool,EditingTool);
module.exports = PickFeatureTool;

var proto = PickFeatureTool.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(){
  var self = this;
  //var map = MapService.viewer.map;
  var layers = [this.editor.getVectorLayer().getMapLayer(),this.editor.getEditVectorLayer().getMapLayer()];
  
  this.pickFeatureInteraction = new PickFeatureInteraction({
    layers: layers
  });
  
  this.pickFeatureInteraction.on('picked',function(e){
    if (!self._busy){
      self._busy = true;
      self.pause(true);
      self.pickFeature(e.feature)
      .then(function(res){
        self._busy = false;
        self.pause(false);
      })
    }
  });
  
  this.addInteraction(this.pickFeatureInteraction);
};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    this.pickFeatureInteraction.setActive(false);
  }
  else {
    this.pickFeatureInteraction.setActive(true);
  }
};

// metodo eseguito alla disattivazione del tool
proto.stop = function(){
  this.removeInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction = null;
  return true;
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

},{"./editingtool":9,"core/utils/utils":34,"g3w-ol3/src/interactions/pickfeatureinteraction":44}],13:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var noop = require('core/utils/utils').noop;

/**
 * Un oggetto base in grado di gestire eventuali setter e relativa catena di listeners.
 * @constructor
 */
var G3WObject = function(){
  if (this.setters){
    this._setupListenersChain(this.setters);
  }
};
inherit(G3WObject,EventEmitter);

var proto = G3WObject.prototype;

/**
 * Inserisce un listener dopo che è stato eseguito il setter
 * @param {string} setter - Il nome del metodo su cui si cuole registrare una funzione listener
 * @param {function} listener - Una funzione listener (solo sincrona)
 */
proto.onafter = function(setter,listener){
  return this._onsetter('after',setter,listener,false);
};

// un listener può registrarsi in modo da essere eseguito PRIMA dell'esecuzione del metodo setter. Può ritornare true/false per
// votare a favore o meno dell'esecuzione del setter. Se non ritorna nulla o undefined, non viene considerato votante
/**
 * Inserisce un listener prima che venga eseguito il setter. Se ritorna false il setter non viene eseguito
 * @param {string} setter - Il nome del metodo su cui si cuole registrare una funzione listener
 * @param {function} listener - Una funzione listener, a cui viene passato una funzione "next" come ultimo parametro, da usare nel caso di listener asincroni
 */
proto.onbefore = function(setter,listener){
  return this._onsetter('before',setter,listener,false);
};

/**
 * Inserisce un listener prima che venga eseguito il setter. Al listener viene passato una funzione "next" come ultimo parametro, da chiamare con parametro true/false per far proseguire o meno il setter
 * @param {string} setter - Il nome del metodo su cui si cuole registrare una funzione listener
 * @param {function} listener - Una funzione listener, a cui 
 */
proto.onbeforeasync = function(setter,listener){
  return this._onsetter('before',setter,listener,true);
};

proto.un = function(setter,key){
  _.forEach(this.settersListeners,function(settersListeners,when){
    _.forEach(settersListeners[setter],function(setterListener){
      if(setterListener.key == key){
        delete setterListener;
      }
    })
  })
};

proto._onsetter = function(when,setter,listener,async){ /*when=before|after, type=sync|async*/
  var settersListeners = this.settersListeners[when];
  var listenerKey = ""+Math.floor(Math.random()*1000000)+""+Date.now();
  /*if ((when == 'before') && !async){
    listener = this._makeChainable(listener);
  }*/
  settersListeners[setter].push({
    key: listenerKey,
    fnc: listener,
    async: async
  });
  return listenerKey;
  //return this.generateUnListener(setter,listenerKey);
};

// trasformo un listener sincrono in modo da poter essere usato nella catena di listeners (richiamando next col valore di ritorno del listener)
/*proto._makeChainable = function(listener){
  var self = this
  return function(){
    var args = Array.prototype.slice.call(arguments);
    // rimuovo next dai parametri prima di chiamare il listener
    var next = args.pop();
    var canSet = listener.apply(self,arguments);
    var _canSet = true;
    if (_.isBoolean(canSet)){
      _canSet = canSet;
    }
    next(canSet);
  }
};*/

proto._setupListenersChain = function(setters){
  // inizializza tutti i metodi definiti nell'oggetto "setters" della classe figlia.
  var self = this;
  this.settersListeners = {
    after:{},
    before:{}
  };
  // per ogni setter viene definito l'array dei listeners e fiene sostituito il metodo originale con la funzioni che gestisce la coda di listeners
  _.forEach(setters,function(setterOption,setter){
    var setterFnc = noop;
    var setterFallback = noop;
    if (_.isFunction(setterOption)){
      setterFnc = setterOption
    }
    else {
      setterFnc = setterOption.fnc;
      setterFallback = setterOption.fallback || noop;
    }
    self.settersListeners.after[setter] = [];
    self.settersListeners.before[setter] = [];
    // setter sostituito
    self[setter] = function(){
      var args = arguments;
      // eseguo i listener registrati per il before
      var deferred = $.Deferred();
      var returnVal = null;
      var counter = 0;
      var canSet = true;
      
      // richiamata alla fine della catena di listeners
      function done(){
        if(canSet){
          // eseguo la funzione
          returnVal = setterFnc.apply(self,args);
          // e risolvo la promessa (eventualmente utilizzata da chi ha invocato il setter
          deferred.resolve(returnVal);
          
          var afterListeners = self.settersListeners.after[setter];
          _.forEach(afterListeners,function(listener, key){
            listener.fnc.apply(self,args);
          })
        }
        else {
          // se non posso proseguire 
          // chiamo l'eventuale funzione di fallback
          setterFallback.apply(self,args);
          // e rigetto la promessa
          deferred.reject();
        }
      };
      
      function complete(){
        // eseguo la funzione
        returnVal = setterFnc.apply(self,args);
        // e risolvo la promessa (eventualmente utilizzata da chi ha invocato il setter
        deferred.resolve(returnVal);
        
        var afterListeners = self.settersListeners.after[setter];
        _.forEach(afterListeners,function(listener, key){
          listener.fnc.apply(self,args);
        })
      }
      
      function abort(){
          // se non posso proseguire ...
          // chiamo l'eventuale funzione di fallback
          setterFallback.apply(self,args);
          // e rigetto la promessa
          deferred.reject();
      }
      
      var beforeListeners = this.settersListeners['before'][setter];
      // contatore dei listener che verrà decrementato ad ogni chiamata a next()
      counter = 0;
      
      // funzione passata come ultimo parametro ai listeners, che ***SE SONO STATI AGGIUNTI COME ASINCRONI la DEVONO*** richiamare per poter proseguire la catena
      function next(bool){
        var cont = true;
        if (_.isBoolean(bool)){
          cont = bool;
        }
        var _args = Array.prototype.slice.call(args);
        // se la catena è stata bloccata o se siamo arrivati alla fine dei beforelisteners
        if (cont === false || (counter == beforeListeners.length)){
          if(cont === false)
            abort.apply(self,args);
          else{
            completed = complete.apply(self,args);
            if(_.isUndefined(completed) || completed === true){
              self.emitEvent('set:'+setter,args);
            }
          }
        }
        else {
          if (cont){
            var listenerFnc = beforeListeners[counter].fnc;
            if (beforeListeners[counter].async){
              // aggiungo next come ulitmo parametro
              _args.push(next);
              counter += 1;
              listenerFnc.apply(self,_args)
            }
            else {
              var _cont = listenerFnc.apply(self,_args);
              counter += 1;
              next(_cont);
            }
          }
        }
      }
      
      next();
      return deferred.promise();
    }
  })
};

proto.un = function(listenerKey) {
  _.forEach(this.settersListeners,function(setterListeners,setter){
      _.forEach(setterListeners,function(listener,idx){
        if (listener.key == listenerKey) {
          setterListeners.splice(idx,1);
          delete listener;
        }
      })
  })
};

module.exports = G3WObject;

},{"core/utils/utils":34}],14:[function(require,module,exports){
var geom = {
  distance: function(c1,c2){
    return Math.sqrt(geom.squaredDistance(c1,c2));
  },
  squaredDistance: function(c1,c2){
    var x1 = c1[0];
    var y1 = c1[1];
    var x2 = c2[0];
    var y2 = c2[1];
    var dx = x2 - x1;
    var dy = y2 - y1;
    return dx * dx + dy * dy;
  },
  closestOnSegment: function(coordinate, segment) {
    var x0 = coordinate[0];
    var y0 = coordinate[1];
    var start = segment[0];
    var end = segment[1];
    var x1 = start[0];
    var y1 = start[1];
    var x2 = end[0];
    var y2 = end[1];
    var dx = x2 - x1;
    var dy = y2 - y1;
    var along = (dx === 0 && dy === 0) ? 0 :
        ((dx * (x0 - x1)) + (dy * (y0 - y1))) / ((dx * dx + dy * dy) || 0);
    var x, y;
    if (along <= 0) {
      x = x1;
      y = y1;
    } else if (along >= 1) {
      x = x2;
      y = y2;
    } else {
      x = x1 + along * dx;
      y = y1 + along * dy;
    }
    return [x, y];
  }
}

module.exports = geom;

},{}],15:[function(require,module,exports){
var Geometry = {};

Geometry.GeometryTypes = {
  POINT: "Point",
  MULTIPOINT: "MultiPoint",
  LINESTRING: "Line", // per seguire la definizione di QGis.GeometryType, che definisce Line invece di Linestring.
  MULTILINESTRING: "MultiLine",
  POLYGON: "Polygon",
  MULTIPOLYGON: "MultiPolygon",
  GEOMETRYCOLLECTION: "GeometryCollection"
};

Geometry.SupportedGeometryTypes = [
  Geometry.GeometryTypes.POINT,
  Geometry.GeometryTypes.MULTIPOINT,
  Geometry.GeometryTypes.LINESTRING,
  Geometry.GeometryTypes.MULTILINESTRING,
  Geometry.GeometryTypes.POLYGON,
  Geometry.GeometryTypes.MULTIPOLYGON
]

module.exports = Geometry;

},{}],16:[function(require,module,exports){
function init(config) {
  i18next
  .use(i18nextXHRBackend)
  .init({ 
      lng: 'it',
      ns: 'app',
      fallbackLng: 'it',
      resources: config.resources
  });
  
  jqueryI18next.init(i18next, $, {
    tName: 't', // --> appends $.t = i18next.t
    i18nName: 'i18n', // --> appends $.i18n = i18next
    handleName: 'localize', // --> appends $(selector).localize(opts);
    selectorAttr: 'data-i18n', // selector for translating elements
    targetAttr: 'data-i18n-target', // element attribute to grab target element to translate (if diffrent then itself)
    optionsAttr: 'data-i18n-options', // element attribute that contains options, will load/set if useOptionsAttr = true
    useOptionsAttr: false, // see optionsAttr
    parseDefaultValueFromContent: true // parses default values from content ele.val or ele.text
  });
}
    
var t = function(text){
    var trad = i18next.t(text);
    return trad;
};
    
module.exports = {
  init: init,
  t: t
}

},{}],17:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

function LoaderLayerService() {
    this._layers = {};
    this._type = 'tipo di layers';
    base(this);
}

inherit(LoaderLayerService, G3WObject);

var proto = LoaderLayerService.prototype;

proto.getLayers = function() {
  return this._layers;
};

proto.getLayer = function(layerName) {
    return this._layers[layerName];
};

proto.loadLayer = function(url, options) {
  //codice qui
};

module.exports = LoaderLayerService;

},{"core/g3wobject":13,"core/utils/utils":34}],18:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var VectorLayer = require('core/map/layer/vectorlayer');
var LoaderLayerService = require('./loaderlayerservice');

function VectorLoaderLayer() {
    this._layer = {};
    this._type = 'vector';
    base(this);
    this.init = function(layers) {
        this._layers = layers;
        //vado a fare il setup e a caricare tutti i dati dei layers
        this.setupAndLoadAllLayersData();
    }
}

inherit(VectorLoaderLayer, LoaderLayerService);

module.exports = new VectorLoaderLayer;

var proto = VectorLoaderLayer.prototype;

proto.setupAndLoadAllLayersData = function() {

    var self = this;
    var deferred = $.Deferred();
    var layersReady = _.reduce(this._layers, function(ready,layerCode){
        return !_.isNull(self._layers[layerCode].vector);
    });

    self.state.retrievingData = true;
    //nel caso in cui nessun vector layer è stato caricato
    // quindi la proprietà vector è null
    if (!layersReady){
        // eseguo le richieste delle configurazioni e mi tengo le promesse
        var vectorLayersSetup = _.map(layerCodes,function(layerCode){
            return self.setupVectorLayer(self._layers[layerCode]);
        });
        // aspetto tutte le promesse
        $.when.apply(this,vectorLayersSetup)
            .then(function(){
                var vectorLayers = Array.prototype.slice.call(arguments);
                var layerCodes = self.getLayerCodes();
                var vectorLayersForIternetCode = _.zipObject(layerCodes,vectorLayers);
                _.forEach(vectorLayersForIternetCode,function(vectorLayer,layerCode){
                    self._layers[layerCode].vector = vectorLayer;
                    var editor = new self._editorClasses[layerCode](self._mapService);
                    editor.setVectorLayer(vectorLayer);
                    editor.on("dirty",function(dirty){
                        self.state.hasEdits = dirty;
                    })
                    self._layers[layerCode].editor = editor;
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
        this._loadAllVectorsData()
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

    // verifico che il BBOX attuale non sia stato giÃ  caricato
    var bbox = this._mapService.state.bbox;
    var loadedExtent = this._loadedExtent;
    if (loadedExtent && ol.extent.containsExtent(loadedExtent,bbox)){
        return resolvedValue();
    }
    if (!loadedExtent){
        this._loadedExtent = bbox;
    }
    else {
        this._loadedExtent = ol.extent.extend(loadedExtent,bbox);
    }

    var deferred = $.Deferred();
    var self = this;
    var vectorDataRequests = _.map(self._layers,function(iternetLayer){
        return self.loadVectorData(iternetLayer.vector,bbox);
    });

    $.when.apply(this,vectorDataRequests)
        .then(function(){
            var vectorsDataResponse = Array.prototype.slice.call(arguments);
            var layerCodes = self.getLayerCodes();
            var vectorDataResponseForIternetCode = _.zipObject(layerCodes,vectorsDataResponse);
            _.forEach(vectorDataResponseForIternetCode,function(vectorDataResponse,layerCode){
                if (vectorDataResponse.featurelocks){
                    self._layers[layerCode].editor.setFeatureLocks(vectorDataResponse.featurelocks);
                }
            });
            deferred.resolve();
        })
        .fail(function(){
            deferred.reject();
        });

    return deferred.promise();
};

proto.setupVectorLayer = function(layerConfig) {
    var deferred = $.Deferred();
    // eseguo le richieste delle configurazioni e mi tengo le promesse
    self.getVectorLayerConfig(layerConfig.name)
        .then(function(vectorConfigResponse){
            // instanzio il VectorLayer
            var vectorConfig = vectorConfigResponse.vector;
            var vectorLayer = self.createVectorLayer({
                geometrytype: vectorConfig.geometrytype,
                format: vectorConfig.format,
                crs: "EPSG:3003",
                id: layerConfig.id,
                name: layerConfig.name,
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
            if (layerConfig.style) {
                vectorLayer.setStyle(layerConfig.style);
            }
            deferred.resolve(vectorLayer);
        })
        .fail(function(){
            deferred.reject();
        })
    return deferred.promise();
};

proto.loadVectorData = function(vectorLayer, bbox){
    var self = this;
    // eseguo le richieste de dati e mi tengo le promesse
    return self.getVectorLayerData(vectorLayer,bbox)
        .then(function(vectorDataResponse){
            vectorLayer.setData(vectorDataResponse.vector.data);
            return vectorDataResponse;
        });
};

// ottiene la configurazione del vettoriale (qui richiesto solo per la definizione degli input)
proto.getVectorLayerConfig = function(layerName){
    var d = $.Deferred();
    $.get(this.config.baseurl+layerName+"/?config")
        .done(function(data){
            d.resolve(data);
        })
        .fail(function(){
            d.reject();
        });
    return d.promise();
};

// ottiene il vettoriale in modalitÃ  editing
proto.getVectorLayerData = function(vectorLayer, bbox) {
    var d = $.Deferred();
    $.get(this.config.baseurl+vectorLayer.name+"/?editing&in_bbox="+bbox[0]+","+bbox[1]+","+bbox[2]+","+bbox[3])
        .done(function(data){
            d.resolve(data);
        })
        .fail(function(){
            d.reject();
        })
    return d.promise();
};

proto.createVectorLayer = function(options, data){
    var vector = new VectorLayer(options);
    return vector;
};
},{"./loaderlayerservice":17,"core/g3wobject":13,"core/map/layer/vectorlayer":20,"core/utils/utils":34}],19:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');


function MapLayer(config){
  this.config = config || {};
  this.id = config.id;
  
  this._olLayer = null;
  
  base(this);
}
inherit(MapLayer,G3WObject);

var proto = MapLayer.prototype;

proto.getId = function(){
  return this.id;
};

module.exports = MapLayer;

},{"core/g3wobject":13,"core/utils/utils":34}],20:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var truefnc = require('core/utils/utils').truefnc;
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var G3WObject = require('core/g3wobject');

function VectorLayer(config){
  var config = config || {};
  this.geometrytype = config.geometrytype || null;
  this.format = config.format || null;
  this.crs = config.crs  || null;
  this.id = config.id || null;
  this.name = config.name || "";
  this.pk = config.pk || "id"; // TODO: il GeoJSON setta l'id della feature da sé, e nasconde il campo PK dalle properties. In altri formati va verificato, e casomai usare feature.setId()
  
  this._olSource = new ol.source.Vector({
    features: new ol.Collection()
  });
  this._olLayer = new ol.layer.Vector({
    name: this.name,
    source: this._olSource
  });
  
  /*
   * Array di oggetti:
   * {
   *  name: Nome dell'attributo,
   *  type: integer | float | string | boolean | date | time | datetime,
   *  input: {
   *    label: Nome del campo di input,
   *    type: select | check | radio | coordspicker | boxpicker | layerpicker | fielddepend,
   *    options: {
   *      Le opzioni per lo spcifico tipo di input (es. "values" per la lista di valori di select, check e radio)
   *    }
   *  }
   * }
  */
  this._PKinAttributes = false;
  this._featuresFilter = null;
  this._fields = null
  this.lazyRelations = true;
  this._relations = null;
}
inherit(VectorLayer,G3WObject);
module.exports = VectorLayer;

var proto = VectorLayer.prototype;

proto.setData = function(featuresData){
  var self = this;
  var features;
  if (this.format) {
    switch (this.format){
      case "GeoJSON":
        var geojson = new ol.format.GeoJSON({
          defaultDataProjection: this.crs,
          geometryName: "geometry"
        });
        features = geojson.readFeatures(featuresData);
        break;
    }
    
    if (features && features.length) {
      if (!_.isNull(this._featuresFilter)){
        var features = _.map(features,function(feature){
          return self._featuresFilter(feature);
        });
      }
      
      var alreadyLoadedIds = this.getFeatureIds();
      var featuresToLoad = _.filter(features,function(feature){
        return !_.includes(alreadyLoadedIds,feature.getId());
      })
      
      this._olSource.addFeatures(featuresToLoad);
      
      // verifico, prendendo la prima feature, se la PK è presente o meno tra gli attributi
      var attributes = this.getSource().getFeatures()[0].getProperties();
      this._PKinAttributes = _.get(attributes,this.pk) ? true : false;
    }
  }
  else {
    console.log("VectorLayer format not defined");
  }
};

proto.setFeatureData = function(oldfid,fid,geometry,attributes){
  var feature = this.getFeatureById(oldfid);
  if (fid){
    feature.setId(fid);
  }
  
  if (geometry){
    feature.setGeometry(geometry);
  }
  
  if (attributes){
    var oldAttributes = feature.getProperties();
    var newAttributes =_.assign(oldAttributes,attributes);
    feature.setProperties(newAttributes);
  }
  
  return feature;
};

proto.addFeatures = function(features){
  this.getSource().addFeatures(features);
};

proto.setFeaturesFilter = function(featuresFilter){
  this._featuresFilter = featuresFilter;
};

proto.setFields = function(fields){
  this._fields = fields;
};

proto.setPkField = function(){
  var self = this;
  var pkfieldSet = false;
  _.forEach(this._fields,function(field){
    if (field.name == self.pk ){
      pkfieldSet = true;
    }
  });
  
  if (!pkfieldSet){
    this._fields
  }
};

proto.getFeatures = function(){
  return this.getSource().getFeatures();
};

proto.getFeatureIds = function(){
  var featureIds = _.map(this.getSource().getFeatures(),function(feature){
    return feature.getId();
  })
  return featureIds
};

proto.getFields = function(){
  return _.cloneDeep(this._fields);
};

proto.getFieldsNames = function(){
  return _.map(this._fields,function(field){
    return field.name;
  });
};

proto.getFieldsWithValues = function(obj){
  var self = this;
  /*var fields = _.cloneDeep(_.filter(this._fields,function(field){
    return ((field.name != self.pk) && field.editable);
  }));*/
  var fields = _.cloneDeep(this._fields);
  
  var feature, attributes;
  
  // il metodo accetta sia feature che fid
  if (obj instanceof ol.Feature){
    feature = obj;
  }
  else if (obj){
    feature = this.getFeatureById(obj);
  }
  if (feature){
    attributes = feature.getProperties();
  }
  
  _.forEach(fields,function(field){
    if (feature){
      if (!this._PKinAttributes && field.name == self.pk){
        field.value = feature.getId();
      }
      else{
        field.value = attributes[field.name];
      }
    }
    else{
      field.value = null;
    }
  });
  return fields;
};

proto.setRelations = function(relations){
  this._relations = relations;
  _.forEach(relations,function(relation){
    _.forEach(relation.fields,function(field,idx){
      if (field.name == relation.pk) {
        relation.pkFieldIndex = idx
      }
    })
  })
};

proto.getRelations = function(){
  return this._relations;
};

proto.getRelation = function(relationName) {
  var relation;
  _.forEach(this._relations,function(_relation){
    if (_relation.name == relationName) {
      relation = _relation;
    }
  })
  return relation;
};

proto.hasRelations = function(){
  return !_.isNull(this._relations);
};

proto.getRelationPkFieldIndex = function(relation) {
  var pkFieldIndex;
  _.forEach(relation.fields,function(field,idx){
    if (field.name == relation.pk) {
      pkFieldIndex = idx;
    }
  })
  return pkFieldIndex;
};

proto.getRelationElementPkValue = function(relation,element) {
  var pkFieldIndex = this.getRelationPkFieldIndex(relation);
  return element.fields[pkFieldIndex].value;
};

proto.getRelationsFksKeys = function(){
  var fks = [];
  _.forEach(this._relations,function(relation){
    fks.push(relation.fk);
  })
  return fks;
};

proto.getRelationFields = function(relation) {
  return relation.fields;
};

proto.getRelationFieldsNames = function(relation){
  return _.map(relationFields,function(field){
    return field.name;
  });
};

// ottengo le relazioni a partire dal fid di una feature esistente
proto.getRelationsWithValues = function(fid){
  if (!this._relations) {
    resolve([]);
  }
  var relations = _.cloneDeep(this._relations);
  var self = this;
  if (!fid || !this.getFeatureById(fid)){
    _.forEach(relations,function(relation){
      relation.elements = [];
    });
    return resolve(relations);
  }
  else {
    if (this.lazyRelations){
      var deferred = $.Deferred();
      var attributes = this.getFeatureById(fid).getProperties();
      var fks = {};
      _.forEach(relations,function(relation){
        var keyVals = [];
        _.forEach(relation.fk,function(fkKey){
          fks[fkKey] = attributes[fkKey];
        });
      })
      
      this.getRelationsWithValuesFromFks(fks)
      .then(function(relationsResponse){
        deferred.resolve(relationsResponse);
      })
      .fail(function(){
        deferred.reject();
      });
      return deferred.promise();
    }
  }
};

// ottengo le relazioni valorizzate a partire da un oggetto con le chiavi FK come keys e i loro valori come values
proto.getRelationsWithValuesFromFks = function(fks){
  var self = this;
  var relations = _.cloneDeep(this._relations);
  var relationsRequests = [];

  _.forEach(relations,function(relation){
    relation.elements = []; // creo la proprietà che accoglierà gli elementi della relazione
    var url = relation.url;
    var keyVals = [];
    _.forEach(relation.fk,function(fkKey){
      var fkValue = fks[fkKey];
      keyVals.push(fkKey+"="+fkValue);
    });
    var fkParams = _.join(keyVals,"&");
    url += "?"+fkParams;
    relationsRequests.push($.get(url)
      .then(function(relationsElements){
        if (relationsElements.length) {
          _.forEach(relationsElements,function(relationElement){
            var element = {};
            element.fields = _.cloneDeep(relation.fields);
            _.forEach(element.fields,function(field){
              field.value = relationElement[field.name];
              if (field.name == relation.pk) {
                element.id = field.value // aggiungo element.id dandogli il valore della chiave primaria della relazione
              }
            });
            
            relation.elements.push(element);
          })
        }
      })
    )
  })
  
  return $.when.apply(this,relationsRequests)
  .then(function(){
    return relations;
  });
}

proto.setStyle = function(style){
  this._olLayer.setStyle(style);
};

proto.getMapLayer = function(){
  return this._olLayer;
};

proto.getSource = function(){
  return this._olLayer.getSource();
};

proto.getFeatureById = function(id){
  return this._olLayer.getSource().getFeatureById(id);
};

proto.clear = function(){
  this.getSource().clear();
};

proto.addToMap = function(map){
  map.addLayer(this._olLayer);
};

// data una feature verifico se ha tra gli attributi i valori delle FK delle (eventuali) relazioni
proto.featureHasRelationsFksWithValues = function(feature){
  var attributes = feature.getProperties();
  var fksKeys = this.getRelationsFksKeys();
  return _.every(fksKeys,function(fkKey){
    var value = attributes[fkKey];
    return (!_.isNil(value) && value != '');
  })
};

// data una feature popolo un oggetto con chiavi/valori delle FK delle (eventuali) relazione
proto.getRelationsFksWithValuesForFeature = function(feature){
  var attributes = feature.getProperties();
  var fks = {};
  var fksKeys = this.getRelationsFksKeys();
  _.forEach(fksKeys,function(fkKey){
    fks[fkKey] = attributes[fkKey];
  })
  return fks;
};

},{"core/g3wobject":13,"core/utils/utils":34}],21:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var geo = require('core/utils/geo');
var MapLayer = require('core/map/layer/maplayer');
var RasterLayers = require('g3w-ol3/src/layers/rasters');

function WMSLayer(options,extraParams){
  var self = this;
  this.LAYERTYPE = {
    LAYER: 'layer',
    MULTILAYER: 'multilayer'
  };

  this.extraParams = extraParams
  this.layers = [];
  
  base(this,options);
}
inherit(WMSLayer,MapLayer)
var proto = WMSLayer.prototype;

proto.getOLLayer = function(withLayers){
  var olLayer = this._olLayer;
  if (!olLayer){
    olLayer = this._olLayer = this._makeOlLayer(withLayers);
  }
  return olLayer;
};

proto.getSource = function(){
  return this.getOLLayer().getSource();
};

proto.getInfoFormat = function() {
  return 'application/vnd.ogc.gml';
};

proto.getGetFeatureInfoUrl = function(coordinate,resolution,epsg,params){
  return this.getOLLayer().getSource().getGetFeatureInfoUrl(coordinate,resolution,epsg,params);
};

proto.getLayerConfigs = function(){
  return this.layers;
};

proto.addLayer = function(layer){
  this.layers.push(layer);
};

proto.toggleLayer = function(layer){
  _.forEach(this.layers,function(_layer){
    if (_layer.id == layer.id){
      _layer.visible = layer.visible;
    }
  });
  this._updateLayers();
};
  
proto.update = function(mapState,extraParams){
  this._updateLayers(mapState,extraParams);
};

proto.isVisible = function(){
  return this._getVisibleLayers().length > 0;
};

proto.getQueryUrl = function(){
  var layer = this.layers[0];
  if (layer.infourl && layer.infourl != '') {
    return layer.infourl;
  }
  return this.config.url;
};

proto.getQueryableLayers = function(){ 
  return _.filter(this.layers,function(layer){
    return layer.isQueryable();
  });
};

proto._getVisibleLayers = function(mapState){
  var self = this;
  var visibleLayers = [];
  _.forEach(this.layers,function(layer){
    var resolutionBasedVisibility = layer.state.maxresolution ? (layer.state.maxresolution && layer.state.maxresolution > mapState.resolution) : true;
    if (layer.state.visible && resolutionBasedVisibility) {
      visibleLayers.push(layer);
    }    
  })
  return visibleLayers;
};

proto._makeOlLayer = function(withLayers){
  var self = this;
  var wmsConfig = {
    url: this.config.url,
    id: this.config.id
  };
  
  if (withLayers) {
    wmsConfig.layers = _.map(this.layers,function(layer){
      return layer.getWMSLayerName();
    });
  }
  
  var representativeLayer = this.layers[0]; //BRUTTO, DEVO PRENDERE UN LAYER A CASO (IL PRIMO) PER VEDERE SE PUNTA AD UN SOURCE DIVERSO (dovrebbe accadere solo per i layer singoli, WMS esterni)
  
  if (representativeLayer.state.source && representativeLayer.state.source.type == 'wms' && representativeLayer.state.source.url){
    wmsConfig.url = representativeLayer.state.source.url;
  };
  
  var olLayer = new RasterLayers.WMSLayer(wmsConfig,this.extraParams);
  
  olLayer.getSource().on('imageloadstart', function() {
        self.emit("loadstart");
      });
  olLayer.getSource().on('imageloadend', function() {
      self.emit("loadend");
  });
  
  return olLayer
};

proto.checkLayerDisabled = function(layer,resolution) {
  var scale = geo.resToScale(resolution);
  var enabled = true;
  if (layer.state.maxresolution){
    enabled = enabled && (layer.state.maxresolution > resolution);
  }
  if (layer.state.minresolution){
    enabled = enabled && (layer.state.minresolution < resolution);
  }
  if (layer.state.minscale) {
    enabled = enabled && (layer.state.minscale > scale);
  }
  if (layer.state.maxscale) {
    enabled = enabled && (layer.state.maxscale < scale);
  }
  layer.state.disabled = !enabled;
};

proto.checkLayersDisabled = function(resolution){
  var self = this;
  _.forEach(this.layers,function(layer){
    self.checkLayerDisabled(layer,resolution);
  });
};

proto._updateLayers = function(mapState,extraParams){
  this.checkLayersDisabled(mapState.resolution);
  var visibleLayers = this._getVisibleLayers(mapState);
  if (visibleLayers.length > 0) {
    var params = {
      LAYERS: _.join(_.map(visibleLayers,function(layer){
        return layer.getWMSLayerName();
      }),',')
    };
    if (extraParams) {
      params = _.assign(params,extraParams);
    }
    this._olLayer.setVisible(true);
    this._olLayer.getSource().updateParams(params);
  }
  else {
    this._olLayer.setVisible(false);
  }
};

module.exports = WMSLayer;

},{"core/map/layer/maplayer":19,"core/utils/geo":33,"core/utils/utils":34,"g3w-ol3/src/layers/rasters":46}],22:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

function MapsRegistry() {
  base(this);
  
  this._mapsServices = {
  };
  
  this.addMap = function(mapService) {
    this._registerMapService(mapService);
  };
  
  this._registerMapService = function(mapService) {
    var mapService = this._mapsServices[mapService.id]
    if (_.isUndefined(mapService)) {
      this._mapsServices[mapService.id] = mapService;
    }
  };
} 
inherit(MapsRegistry,G3WObject);

module.exports = MapsRegistry;

},{"core/g3wobject":13,"core/utils/utils":34}],23:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ProjectsRegistry = require('core/project/projectsregistry');
var PluginsRegistry = require('./pluginsregistry');

var Plugin = function() {

  this.name = '(no name)';
  this.config = null;
  base(this);

};

inherit(Plugin,G3WObject);

var proto = Plugin.prototype;

//recuperare il servizio associato al plugin
proto.getPluginService = function() {
  return this.service
};

//settare un servizio
proto.setPluginService = function(Service) {
  this.service = Service;
};

//recupero il nome
proto.getName = function() {
  return this.name;
};

//setto il nome
proto.setName = function(name) {
  this.name = name;
};

//recupero la configurazione del plugin dal registro dei plugins
proto.getPluginConfig = function() {
  return PluginsRegistry.getPluginConfig(this.name);
};

//verifica la compatibilià con il progetto corrente
proto.isCurrentProjectCompatible = function(projectId) {
  var project = ProjectsRegistry.getCurrentProject();
  return projectId == project.getGid();
};

//registrazione plugin se compatibile con il progetto corrente
proto.registerPlugin = function(projectId) {
  if (this.isCurrentProjectCompatible(projectId)) {
    PluginsRegistry.registerPlugin(this);
    return true;
  }
  return false;
};

// setup dell'interfaccia
proto.setupGui = function() {
  //al momento niente non so se verrà usata
};

module.exports = Plugin;

},{"./pluginsregistry":24,"core/g3wobject":13,"core/project/projectsregistry":27,"core/utils/utils":34}],24:[function(require,module,exports){
var base = require('core/utils/utils').base;
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');
var ApplicationService = require('core/applicationservice');

//var Plugin = require('./plugin');
//var ToolsService = require('core/plugin/toolsservice');

function PluginsRegistry(){
  var self = this;
  this.config = null;
  // un domani questo sarà dinamico
  this._plugins = {};

  this.setters = {
    registerPlugin: function(plugin){
      if (!self._plugins[plugin.name]) {
        self._plugins[plugin.name] = plugin;
      }
    }
  }
  
  base(this);
  
  this.init = function(options){
    var self = this;
    this.pluginsBaseUrl = options.plusingBaseUrl
    this.pluginsConfigs = options.pluginsConfigs;
    _.forEach(this.pluginsConfigs,function(pluginConfig,name){
      self._setup(name,pluginConfig);
    })
  };
  
  this._setup = function(name,pluginConfig) {
    var self = this;
    if (pluginConfig){
      var url = this.pluginsBaseUrl+'plugins/'+name+'/plugin.js';
      $script(url);
    }
  };
  
  this.getPluginConfig = function(pluginName) {
    return this.pluginsConfigs[pluginName];
  };
  
  /*this.activate = function(plugin) {
    var tools = plugin.getTools();
    if (tools.length) {
      ToolsService.registerToolsProvider(plugin);
    }
  };*/
};

inherit(PluginsRegistry,G3WObject);

module.exports = new PluginsRegistry

},{"core/applicationservice":2,"core/g3wobject":13,"core/utils/utils":34}],25:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils//utils').base;
var G3WObject = require('core/g3wobject');
var ApplicationService = require('core/applicationservice');

var ProjectLayer = require('./projectlayer');

function Project(projectConfig) {
  var self = this;
  
  /* struttura oggetto 'project'
  {
    id,
    type,
    gid,
    name,
    crs,
    extent,
    layerstree,
    overviewprojectgid
  }
  */
  this.state = projectConfig;
  
  this._layers = {};
  function traverse(obj){
    _.forIn(obj, function (layerConfig, key) {
        //verifica che il valore dell'id non sia nullo
        if (!_.isNil(layerConfig.id)) {
            var layer = self.buildProjectLayer(layerConfig);
            self._layers[layer.getId()] = layer;
        }
        if (!_.isNil(layerConfig.nodes)) {
            traverse(layerConfig.nodes);
        }
    });
  }
  traverse(projectConfig.layerstree);
  
  /*var eventType = 'projectset';
  if (doswitch && doswitch === true) {
    eventType = 'projectswitch';
  }
  this.emit(eventType);*/
  
  this.setters = {
    setLayersVisible: function(layersIds,visible){
      _.forEach(layersIds,function(layerId){
        self.getLayerById(layerId).state.visible = visible;
      })
    },
    setBaseLayer: function(id){
      _.forEach(self.state.baseLayers,function(baseLayer){
        baseLayer.visible = (baseLayer.id == id);
      })
    },
    setLayerSelected: function(layerId,selected){
      _.forEach(this._layers,function(layer){
        layer.state.selected = ((layerId == layer.state.id) && selected) || false;
      })
    }
  };

  base(this);
}
inherit(Project,G3WObject);

var proto = Project.prototype;

proto.buildProjectLayer = function(layerConfig) {
  var layer = new ProjectLayer(layerConfig);
  layer.setProject(this);
  
  // aggiungo proprietà non ottenute dalla consfigurazione
  layer.state.selected = false;
  layer.state.disabled = false;
  
  return layer;
};

proto.getGid = function() {
  return this.state.gid;
};

proto.getOverviewProjectGid = function() {
  return this.state.overviewprojectgid.gid;
};

proto.getLayersDict = function(options){
  var options = options || {};

  var filterQueryable = options.QUERYABLE;
  
  var filterVisible = options.VISIBLE;
  
  var filterSelected = options.SELECTED;
  var filterSelectedOrAll = options.SELECTEDORALL;
  
  if (filterSelectedOrAll) {
    filterSelected = null;
  }
  
  if (_.isUndefined(filterQueryable) && _.isUndefined(filterVisible) && _.isUndefined(filterSelected) && _.isUndefined(filterSelectedOrAll)) {
    return this._layers;
  }
  
  var layers = this._layers;
  
  if (filterQueryable) {
    layers = _.filter(layers,function(layer){
      return filterQueryable && layer.isQueryable();
    });
  }
  
  if (filterVisible) {
    layers = _.filter(layers,function(layer){
      return filterVisible && layer.isVisible();
    });
  }
  
  if (filterSelected) {
    layers = _.filter(layers,function(layer){
      return filterSelected && layer.isSelected();
    });
  }
  
  if (filterSelectedOrAll) {
    var _layers = layers;
    layers = _.filter(layers,function(layer){
      return layer.isSelected();
    });
    layers = layers.length ? layers : _layers;
  }
  
  return layers;
};

// ritorna l'array dei layers (con opzioni di ricerca)
proto.getLayers = function(options) {
  var layers = this.getLayersDict(options);
  return _.values(layers);
}

proto.getLayerById = function(layerId) {
  return this.getLayersDict()[layerId];
};

proto.getLayerByName = function(name) {
  var layer = null;
  _.forEach(this.getLayers(),function(layer){
    if (layer.getName() == name){
      layer = _layer;
    }
  });
  return layer;
};

proto.getLayerAttributes = function(layerId){
  return this.getLayerById(layerId).getAttributes();
};

proto.getLayerAttributeLabel = function(layerId,name){
  return this.getLayerById(layerId).getAttributeLabel(name);
};

proto.toggleLayer = function(layerId,visible){
  var layer = this.getLayerById(layerId);
  var visible = visible || !layer.state.visible;
  this.setLayersVisible([layerId],visible);
};

proto.toggleLayers = function(layersIds,visible){
  this.setLayersVisible(layersIds,visible);
};

proto.selectLayer = function(layerId){
  this.setLayerSelected(layerId,true);
};

proto.unselectLayer = function(layerId) {
  this.setLayerSelected(layerId,false);
};

proto.getCrs = function() {
  return this.state.crs;
}

proto.getInfoFormat = function() {
  return 'application/vnd.ogc.gml';
};

proto.getWmsUrl = function(){
  return this.state.WMSUrl;
};

proto.getLegendUrl = function(layer){
  var url = this.getWmsUrl();
  sep = (url.indexOf('?') > -1) ? '&' : '?';
  return this.getWmsUrl()+sep+'SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&SLD_VERSION=1.1.0&FORMAT=image/png&TRANSPARENT=true&ITEMFONTCOLOR=white&LAYERTITLE=False&ITEMFONTSIZE=10&LAYER='+layer.name;
};

module.exports = Project;

},{"./projectlayer":26,"core/applicationservice":2,"core/g3wobject":13,"core/utils//utils":34,"core/utils/utils":34}],26:[function(require,module,exports){
var GeometryTypes = require('core/geometry/geometry').GeometryTypes;

var CAPABILITIES = {
  QUERY: 1,
  EDIT: 2
};

var EDITOPS = {
  INSERT: 1,
  UPDATE: 2,
  DELETE: 4
};

function ProjectLayer(state) {
  /*this.state = {
    fields: options.fields,
    bbox: options.bbox,
    capabilities: options.capabilities,
    crs: options.crs,
    disabled: options.disabled,
    editops: options.editops,
    geometrytype: options.geometrytype,
    id: options.id,
    infoformat: options.infoformat,
    infourl: options.infourl,
    maxscale: options.maxscale,
    minscale: options.minscale,
    multilayer: options.multilayer,
    name: options.name,
    origname: options.origname,
    relations: options.relations,
    scalebasedvisibility: options.scalebasedvisibility,
    selected: options.selected,
    servertype: options.servertype,
    source: options.source,
    title: options.title,
    visible: options.visible,
    selected: options.selected | false,
    disabled: options.disabled | false
  }*/
  
  // lo stato è sincronizzato con quello del layerstree
  this.state = state;
  
  this._project = null;
};

var proto = ProjectLayer.prototype;

proto.getProject = function() {
  return this._project;
};

proto.setProject = function(project) {
  this._project = project
};

proto.getId = function() {
  return this.state.id;
};

proto.getName = function() {
  return this.state.name;
};

proto.getOrigName = function() {
  return this.state.origname;
};

proto.getGeometryType = function() {
  return this.state.geometrytype;
};

proto.getAttributes = function() {
  return this.state.fields;
};

proto.getAttributeLabel = function(name) {
  var label;
  _.forEach(this.getAttributes(),function(field){
    if (field.name == name){
      label = field.label;
    }
  })
  return label;
};

proto.isSelected = function() {
  return this.state.selected;
};

proto.isDisabled = function() {
  return this.state.disabled;
};

proto.isQueryable = function(){
  var queryEnabled = false;
  var queryableForCababilities = (this.state.capabilities && (this.state.capabilities && CAPABILITIES.QUERY)) ? true : false;
  if (queryableForCababilities) {
    // è interrogabile se visibile e non disabilitato (per scala) oppure se interrogabile comunque (forzato dalla proprietà infowhennotvisible)
    queryEnabled = (this.state.visible && !this.state.disabled);
    if (!_.isUndefined(this.state.infowhennotvisible) && (this.state.infowhennotvisible === true)) {
      queryEnabled = true;
    }
  }
  return queryEnabled;
};

proto.isVisible = function() {
  return this.state.visible;
}

proto.getQueryLayerName = function() {
  var queryLayerName;
  if (this.state.infolayer && this.state.infolayer != '') {
    queryLayerName = this.state.infolayer;
  }
  else {
    queryLayerName = this.state.name;
  }
  return queryLayerName;
};

proto.getServerType = function() {
  if (this.state.servertype && this.state.servertype != '') {
    return this.state.servertype;
  }
  else {
    return ProjectLayer.ServerTypes.QGIS;
  }
};

proto.getCrs = function() {
  return this.getProject().getCrs();
}

proto.isExternalWMS = function() {
  return (this.state.source && this.state.source.url);
};

proto.getWMSLayerName = function() {
  var layerName = this.state.name;
  if (this.state.source && this.state.source.layers){
    layerName = this.state.source.layers;
  };
  return layerName;
};

proto.getQueryUrl = function() {
  if (this.state.infourl && this.state.infourl != '') {
    return this.state.infourl;
  }
  else {
    return this.getProject().getWmsUrl();
  }
};

proto.setQueryUrl = function(queryUrl) {
  this.state.inforurl = queryUrl;
};

proto.getInfoFormat = function() {
  if (this.state.infoformat && this.state.infoformat != '') {
    return this.state.infoformat;
  }
  else {
    return this.getProject().getInfoFormat();
  }
};

proto.setInfoFormat = function(infoFormat) {
  this.state.infoformat = infoFormat;
};

proto.getWmsUrl = function() {
  var url;
  if (this.state.source && this.state.source.type == 'wms' && this.state.source.url){
    url = this.state.source.url
  }
  else {
    url = this.getProject().getWmsUrl();
  }
  return url;
};

proto.getLegendUrl = function() {
  var url = this.getWmsUrl();
  sep = (url.indexOf('?') > -1) ? '&' : '?';
  return this.getWmsUrl()+sep+'SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&SLD_VERSION=1.1.0&FORMAT=image/png&TRANSPARENT=true&ITEMFONTCOLOR=white&LAYERTITLE=False&ITEMFONTSIZE=10&LAYER='+this.getWMSLayerName();
};

ProjectLayer.ServerTypes = {
  OGC: "OGC",
  QGIS: "QGIS",
  Mapserver: "Mapserver",
  Geoserver: "Geoserver",
  ArcGIS: "ArcGIS"
};

module.exports = ProjectLayer;

},{"core/geometry/geometry":15}],27:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var G3WObject = require('core/g3wobject');
var Project = require('core/project/project');


/* service
Funzione costruttore contentente tre proprieta':
    setup: metodo di inizializzazione
    getLayersState: ritorna l'oggetto LayersState
    getLayersTree: ritorna l'array layersTree dall'oggetto LayersState
*/

// Public interface
function ProjectsRegistry() {

  var self = this;
  this.config = null;
  this.initialized = false;
  //tipo di progetto
  this.projectType = null;
  
  this.setters = {
    setCurrentProject: function(project){
      self.state.currentProject = project;
    }
  };
  //stato del registro progetti
  this.state = {
    baseLayers: {},
    minScale: null,
    maxscale: null,
    currentProject: null
  };
  
  // tutte le configurazioni di base dei progetti, ma di cui non è detto che
  // sia ancora disponibile l'istanza (lazy loading)
  this._pendingProjects = [];
  this._projects = {};
  
  base(this);
}
inherit(ProjectsRegistry, G3WObject);

var proto = ProjectsRegistry.prototype;

proto.init = function(config) {

  var self = this;
  //verifico se è già stato inizilizzato
  if (!this.initialized){
    this.initialized = true;
    //salva la configurazione
    this.config = config;
    //setta lo state
    this.setupState();
    return this.getProject(config.initproject)
    .then(function(project) {
      self.setCurrentProject(project);
      //aggiunto tipo progetto
      self.setProjectType(project.state.type);
    });
  }
};

proto.setProjectType = function(projectType) {
   this.projectType = projectType;
};

proto.setupState = function() {

  var self = this;
  
  self.state.baseLayers = self.config.baselayers;
  self.state.minScale = self.config.minscale;
  self.state.maxScale = self.config.maxscale;
  self.state.crs = self.config.crs;
  self.state.proj4 = self.config.proj4;

  // setto  quale progetto deve essere impostato come overview
  //questo è settato da django-admin
  var overViewProject = (self.config.overviewproject && self.config.overviewproject.gid) ? self.config.overviewproject : null;
  //per ogni progetto ciclo e setto tutti gli attributi comuni
  // come i base layers etc ..
  self.config.projects.forEach(function(project){
    project.baselayers = self.config.baselayers;
    project.minscale = self.config.minscale;
    project.maxscale = self.config.maxscale;
    project.crs = self.config.crs;
    project.proj4 = self.config.proj4;
    project.overviewprojectgid = overViewProject;
    //aggiungo tutti i progetti ai pending project
    self._pendingProjects.push(project);
  });
};

proto.getProjectType = function() {
  return this.projectType;
};

proto.getPendingProjects = function() {
  return this._pendingProjects;
};

proto.getCurrentProject = function(){
  return this.state.currentProject;
};

// ottengo il progetto dal suo gid;
// ritorna una promise nel caso non fosse stato ancora scaricato
// il config completo (e quindi non sia ancora istanziato Project)
proto.getProject = function(projectGid) {
  var self = this;
  var d = $.Deferred();
  var pendingProject = false;
  var project = null;
  // scorro atraverso i pending project che contengono oggetti
  // di configurazione dei progetti del gruppo
  this._pendingProjects.forEach(function(_pendingProject) {
    if (_pendingProject.gid == projectGid) {
      pendingProject = _pendingProject;
      project = self._projects[projectGid];
    }
  });
  if (!pendingProject) {
    return reject("Project doesn't exist");
  }

  if (project) {
    return d.resolve(project);
  } else {
    return this._getProjectFullConfig(pendingProject)
    .then(function(projectFullConfig){
      var projectConfig = _.merge(pendingProject,projectFullConfig);
      self._buildProjectTree(projectConfig);
      projectConfig.WMSUrl = self.config.getWmsUrl(projectConfig);
      var project = new Project(projectConfig);
      self._projects[projectConfig.gid] = project;
      return d.resolve(project);
    });
  }
  
  return d.promise();
};
  
//ritorna una promises
proto._getProjectFullConfig = function(projectBaseConfig) {
  var self = this;
  var deferred = $.Deferred();
  var url = this.config.getProjectConfigUrl(projectBaseConfig);
  $.get(url).done(function(projectFullConfig) {
      deferred.resolve(projectFullConfig);
  });
  return deferred.promise();
};

proto._buildProjectTree = function(project){
  var layers = _.keyBy(project.layers,'id');
  var layersTree = _.cloneDeep(project.layerstree);
  
  function traverse(obj){
    _.forIn(obj, function (layer, key) {
      //verifica che il nodo sia un layer e non un folder
      if (!_.isNil(layer.id)) {
          var fulllayer = _.merge(layer,layers[layer.id]);
          obj[parseInt(key)] = fulllayer;
      }
      if (!_.isNil(layer.nodes)){
        // aggiungo proprietà title per l'albero
        layer.title = layer.name;
        traverse(layer.nodes);
      }
    });
  }
  traverse(layersTree);
  project.layerstree = layersTree;
};

module.exports = new ProjectsRegistry();

},{"core/g3wobject":13,"core/project/project":25,"core/utils/utils":34}],28:[function(require,module,exports){
var ProjectTypes = {
  QDJANGO: 'qdjango',
  OGR: 'ogr'
};

module.exports = ProjectTypes;
},{}],29:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var resolve = require('core/utils/utils').resolve;
var ProjectsRegistry = require('core/project/projectsregistry');

// FILTRI
var Filters = {
  eq: '=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '=<',
  LIKE: 'LIKE',
  ILIKE: 'ILIKE',
  AND: 'AND',
  OR: 'OR',
  NOT: '!='
};

function QueryQGISWMSProvider() {

  self = this;
  //funzione che fa la richiesta vera e propria al server qgis
  this.submitGetFeatureInfo = function(options) {
    var url = options.url || '';
    var querylayername = options.querylayername || null;
    var filter = options.filter || null;
    var bbox = options.bbox || ProjectsRegistry.getCurrentProject().state.extent.join(',');
    var simpleWmsSearchMaxResults = null;
    var crs = options.crs || '4326;'
    return $.get( url, {
        'SERVICE': 'WMS',
        'VERSION': '1.3.0',
        'REQUEST': 'GetFeatureInfo',
        'LAYERS': querylayername,
        'QUERY_LAYERS': querylayername,
        'FEATURE_COUNT': simpleWmsSearchMaxResults ||  50,
        'INFO_FORMAT': 'application/vnd.ogc.gml',
        'CRS': 'EPSG:'+ crs,
        'FILTER': filter,
        // Temporary fix for https://hub.qgis.org/issues/8656 (fixed in QGIS master)
        'BBOX': bbox // QUI CI VA IL BBOX DELLA MAPPA
      }
    );
   };

  //funzione che fa la ricerca
  this.doSearch = function(queryFilterObject) {
    var querylayer = queryFilterObject.queryLayer;
    var url = querylayer.getQueryUrl();
    var crs = querylayer.getCrs();
    var filterObject = queryFilterObject.filterObject;
    //creo il filtro
    var filter = this.createFilter(filterObject, querylayer.getQueryLayerName());
    //eseguo la richiesta e restituisco come risposta la promise del $.get
    var response = this.submitGetFeatureInfo({
      url: url,
      crs: crs,
      filter: filter,
      querylayername: querylayer.getQueryLayerName()
    });
    return response;
  };

  this.createFilter = function(filterObject, querylayername) {

    /////inserisco il nome del layer (typename) ///
    var filter = [];
    function createSingleFilter(booleanObject) {
      var filterElements = [];
      var filterElement = '';
      var valueExtra = "";
      var valueQuotes = "";
      var rootFilter;
      _.forEach(booleanObject, function(v, k, obj) {
        //creo il filtro root che sarà AND OR
        rootFilter = Filters[k];
        //qui c'è array degli elementi di un booleano
        _.forEach(v, function(input){
          //scorro su oggetto
          _.forEach(input, function(v, k, obj) {
          //verifico se il valore dell'oggetto è array e quindi è altro oggetto padre booleano
            if (_.isArray(v)) {
              filterElement = createSingleFilter(obj);
            } else { // è un oggetto operatore
              if (k == 'LIKE' || k == 'ILIKE') {
                valueExtra = "%";
              };
              filterOp = Filters[k];
              _.forEach(input, function(v, k, obj) {
                _.forEach(v, function(v, k, obj) {
                  //verifico se il valore non è un numero e quindi aggiungo singolo apice
                  if(isNaN(v)) {
                    valueQuotes = "'";
                  } else {
                    valueQuotes = "";
                  };
                  filterElement = "\"" + k + "\" "+ filterOp +" " + valueQuotes + valueExtra + v + valueExtra + valueQuotes;
                });
              });
            };
            filterElements.push(filterElement);
          });
        });
        rootFilter = filterElements.join(" "+ rootFilter + " ");
      });
      return rootFilter;
    };
    //assegno il filtro creato
    filter = querylayername + ":" + createSingleFilter(filterObject);
    return filter;
  };

};

inherit(QueryQGISWMSProvider, G3WObject);

module.exports =  new QueryQGISWMSProvider();

},{"core/g3wobject":13,"core/project/projectsregistry":27,"core/utils/utils":34}],30:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var resolve = require('core/utils/utils').resolve;
//definisco il filtro ol3
var ol3OGCFilter = ol.format.ogc.filter;

//oggetto che viene passato per effetturare il la search
var ol3GetFeatureRequestObject = {
  srsName: 'EPSG:',
  featureNS: '',
  featurePrefix: '',
  featureTypes: [],
  outputFormat: 'application/json',
  filter: null // esempio filtro composto ol3OGCFilter.and(ol3OGCFilter.bbox('the_geom', [1, 2, 3, 4], 'urn:ogc:def:crs:EPSG::4326'),ol3OGCFilter.like('name', 'New*'))
};

// FILTRI OL3
var ol3Filters = {
  eq: ol3OGCFilter.equalTo,
  gt: ol3OGCFilter.greaterThan,
  gte: ol3OGCFilter.greaterThanOrEqualTo,
  lt: ol3OGCFilter.lessThan,
  lte: ol3OGCFilter.lessThanOrEqualTo,
  like: ol3OGCFilter.like,
  ilike: "",
  bbox: ol3OGCFilter.bbox,
  AND: ol3OGCFilter.and,
  OR: ol3OGCFilter.or,
  NOT: ol3OGCFilter.not
};


// CREATO UN FILTRO DI ESEMPIO PER VERIFICARE LA CORRETTEZZA DELLA FUNZIONE CREAZIONE FILTRO
var testFilter = {
  'AND':
    [
      {
        eq:
          {
            gid : 10
          }
      },
      {
        'OR':
          [
            {
              eq: {
                pippo : 'lallo'
              }
            },
            {
              gt: {
                id : 5
              }
            }

          ]
      }
   ]
}
//////////////

///FILTRI CUSTOM
var standardFilterTemplates = function() {
  var common = {
    propertyName:
          "<PropertyName>" +
            "[PROP]" +
          "</PropertyName>",
    literal:
          "<Literal>" +
            "[VALUE]" +
          "</Literal>"
  };
  return {
    eq: "<PropertyIsEqualTo>" +
            common.propertyName +
            common.literal +
        "</PropertyIsEqualTo>",
    gt: "<PropertyIsGreaterThan>" +
            common.propertyName +
            common.literal +
         "</PropertyIsGreaterThan>",
    gte:"",
    lt: "",
    lte: "",
    like: "",
    ilike: "",
    AND: "<And>[AND]</And>",
    OR: "<Or>[OR]</Or>",
  }
}();

/////
var qgisFilterTemplates = {
  // codice qui
};

var mapserverFilterTemplates = {
  // codice qui
};

var geoserverFilterTemplates = {
  // codice qui
};

function QueryWFSProvider(){
  var self = this;
  var d = $.Deferred();
  var results = {
    headers:[],
    values:[]
  };

  this.doSearch = function(queryFilterObject){
    var querylayer = queryFilterObject.queryLayer;
    var url = querylayer.getQueryUrl();
    var crs = querylayer.getCrs();
    var filterObject = queryFilterObject.filterObject;
    //setto il srs
    ol3GetFeatureRequestObject.srsName+=crs || '4326';
    var response, filter;
    switch (ogcservertype) {
      case 'OGC':
        filter = this.createStandardFilter(filterObject, querylayer);
        response = this.standardSearch(url, filter);
        return resolve(response)
        break;
      case 'qgis':
        filter = this.createQgisFilter(filterObject);
        response = this.qgisSearch(querylayer, url, filter);
        return resolve(response)
        break;
      case 'mapserver':
        filter = this.createMapserverFilter(filterObject);
        response = this.mapserverSearch(querylayer, url, filter);
        return resolve(response)
        break;
      case 'geoserver':
        filter = this.createGeoserverFilter(filterObject);
        response = this.geoserverSearch(querylayer, url, filter);
        return resolve(response)
        break;
      default:
        return false
    }
  };

  this.standardSearch = function(url, filter){};

  this.createStandardFilter = function(filterObject, querylayer) {
    /////inserisco il nome del layer (typename) ///
    ol3GetFeatureRequestObject.featureTypes.push(querylayer.getQueryLayerName);
    var filter = [];
    function createSingleFilter(booleanObject) {
      var filterElements = [];
      var filterElement = '';
      var rootFilter;
      _.forEach(booleanObject, function(v, k, obj) {
        //creo il filtro root che sarà AND OR
        rootFilter = ol3Filters[k];
        //qui c'è array degli elementi di un booleano
        _.forEach(v, function(input){
          //scorro su oggetto operatore
          _.forEach(input, function(v, k, obj) {
          //è un array e quindi è altro oggetto padre booleano
            if (_.isArray(v)) {
              filterElement = createSingleFilter(obj);
            } else {
              filterElement = ol3Filters[k];
              _.forEach(input, function(v, k, obj) {
                _.forEach(v, function(v, k, obj) {
                  filterElement = filterElement(k, v);
                });
              });
            };
            filterElements.push(filterElement);
          });
        });
        //verifico che ci siano almeno due condizione nel filtro AND. Nel caso di una sola condizione (esempio : un solo input)
        //estraggo solo l'elemento filtro altrimenti da errore -- DA VERIFICARE SE CAMBIARLO
        if (filterElements.length > 1) {
          rootFilter = rootFilter.apply(this, filterElements);
        } else {
          rootFilter = filterElements[0];
        };
      });
      return rootFilter;
    };
    //assegno il filtro creato
    ol3GetFeatureRequestObject.filter = createSingleFilter(filterObject);
    //creo il filtro utilizzando ol3
    filter = new ol.format.WFS().writeGetFeature(ol3GetFeatureRequestObject);
    return filter;
  };

  this.qgisSearch = function(urls, filter){
    $.get(searchUrl).then(function(result){
      self.emit("searchdone",result);
    });
    return d.promise();
  };
  this.createQGisFilter = function(filterObject) {
    var filter;
    return filter
  };
  this.mapserverSearch = function(querylayer, url, filter){
    return d.promise();
  };
  this.createMapserverFilter = function(filterObject) {
    var filter;
    return filter
  };
  this.geoserverSearch = function(querylayer, url, filter){
    return d.promise();
  };
  this.createGeoserverFilter = function(filterObject) {
    var filter;
    return filter
  };
  base(this);
}
inherit(QueryWFSProvider,G3WObject);

module.exports =  new QueryWFSProvider()


},{"core/g3wobject":13,"core/utils/utils":34}],31:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ProjectsRegistry = require('core/project/projectsregistry');
var QueryWFSProvider = require('./queryWFSProvider');
var QueryQGISWMSProvider = require('./queryQGISWMSProvider');
var ComponentsRegistry = require('gui/componentsregistry');

var Provider = {
  'QGIS': QueryQGISWMSProvider,
  'OGC': QueryWFSProvider
};

/*var PickToleranceParams = {};
PickToleranceParams[ProjectTypes.QDJANGO] = {};
PickToleranceParams[ProjectTypes.QDJANGO][GeometryTypes.POINT] = "FI_POINT_TOLERANCE";
PickToleranceParams[ProjectTypes.QDJANGO][GeometryTypes.LINESTRING] = "FI_LINE_TOLERANCE";
PickToleranceParams[ProjectTypes.QDJANGO][GeometryTypes.POLYGON] = "FI_POLYGON_TOLERANCE";

var PickToleranceValues = {}
PickToleranceValues[GeometryTypes.POINT] = 5;
PickToleranceValues[GeometryTypes.LINESTRING] = 5;
PickToleranceValues[GeometryTypes.POLYGON] = 5;*/


//oggetto query service
function QueryService(){
  var self = this;
  this.url = "";
  this.filterObject = {};
  this.queryFilterObject = {};
  //me lo porto da mapqueryservice ma vediamo cosa succede
  this.setMapService = function(mapService){
    this._mapService = mapService;
  };

  this.setFilterObject = function(filterObject){
    this.filterObject = filterObject;
  };

  this.getFilterObject = function() {
    return this.filterObject;
  };
  //dato l'oggetto filter restituito dal server ricostruisco la struttura del filterObject
  //interpretato da queryWMSProvider
  this.createQueryFilterFromConfig = function(filter) {

    var queryFilter = {};
    var attribute;
    var operator;
    var field;
    var operatorObject = {};
    var booleanObject = {};
    //funzione che costruisce l'oggetto operatore es. {'=':{'nomecampo':null}}
    function createOperatorObject(obj) {
      //rinizializzo a oggetto vuoto
      evalObject = {};
      //verifico che l'oggetto passato non sia a sua volta un oggetto 'BOOLEANO'
      _.forEach(obj, function(v,k) {
        if (_.isArray(v)) {
          return createBooleanObject(k,v);
        };
      });
      field = obj.attribute;
      operator = obj.op;
      evalObject[operator] = {};
      evalObject[operator][field] = null;
      return evalObject;
    }
    //functione che costruisce oggetti BOOLEANI caso AND OR contenente array di oggetti fornit dalla funzione createOperatorObject
    function createBooleanObject(booleanOperator, operations) {
      booleanObject = {};
      booleanObject[booleanOperator] = [];
      _.forEach(operations, function(operation){
        booleanObject[booleanOperator].push(createOperatorObject(operation));
      });
      return booleanObject;
    }
    /*
    // vado a creare l'oggetto filtro principale. Questo è un oggetto che contiene l'operatore booleano come root (chiave)
    // come valore un array di oggetti operatori che contengono il tipo di operatore come chiave e come valore un oggetto contenete
    // nome campo e valore passato
    */
    _.forEach(filter, function(v,k,obj) {
      queryFilter = createBooleanObject(k,v);
    });
    return queryFilter;
  };

  this.createQueryFilterObject = function(layer, filterObject){
    return {
      type: 'standard',
      queryLayer: layer,
      filterObject : filterObject
    };
  };

  /////PARSERS //////////////////

  // Brutto ma per ora unica soluzione trovata per dividere per layer i risultati di un doc xml wfs.FeatureCollection.
  // OL3 li parserizza tutti insieme non distinguendo le features dei diversi layers
  this._parseLayerFeatureCollection = function(queryLayer, data) {
    var features = [];
    var layerName = queryLayer.getWMSLayerName();
    var layerData = _.cloneDeep(data);
    layerData.FeatureCollection.featureMember = [];
    
    var featureMembers = data.FeatureCollection.featureMember;
    featureMembers = _.isArray(featureMembers) ? featureMembers : [featureMembers];
    _.forEach(featureMembers,function(featureMember){
      layerName = layerName.replace(/ /g,''); // QGIS SERVER rimuove gli spazi dal nome del layer per creare l'elemento FeatureMember
      var isLayerMember = _.get(featureMember,layerName)

      if (isLayerMember) {
        layerData.FeatureCollection.featureMember.push(featureMember);
      }
    });

    var x2js = new X2JS();
    var layerFeatureCollectionXML = x2js.json2xml_str(layerData);
    var parser = new ol.format.WMSGetFeatureInfo();
    return parser.readFeatures(layerFeatureCollectionXML);
  };

  // mentre con i risultati in msGLMOutput (da Mapserver) il parser può essere istruito per parserizzare in base ad un layer di filtro
  this._parseLayermsGMLOutput = function(queryLayer, data){
    var parser = new ol.format.WMSGetFeatureInfo({
      layers: [queryLayer.queryLayerName]
    });
    return parser.readFeatures(data);
  };
  
  this._parseLayerGeoJSON = function(queryLayer, data) {
    var geojson = new ol.format.GeoJSON({
      defaultDataProjection: this.crs,
      geometryName: "geometry"
    });
    return geojson.readFeatures(data);
  };

  //// FINE PARSER ///

  //INIZO SEZIONE QUERIES ///

  // Messo qui generale la funzione che si prende cura della trasformazione dell'xml di risposta
  // dal server così da avere una risposta coerente in termini di formato risultati da presentare
  // nel componente QueryResults
  this.handleQueryResponseFromServer = function(response, infoFormat, queryLayers) {
    var jsonresponse;
    var featuresForLayers = [];
    var parser, data;
    switch (infoFormat) {
      case 'json':
        parser = this._parseLayerGeoJSON;
        data = response.vector.data;
        break;
      default:
        var x2js = new X2JS();
        try {
          if (_.isString(response)) {
            jsonresponse = x2js.xml_str2json(response);
          } else {
            jsonresponse = x2js.xml2json(response);
          }
        }
        catch (e) {
          return;
        }
        var rootNode = _.keys(jsonresponse)[0];
        
        switch (rootNode) {
          case 'FeatureCollection':
            parser = this._parseLayerFeatureCollection;
            data = jsonresponse;
            break;
          case "msGMLOutput":
            parser = this._parseLayermsGMLOutput;
            data = response;
            break;
        };
    }
    
    var nfeatures = 0
    _.forEach(queryLayers,function(queryLayer) {
      var features = parser.call(self, queryLayer, data)
      nfeatures += features.length;
      featuresForLayers.push({
        layer: queryLayer,
        features: features
      })
    });

    return featuresForLayers;
  };
  // query basato sul filtro

  this.queryByFilter = function(queryFilterObject) {
    var self = this;
    var d = $.Deferred();
    //parte da rivedere nel filtro
    var provider = Provider[queryFilterObject.queryLayer.getServerType()];
    //ritorna una promise poi gestita da che la chiede
    provider.doSearch(queryFilterObject).
    then(function(response) {
      //al momento qui replico struttura per i parser
      var queryLayer = queryFilterObject.queryLayer;
      var featuresForLayers = self.handleQueryResponseFromServer(response, queryLayer.getInfoFormat(), [queryLayer])
      d.resolve({
        data: featuresForLayers,
        query: {
          filter: queryFilterObject
        }
      });
    })
    .fail(function(e){
          d.reject(e);
    })
    return d.promise();
  };
  
  this.queryByLocation = function(coordinates, layers) {
    var self = this;
    var d = $.Deferred();
    var urlsForLayers = {};
    _.forEach(layers,function(layer){
      var queryUrl = layer.getQueryUrl();
      var urlHash = queryUrl.hashCode().toString();
      if (_.keys(urlsForLayers).indexOf(urlHash) == -1) {
        urlsForLayers[urlHash] = {
          url: queryUrl,
          layers: []
        };
      }
      urlsForLayers[urlHash].layers.push(layer);
    });

    var queryUrlsForLayers = [];
    _.forEach(urlsForLayers,function(urlForLayers){
      var queryLayers = urlForLayers.layers;
      var infoFormat = queryLayers[0].getInfoFormat();
      var params = {
        LAYERS: _.map(queryLayers,function(layer){ return layer.getQueryLayerName(); }),
        QUERY_LAYERS: _.map(queryLayers,function(layer){ return layer.getQueryLayerName(); }),
        INFO_FORMAT: infoFormat,
        // PARAMETRI DI TOLLERANZA PER QGIS SERVER
        FI_POINT_TOLERANCE: 10,
        FI_LINE_TOLERANCE: 10,
        FI_POLYGON_TOLERANCE: 10
      };
      
      var resolution = self._mapService.getResolution();
      var epsg = self._mapService.getEpsg();
      var getFeatureInfoUrl = self._mapService.getGetFeatureInfoUrlForLayer(queryLayers[0],coordinates,resolution,epsg,params);
      var queryString = getFeatureInfoUrl.split('?')[1];
      var url = urlForLayers.url+'?'+queryString;
      queryUrlsForLayers.push({
        url: url,
        infoformat: infoFormat,
        queryLayers: queryLayers
      });
    });
    if (queryUrlsForLayers.length > 0) {
      var queryRequests = [];
      var queryRequestsContext = [];
      var featuresForLayers = [];
      _.forEach(queryUrlsForLayers,function(queryUrlForLayers){
        var url = queryUrlForLayers.url;
        var queryLayers = queryUrlForLayers.queryLayers;
        var infoFormat = queryUrlForLayers.infoformat;
        var request = self.doRequestAndParse(url,infoFormat,queryLayers);
        queryRequests.push(request);
      });
      $.when.apply(this,queryRequests).
      then(function(){
        var vectorsDataResponse = Array.prototype.slice.call(arguments);
        _.forEach(vectorsDataResponse,function(_featuresForLayers,idx){
          if(featuresForLayers){
            featuresForLayers = _.concat(featuresForLayers,_featuresForLayers);
          }
        });
        d.resolve({
          data: featuresForLayers,
          query: {
            coordinates: coordinates
          }
        });
      })
      .fail(function(e){
        d.reject(e);
      });
    }
    else {
      d.resolve(coordinates,0,{});
    }
    return d.promise();
  };
  
  this.doRequestAndParse = function(url,infoFormat,queryLayers){
    var self = this;
    var d = $.Deferred();
    $.get(url).
    done(function(response){
      var featuresForLayers = self.handleQueryResponseFromServer(response, infoFormat, queryLayers);
      d.resolve(featuresForLayers);
    })
    .fail(function(){
      d.reject();
    });
    return d;
  }

  //query by BBOX
  this.queryByBoundingBox = function(bbox) {
    //codice qui
  };


  base(this);
}
inherit(QueryService,G3WObject);

module.exports =  new QueryService


},{"./queryQGISWMSProvider":29,"./queryWFSProvider":30,"core/g3wobject":13,"core/project/projectsregistry":27,"core/utils/utils":34,"gui/componentsregistry":55}],32:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var Base64 = require('core/utils/utils').Base64;
var G3WObject = require('core/g3wobject');

/*
 * RouterService basato su History.js (https://github.com/browserstate/history.js) e Crossroads (https://github.com/millermedeiros/crossroads.js)
 * Il concetto di base è una RouteQuery, del tipo "map?point=21.2,42.1&zoom=12", 
 * che viene inserito nello stato dell'history del browser e nella URL come parametro querystring in forma codificata (q=map@point!21.2,41.1|zoom!12).
 * Per invocare una RouteQuery:
 * 
 * RouterService.goto("map?point=21.2,42.1&zoom=12");
 * 
 * Chiunque voglia rispondere ad una RouteQuery deve aggiungere una route con RouterService.addRoute(pattern, callback). Es.:
 * 
 * var route = RouterService.addRoute('map/{?query}',function(query){
 *  console.log(query.point);
 *  console.log(query.zoom);
 * });
 * 
 * Patterns:
 *  "map/{foo}": la porzione "foo" è richiesta, ed viene passata come parametro alla callback
 *  "map/:foo:": la porzione "foo" è opzionale, ed eventualmente viene passata come parametro alla callback
 *  "map/:foo*: tutto quello che viene dopo "map/"
 *  "map/{?querystring}": obbligatoria querystring, passata alla callback come oggetto dei parametri
 *  "map/:?querystring:": eventuale querystring, passata alla callback come oggetto dei parametri
 * 
 * Per rimuovere una route:
 * RouterService.removeRoute(route);
*/

var RouterService = function(){
  var self = this;
  this._initialLocationQuery;
  this._routeQuery = '';
  this.setters = {
    setRouteQuery: function(routeQuery){
      this._routeQuery = routeQuery;
      crossroads.parse(routeQuery);
    }
  }
  
  History.Adapter.bind(window,'statechange',function(){
      var state = History.getState();
      var locationQuery = state.hash;
      if(state.data && state.data.routequery){
         self.setRouteQuery(state.data.routequery);
      }
      else {
        self._setRouteQueryFromLocationQuery(locationQuery);
      }
  });
  
  base(this);
};
inherit(RouterService,G3WObject);

var proto = RouterService.prototype;

proto.init = function(){
  var query = window.location.search;
  this._setRouteQueryFromLocationQuery(query);
};

proto.addRoute = function(pattern,handler,priority) {
  return crossroads.addRoute(pattern,handler,priority);
};

proto.removeRoute = function(route) {
  return crossroads.removeRoute(route);
};

proto.removeAllRoutes = function() {
  return crossroads.removeAllRoutes();
};

proto.parse = function(request,defaultArgs) {
  return crossroads.parse(request,defaultArgs);
};

proto.goto = function(routeQuery){
  //var pathb64 = Base64.encode(path);
  //History.pushState({path:path},null,'?p='+pathb64);
  if (!this._initialQuery) {
    this._initialLocationQuery = this._stripInitialQuery(location.search.substring(1));
  }
  if (routeQuery) {
    encodedRouteQuery = this._encodeRouteQuery(routeQuery);
    var path = '?'+this._initialLocationQuery + '&q='+encodedRouteQuery;
    History.pushState({routequery:routeQuery},null,path);
  }
};

proto.makeQueryString = function(queryParams){};

proto.slicePath = function(path){
  return path.split('?')[0].split('/');
};
  
proto.sliceFirst = function(path){
  var pathAndQuery = path.split('?');
  var queryString = pathAndQuery[1];
  var pathArr = pathAndQuery[0].split('/')
  var firstPath = pathArr[0];
  path = pathArr.slice(1).join('/');
  path = [path,queryString].join('?')
  return [firstPath,path];
};
  
proto.getQueryParams = function(query){
  query = query.replace('?','');
  var queryParams = {};
  var queryPairs = [];
  if (query != "" && query.indexOf("&") == -1) {
    queryPairs = [query];
  }
  else {
    queryPairs = query.split('&');
  }
  try {
    _.forEach(queryPairs,function(queryPair){
      var pair = queryPair.split('=');
      var key = pair[0];
      var value = pair[1];
      queryParams[key] = value;
    });
  }
  catch (e) {}
  return queryParams;
};

proto.getQueryString = function(path){
  return path.split('?')[1];
};

proto._getQueryPortion = function(query,queryKey){
  var queryPortion;
  try {
    var queryPairs = query.split('&');
    var queryParams = {};
    _.forEach(queryPairs,function(queryPair){
      var pair = queryPair.split('=');
      var key = pair[0];
      if (key == queryKey) {
        queryPortion = queryPair;
      }
    });
  }
  catch (e) {}
  return queryPortion;
};

proto._encodeRouteQuery = function(routeQuery) {
  routeQuery = routeQuery.replace('?','@');
  routeQuery = routeQuery.replace('&','|');
  routeQuery = routeQuery.replace('=','!');
  return routeQuery;
};

proto._decodeRouteQuery = function(routeQuery) {
  routeQuery = routeQuery.replace('@','?');
  routeQuery = routeQuery.replace('|','&');
  routeQuery = routeQuery.replace('!','=');
  return routeQuery;
};

proto._setRouteQueryFromLocationQuery = function(locationQuery) {
  //var pathb64 = this.getQueryParams(locationQuery)['q'];
  //var path = pathb64 ? Base64.decode(pathb64) : '';
  var encodedRouteQuery = this._getRouteQueryFromLocationQuery(locationQuery);
  if (encodedRouteQuery) {
    var routeQuery = this._decodeRouteQuery(encodedRouteQuery);
    this.setRouteQuery(routeQuery);
  }
};

proto._getRouteQueryFromLocationQuery = function(locationQuery) {
  return this.getQueryParams(locationQuery)['q'];
};

proto._stripInitialQuery = function(locationQuery) {
  var previousQuery = this._getQueryPortion(locationQuery,'q');
  if (previousQuery) {
    var previousQueryLength = previousQuery.length;
    var previousQueryPosition = locationQuery.indexOf(previousQuery);
    queryPrefix = _.trimEnd(locationQuery.substring(0,previousQueryPosition),"&");
    querySuffix = locationQuery.substring(previousQueryPosition+previousQueryLength);
    querySuffix = (queryPrefix != "") ? querySuffix : _.trimStart(querySuffix,"&");
    locationQuery = queryPrefix + querySuffix;
  }
  return locationQuery;
};

module.exports = new RouterService;

},{"core/g3wobject":13,"core/utils/utils":34}],33:[function(require,module,exports){
var OGC_PIXEL_WIDTH = 0.28;
var OGC_DPI = 25.4/OGC_PIXEL_WIDTH;

module.exports = {
  resToScale: function(res, metric) {
    var metric = metric || 'm';
    var scale;
    switch (metric) {
      case 'm':
        var scale = (res*1000) / OGC_PIXEL_WIDTH;
        break
    }
    return scale;
  }
};

},{}],34:[function(require,module,exports){

/**
 * Decimal adjustment of a number.
 *
 * @param {String}  type  The type of adjustment.
 * @param {Number}  value The number.
 * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
 * @returns {Number} The adjusted value.
 */
function decimalAdjust(type, value, exp) {
  // If the exp is undefined or zero...
  if (typeof exp === 'undefined' || +exp === 0) {
    return Math[type](value);
  }
  value = +value;
  exp = +exp;
  // If the value is not a number or the exp is not an integer...
  if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
    return NaN;
  }
  // Shift
  value = value.toString().split('e');
  value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
  // Shift back
  value = value.toString().split('e');
  return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
}

// Decimal round
if (!Math.round10) {
  Math.round10 = function(value, exp) {
    return decimalAdjust('round', value, exp);
  };
}
// Decimal floor
if (!Math.floor10) {
  Math.floor10 = function(value, exp) {
    return decimalAdjust('floor', value, exp);
  };
}
// Decimal ceil
if (!Math.ceil10) {
  Math.ceil10 = function(value, exp) {
    return decimalAdjust('ceil', value, exp);
  };
}

String.prototype.hashCode = function() {
  var hash = 0, i, chr, len;
  if (this.length === 0) return hash;
  for (i = 0, len = this.length; i < len; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
};

var Base64 = {_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9+/=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/rn/g,"n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}};


var utils = {
  mixin: function mixin(destination, source) {
      return utils.merge(destination.prototype, source);
  },
  
  mixininstance: function mixininstance(destination,source){
      var sourceInstance = new source;
      utils.merge(destination, sourceInstance);
      utils.merge(destination.prototype, source.prototype);
  },


  merge: function merge(destination, source) {
      var key;

      for (key in source) {
          if (utils.hasOwn(source, key)) {
              destination[key] = source[key];
          }
      }
  },

  hasOwn: function hasOwn(object, key) {
      return Object.prototype.hasOwnProperty.call(object, key);
  },
  
  inherit:function(childCtor, parentCtor) {
    function tempCtor() {};
    tempCtor.prototype = parentCtor.prototype;
    childCtor.superClass_ = parentCtor.prototype;
    childCtor.prototype = new tempCtor();
    childCtor.prototype.constructor = childCtor;
  },
  
  base: function(me, opt_methodName, var_args) {
    var caller = arguments.callee.caller;
    if (caller.superClass_) {
      // This is a constructor. Call the superclass constructor.
      return caller.superClass_.constructor.apply(
          me, Array.prototype.slice.call(arguments, 1));
    }

    var args = Array.prototype.slice.call(arguments, 2);
    var foundCaller = false;
    for (var ctor = me.constructor;
         ctor; ctor = ctor.superClass_ && ctor.superClass_.constructor) {
      if (ctor.prototype[opt_methodName] === caller) {
        foundCaller = true;
      } else if (foundCaller) {
        return ctor.prototype[opt_methodName].apply(me, args);
      }
    }

    // If we did not find the caller in the prototype chain,
    // then one of two things happened:
    // 1) The caller is an instance method.
    // 2) This method was not called by the right caller.
    if (me[opt_methodName] === caller) {
      return me.constructor.prototype[opt_methodName].apply(me, args);
    } else {
      throw Error(
          'base called from a method of one name ' +
          'to a method of a different name');
    }
  },
  
  noop: function(){},
  
  truefnc: function(){return true},
  
  falsefnc: function(){return true},
  
  resolve: function(value){
    var deferred = $.Deferred();
    deferred.resolve(value);
    return deferred.promise();
  },
  
  reject: function(value){
    var deferred = $.Deferred();
    deferred.reject(value);
    return deferred.promise();
  },
  
  Base64: Base64
};

module.exports = utils;

},{}],35:[function(require,module,exports){
var Control = function(options){
  var name = options.name || "?";
  this.name = name.split(' ').join('-').toLowerCase();
  this.id = this.name+'_'+(Math.floor(Math.random() * 1000000));
  
  this.positionCode = options.position || 'tl';
  
  
  if (!options.element) {
    var className = "ol-"+this.name.split(' ').join('-').toLowerCase();
    var tipLabel = options.tipLabel || this.name;
    var label = options.label || "?";
    
    options.element = $('<div class="'+className+' ol-unselectable ol-control"><button type="button" title="'+tipLabel+'">'+label+'</button></div>')[0];
  }
  
  $(options.element).addClass("ol-control-"+this.positionCode);
  
  var buttonClickHandler = options.buttonClickHandler || Control.prototype._handleClick.bind(this);
  
  $(options.element).on('click',buttonClickHandler);
  
  ol.control.Control.call(this,options);
  
  this._postRender();
}
ol.inherits(Control, ol.control.Control);

var proto = Control.prototype;

proto.getPosition = function(positionCode) {
  var positionCode = positionCode || this.positionCode;
  var position = {};
  position['top'] = (positionCode.indexOf('t') > -1) ? true : false;
  position['left'] = (positionCode.indexOf('l') > -1) ? true : false;
  return position;
};

proto._handleClick = function(){
  event.preventDefault();
  var self = this;
  var map = this.getMap();
  
  var resetControl = null;
  // remove all the other, eventually toggled, interactioncontrols
  var controls = map.getControls();
  controls.forEach(function(control){
    if(control.id && control.toggle && (control.id != self.id)) {
      control.toggle(false);
      if (control.name == 'reset') {
        resetControl = control;
      }
    }
  });
  if (!self._toggled && resetControl) {
    resetControl.toggle(true);
  }
};

proto.setMap = function(map){
  var position =  this.getPosition();
  var viewPort = map.getViewport();
  var previusControls = $(viewPort).find('.ol-control-'+this.positionCode);
  if (previusControls.length) {
    previusControl = previusControls.last();
    var previousOffset = position.left ? previusControl.position().left : previusControl.position().right;
    var hWhere = position.left ? 'left' : 'right';
    var previousWidth = previusControl[0].offsetWidth;
    var hOffset = $(this.element).position()[hWhere] + previousOffset + previousWidth + 2;
    $(this.element).css(hWhere,hOffset+'px');
  }
  
  ol.control.Control.prototype.setMap.call(this,map);
};

proto._postRender = function() {};

module.exports = Control;

},{}],36:[function(require,module,exports){
var Control = require('./control');

var InteractionControl = function(options){
  this._toggled = this._toggled || false;
  this._interactionClass = options.interactionClass || null;
  this._interaction = null;
  this._autountoggle = options.autountoggle || false;

  
  options.buttonClickHandler = InteractionControl.prototype._handleClick.bind(this);
  
  Control.call(this,options);
};
ol.inherits(InteractionControl, Control);

var proto = InteractionControl.prototype;

proto.toggle = function(toggle){
  var toggle = toggle !== undefined ? toggle : !this._toggled
  this._toggled = toggle;
  var map = this.getMap();
  var controlButton = $(this.element).find('button').first();
  
  if (toggle) {
    if (this._interaction) {
      //map.addInteraction(this._interaction);
      this._interaction.setActive(true);
    }
    controlButton.addClass('g3w-ol-toggled');
  }
  else {
    if (this._interaction) {
      //map.removeInteraction(this._interaction);
      this._interaction.setActive(false);
    }
    controlButton.removeClass('g3w-ol-toggled');
  }
};

proto.setMap = function(map) {
  if (!this._interaction) {
    this._interaction = new this._interactionClass;
    map.addInteraction(this._interaction);
    this._interaction.setActive(false);
  }
  Control.prototype.setMap.call(this,map);
};

proto._handleClick = function(e){
  this.toggle();
  Control.prototype._handleClick.call(this,e);
};

module.exports = InteractionControl;

},{"./control":35}],37:[function(require,module,exports){
var OLControl = function(options){
  this._control = null;
  
  this.positionCode = options.position || 'tl';
  
  switch (options.type) {
    case 'zoom':
      this._control = new ol.control.Zoom(options);
      break;
    case 'scaleline':
      this._control = new ol.control.ScaleLine(options);
      break;
    case 'overview':
      this._control = new ol.control.OverviewMap(options);
  }
  
  $(this._control.element).addClass("ol-control-"+this.positionCode);
  
  ol.control.Control.call(this,{
    element: this._control.element
  });
}
ol.inherits(OLControl, ol.control.Control);
module.exports = OLControl;

var proto = OLControl.prototype;

proto.getPosition = function(positionCode) {
  var positionCode = positionCode || this.positionCode;
  var position = {};
  position['top'] = (positionCode.indexOf('t') > -1) ? true : false;
  position['left'] = (positionCode.indexOf('l') > -1) ? true : false;
  return position;
};

proto.setMap = function(map){
  var position =  this.getPosition();
  var viewPort = map.getViewport();
  var previusControls = $(viewPort).find('.ol-control-'+this.positionCode);
  if (previusControls.length) {
    previusControl = previusControls.last();
    var previousOffset = position.left ? previusControl.position().left : previusControl.position().right;
    var hWhere = position.left ? 'left' : 'right';
    var previousWidth = previusControl[0].offsetWidth;    
    var hOffset = $(this.element).position()[hWhere] + previousOffset + previousWidth + 2;
    $(this.element).css(hWhere,hOffset+'px');
  }
  
  this._control.setMap(map);
};

},{}],38:[function(require,module,exports){
var utils = require('../utils');
var InteractionControl = require('./interactioncontrol');

var PickCoordinatesInteraction = require('../interactions/pickcoordinatesinteraction');

var QueryControl = function(options){
  var self = this;
  var _options = {
    name: "querylayer",
    tipLabel: "Query layer",
    label: "\uea0f",
    interactionClass: PickCoordinatesInteraction
  };
  
  options = utils.merge(options,_options);
  
  InteractionControl.call(this,options);
}
ol.inherits(QueryControl, InteractionControl);

var proto = QueryControl.prototype;

proto.setMap = function(map) {
  var self = this;
  InteractionControl.prototype.setMap.call(this,map);
  this._interaction.on('boxstart',function(e){
    self._startCoordinate = e.coordinate;
  });
  
  this._interaction.on('picked',function(e){
    self.dispatchEvent({
      type: 'picked',
      coordinates: e.coordinate
    });
    if (self._autountoggle) {
      self.toggle();
    }
  });
};

module.exports = QueryControl;

},{"../interactions/pickcoordinatesinteraction":43,"../utils":48,"./interactioncontrol":36}],39:[function(require,module,exports){
var utils = require('../utils');
var InteractionControl = require('./interactioncontrol');

var ResetControl = function(options){
  var self = this;
  this._toggled = true;
  this._startCoordinate = null;
  var _options = {
      name: "reset",
      tipLabel: "Pan",
      label: "\ue901",
    };
  
  options = utils.merge(options,_options);
  
  InteractionControl.call(this,options);
}
ol.inherits(ResetControl, InteractionControl);
module.exports = ResetControl;

var proto = ResetControl.prototype;

proto._postRender = function(){
  this.toggle(true);
};

},{"../utils":48,"./interactioncontrol":36}],40:[function(require,module,exports){
var utils = require('../utils');
var InteractionControl = require('./interactioncontrol');

var ZoomBoxControl = function(options){
  var self = this;
  this._startCoordinate = null;
  var _options = {
      name: "zoombox",
      tipLabel: "Zoom to box",
      label: "\ue900",
      interactionClass: ol.interaction.DragBox
    };
  
  options = utils.merge(options,_options);
  
  InteractionControl.call(this,options);
}
ol.inherits(ZoomBoxControl, InteractionControl);
module.exports = ZoomBoxControl;

var proto = ZoomBoxControl.prototype;

proto.setMap = function(map) {
  var self = this;
  InteractionControl.prototype.setMap.call(this,map);
  this._interaction.on('boxstart',function(e){
    self._startCoordinate = e.coordinate;
  });
  
  this._interaction.on('boxend',function(e){
    var start_coordinate = self._startCoordinate;
    var end_coordinate = e.coordinate;
    var extent = ol.extent.boundingExtent([start_coordinate,end_coordinate]);
    self.dispatchEvent({
      type: 'zoomend',
      extent: extent
    });
    self._startCoordinate = null;
    if (self._autountoggle) {
      self.toggle();
    }
  })
};

},{"../utils":48,"./interactioncontrol":36}],41:[function(require,module,exports){
var utils = require('./utils');
var maphelpers = require('./map/maphelpers');

(function (name, root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  }
  else if (typeof exports === 'object') {
    module.exports = factory();
  }
  else {
    root[name] = factory();
  }
})('g3wol3', this, function () {
  'use strict';
  
  var helpers = utils.merge({},maphelpers);
  
  return {
    helpers: helpers
  }
});

},{"./map/maphelpers":47,"./utils":48}],42:[function(require,module,exports){
var DeleteInteractionEvent = function(type, features, coordinate) {

  this.type = type;
  this.features = features;
  this.coordinate = coordinate;
};

var DeleteInteraction = function(options) {
  ol.interaction.Pointer.call(this, {
    handleDownEvent: DeleteInteraction.handleDownEvent_,
    handleMoveEvent: DeleteInteraction.handleMoveEvent_,
    handleUpEvent: DeleteInteraction.handleUpEvent_,
    handleEvent: DeleteInteraction.handleEvent_,
  });

  this.previousCursor_ = undefined;
  this.lastCoordinate_ = null;
  this.features_ = options.features !== undefined ? options.features : null;
};
ol.inherits(DeleteInteraction, ol.interaction.Pointer);

DeleteInteraction.handleEvent_ = function(mapBrowserEvent) {
  if (mapBrowserEvent.type == 'keydown'){
    if(this.features_.getArray().length && mapBrowserEvent.originalEvent.keyCode == 46){
      this.dispatchEvent(
          new DeleteInteractionEvent(
              'deleteend', this.features_,
              event.coordinate));
      return true;
    }
  }
  else{
    return ol.interaction.Pointer.handleEvent.call(this,mapBrowserEvent);
  }
};

DeleteInteraction.handleDownEvent_ = function(event) {
  this.lastFeature_ = this.featuresAtPixel_(event.pixel, event.map);
  if (this.lastFeature_) {
    DeleteInteraction.handleMoveEvent_.call(this, event);
    this.dispatchEvent(
            new DeleteInteractionEvent(
                'deleteend', this.features_,
                event.coordinate));
    return true;
  }
  return false;
};

DeleteInteraction.handleMoveEvent_ = function(event) {
  var elem = event.map.getTargetElement();
  var intersectingFeature = event.map.forEachFeatureAtPixel(event.pixel,
      function(feature) {
        return feature;
      });

  if (intersectingFeature) {
    this.previousCursor_ = elem.style.cursor;

    elem.style.cursor =  'pointer';

  } else {
    elem.style.cursor = this.previousCursor_ !== undefined ?
        this.previousCursor_ : '';
    this.previousCursor_ = undefined;
  }
};

DeleteInteraction.prototype.featuresAtPixel_ = function(pixel, map) {
  var found = null;

  var intersectingFeature = map.forEachFeatureAtPixel(pixel,
      function(feature) {
        return feature;
      });

  if (this.features_ &&
     _.includes(this.features_.getArray(), intersectingFeature)) {
    found = intersectingFeature;
  }

  return found;
};

module.exports = DeleteInteraction;

},{}],43:[function(require,module,exports){
var PickCoordinatesEventType = {
  PICKED: 'picked'
};

var PickCoordinatesEvent = function(type, coordinate) {
  this.type = type;
  this.coordinate = coordinate;
};

var PickCoordinatesInteraction = function(options) {
  this.previousCursor_ = null;
  
  ol.interaction.Pointer.call(this, {
    handleDownEvent: PickCoordinatesInteraction.handleDownEvent_,
    handleUpEvent: PickCoordinatesInteraction.handleUpEvent_,
    handleMoveEvent: PickCoordinatesInteraction.handleMoveEvent_,
  });
};
ol.inherits(PickCoordinatesInteraction, ol.interaction.Pointer);

PickCoordinatesInteraction.handleDownEvent_ = function(event) {
  return true;
};

PickCoordinatesInteraction.handleUpEvent_ = function(event) {
  this.dispatchEvent(
          new PickCoordinatesEvent(
              PickCoordinatesEventType.PICKED,
              event.coordinate));
  return true;
};

PickCoordinatesInteraction.handleMoveEvent_ = function(event) {
  var elem = event.map.getTargetElement();
  elem.style.cursor =  'pointer';
};

PickCoordinatesInteraction.prototype.shouldStopEvent = function(){
  return false;
};

PickCoordinatesInteraction.prototype.setActive = function(active){
  var map = this.getMap();
  if (map) {
    var elem = map.getTargetElement();
    elem.style.cursor = '';
  }
  ol.interaction.Pointer.prototype.setActive.call(this,active);
};

PickCoordinatesInteraction.prototype.setMap = function(map){
  if (!map) {
    var elem = this.getMap().getTargetElement();
    elem.style.cursor = '';
  }
  ol.interaction.Pointer.prototype.setMap.call(this,map);
};

module.exports = PickCoordinatesInteraction;

},{}],44:[function(require,module,exports){
  var PickFeatureEventType = {
  PICKED: 'picked'
};

var PickFeatureEvent = function(type, coordinate, feature) {
  this.type = type;
  this.feature = feature;
  this.coordinate = coordinate;
};

var PickFeatureInteraction = function(options) {
  ol.interaction.Pointer.call(this, {
    handleDownEvent: PickFeatureInteraction.handleDownEvent_,
    handleUpEvent: PickFeatureInteraction.handleUpEvent_,
    handleMoveEvent: PickFeatureInteraction.handleMoveEvent_,
  });
  
  this.features_ = options.features || null;
  
  this.layers_ = options.layers || null;
  
  this.pickedFeature_ = null;
  
  var self = this;
  this.layerFilter_ = function(layer) {
    return _.includes(self.layers_, layer);
  };
};
ol.inherits(PickFeatureInteraction, ol.interaction.Pointer);

PickFeatureInteraction.handleDownEvent_ = function(event) {
  this.pickedFeature_ = this.featuresAtPixel_(event.pixel, event.map);
  return true;
};

PickFeatureInteraction.handleUpEvent_ = function(event) {
  if(this.pickedFeature_){
    this.dispatchEvent(
            new PickFeatureEvent(
                PickFeatureEventType.PICKED,
                event.coordinate,
                this.pickedFeature_));
  }
  return true;
};

PickFeatureInteraction.handleMoveEvent_ = function(event) {
  var elem = event.map.getTargetElement();
  var intersectingFeature = this.featuresAtPixel_(event.pixel, event.map);

  if (intersectingFeature) {
    elem.style.cursor =  'pointer';
  } else {
    elem.style.cursor = '';
  }
};

PickFeatureInteraction.prototype.featuresAtPixel_ = function(pixel, map) {
  var found = null;

  var intersectingFeature = map.forEachFeatureAtPixel(pixel,
      function(feature) {
        if (this.features_) {
          if (this.features_.indexOf(feature) > -1){
            return feature
          }
          else{
            return null;
          }
        }
        return feature;
      },this,this.layerFilter_);
  
  if(intersectingFeature){
    found = intersectingFeature;
  }
  return found;
};

PickFeatureInteraction.prototype.shouldStopEvent = function(){
  return false;
};

PickFeatureInteraction.prototype.setMap = function(map){
  if (!map) {
    var elem = this.getMap().getTargetElement();
    elem.style.cursor = '';
  }
  ol.interaction.Pointer.prototype.setMap.call(this,map);
};

module.exports = PickFeatureInteraction;

},{}],45:[function(require,module,exports){
var BaseLayers = {};

BaseLayers.OSM = new ol.layer.Tile({
  source: new ol.source.OSM({
    attributions: [
      new ol.Attribution({
        html: 'All maps &copy; ' +
            '<a href="http://www.openstreetmap.org/">OpenStreetMap</a>'
      }),
      ol.source.OSM.ATTRIBUTION
    ],
    url: 'http://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    crossOrigin: null
  }),
  id: 'osm',
  title: 'OSM',
  basemap: true
});

BaseLayers.BING = {};

BaseLayers.BING.Road = new ol.layer.Tile({
  name:'Road',
  visible: false,
  preload: Infinity,
  source: new ol.source.BingMaps({
    key: 'Am_mASnUA-jtW3O3MxIYmOOPLOvL39dwMvRnyoHxfKf_EPNYgfWM9imqGETWKGVn',
    imagerySet: 'Road'
      // use maxZoom 19 to see stretched tiles instead of the BingMaps
      // "no photos at this zoom level" tiles
      // maxZoom: 19
  }),
  basemap: true
});

BaseLayers.BING.AerialWithLabels = new ol.layer.Tile({
  name: 'AerialWithLabels',
  visible: true,
  preload: Infinity,
  source: new ol.source.BingMaps({
    key: 'Am_mASnUA-jtW3O3MxIYmOOPLOvL39dwMvRnyoHxfKf_EPNYgfWM9imqGETWKGVn',
    imagerySet: 'AerialWithLabels'
      // use maxZoom 19 to see stretched tiles instead of the BingMaps
      // "no photos at this zoom level" tiles
      // maxZoom: 19
  }),
  basemap: true
});

BaseLayers.BING.Aerial = new ol.layer.Tile({
  name: 'Aerial',
  visible: false,
  preload: Infinity,
  source: new ol.source.BingMaps({
    key: 'Am_mASnUA-jtW3O3MxIYmOOPLOvL39dwMvRnyoHxfKf_EPNYgfWM9imqGETWKGVn',
    imagerySet: 'Aerial'
      // use maxZoom 19 to see stretched tiles instead of the BingMaps
      // "no photos at this zoom level" tiles
      // maxZoom: 19
  }),
  basemap: true
});

module.exports = BaseLayers;

},{}],46:[function(require,module,exports){
var utils = require('../utils');
var RasterLayers = {};

RasterLayers.TiledWMSLayer = function(layerObj,extraParams){
  var options = {
    layerObj: layerObj,
    extraParams: extraParams || {},
    tiled: true
  }
  return RasterLayers._WMSLayer(options);
};

RasterLayers.WMSLayer = function(layerObj,extraParams){
  var options = {
    layerObj: layerObj,
    extraParams: extraParams || {}
  }
  return RasterLayers._WMSLayer(options);
};

RasterLayers._WMSLayer = function(options){
  var layerObj = options.layerObj;
  var extraParams = options.extraParams;
  var tiled = options.tiled || false;
  
  var params = {
    LAYERS: layerObj.layers || '',
    VERSION: '1.3.0',
    TRANSPARENT: true,
    SLD_VERSION: '1.1.0'
  };
  
  params = utils.merge(params,extraParams);
  
  var sourceOptions = {
    url: layerObj.url,
    params: params,
    ratio: 1
  };
  
  var imageOptions = {
    id: layerObj.id,
    name: layerObj.name,
    opacity: layerObj.opacity || 1.0,
    visible:layerObj.visible,
    maxResolution: layerObj.maxResolution
  }
  
  var imageClass;
  var source;
  if (tiled) {
    source = new ol.source.TileWMS(sourceOptions);
    imageClass = ol.layer.Tile;
    //imageOptions.extent = [1134867,3873002,2505964,5596944];
  }
  else {
    source = new ol.source.ImageWMS(sourceOptions)
    imageClass = ol.layer.Image;
  }
  
  imageOptions.source = source;
  
  var layer = new imageClass(imageOptions);
  
  return layer;
};

/*RasterLayers.TiledWMSLayer = function(layerObj){
  var layer = new ol.layer.Tile({
    name: layerObj.name,
    opacity: 1.0,
    source: new ol.source.TileWMS({
      url: layerObj.url,
      params: {
        LAYERS: layerObj.layers || '',
        VERSION: '1.3.0',
        TRANSPARENT: true
      }
    }),
    visible: layerObj.visible
  });
  
  return layer;
};*/

module.exports = RasterLayers;


},{"../utils":48}],47:[function(require,module,exports){
BaseLayers = require('../layers/bases');

var MapHelpers = {
  createViewer: function(opts){
    return new _Viewer(opts);
  }
};

var _Viewer = function(opts){
  var controls = ol.control.defaults({
    attributionOptions: {
      collapsible: false
    },
    zoom: false,
    attribution: false
  });//.extend([new ol.control.Zoom()]);
  
  var interactions = ol.interaction.defaults()
    .extend([
      new ol.interaction.DragRotate()
    ]);
  interactions.removeAt(1) // rimuovo douclickzoom
  
  var view;
  if (opts.view instanceof ol.View) {
    view = opts.view;
  }
  else {
    view = new ol.View(opts.view);
  }
  var options = {
    controls: controls,
    interactions: interactions,
    ol3Logo: false,
    view: view,
    keyboardEventTarget: document
  };
  if (opts.id){
    options.target = opts.id;
  }
  var map  = new ol.Map(options);
  this.map = map;
};

_Viewer.prototype.destroy = function(){
  if (this.map) {
    this.map.dispose();
    this.map = null
  }
};

_Viewer.prototype.getView = function() {
  return this.map.getView();
}

_Viewer.prototype.updateMap = function(mapObject){};

_Viewer.prototype.updateView = function(){};

_Viewer.prototype.getMap = function(){
  return this.map;
};

_Viewer.prototype.setTarget = function(id){
  this.map.setTarget(id);
};

_Viewer.prototype.goTo = function(coordinates, options){
  var options = options || {};
  var animate = options.animate || true;
  var zoom = options.zoom || false;
  var view = this.map.getView();
  
  if (animate) {
    var panAnimation = ol.animation.pan({
      duration: 500,
      source: view.getCenter()
    });
    var zoomAnimation = ol.animation.zoom({
      duration: 500,
      resolution: view.getResolution()
    });
    this.map.beforeRender(panAnimation,zoomAnimation);
  }
  
  view.setCenter(coordinates);
  if (zoom) {
    view.setZoom(zoom);
  }
};

_Viewer.prototype.goToRes = function(coordinates, resolution){
  var options = options || {};
  var animate = options.animate || true;
  var view = this.map.getView();
  
  if (animate) {
    var panAnimation = ol.animation.pan({
      duration: 300,
      source: view.getCenter()
    });
    var zoomAnimation = ol.animation.zoom({
      duration: 300,
      resolution: view.getResolution()
    });
    this.map.beforeRender(panAnimation,zoomAnimation);
  }

  view.setCenter(coordinates);
  view.setResolution(resolution);
};

_Viewer.prototype.fit = function(geometry, options){
  var view = this.map.getView();
  
  var options = options || {};
  var animate = options.animate || true;
  
  if (animate) {
    var panAnimation = ol.animation.pan({
      duration: 300,
      source: view.getCenter()
    });
    var zoomAnimation = ol.animation.zoom({
      duration: 300,
      resolution: view.getResolution()
    });
    this.map.beforeRender(panAnimation,zoomAnimation);
  }
  
  if (options.animate) {
    delete options.animate; // non lo passo al metodo di OL3 perché è un'opzione interna
  }
  options.constrainResolution = options.constrainResolution || true;
  
  view.fit(geometry,this.map.getSize(),options);
};

_Viewer.prototype.getZoom = function(){
  var view = this.map.getView();
  return view.getZoom();
};

_Viewer.prototype.getResolution = function(){
  var view = this.map.getView();
  return view.getResolution();
};

_Viewer.prototype.getCenter = function(){
  var view = this.map.getView();
  return view.getCenter();
};

_Viewer.prototype.getBBOX = function(){
  return this.map.getView().calculateExtent(this.map.getSize());
};

_Viewer.prototype.getLayerByName = function(layerName) {
  var layers = this.map.getLayers();
  var length = layers.getLength();
  for (var i = 0; i < length; i++) {
    if (layerName === layers.item(i).get('name')) {
      return layers.item(i);
    }
  }
  return null;
};

_Viewer.prototype.removeLayerByName = function(layerName){
  var layer = this.getLayerByName(layerName);
  if (layer){
    this.map.removeLayer(layer);
    delete layer;
  }
};

_Viewer.prototype.getActiveLayers = function(){
  var activelayers = [];
  this.map.getLayers().forEach(function(layer) {
    var props = layer.getProperties();
    if (props.basemap != true && props.visible){
       activelayers.push(layer);
    }
  });
  
  return activelayers;
};

_Viewer.prototype.removeLayers = function(){
  this.map.getLayers().clear();
};

_Viewer.prototype.getLayersNoBase = function(){
  var layers = [];
  this.map.getLayers().forEach(function(layer) {
    var props = layer.getProperties();
    if (props.basemap != true){
      layers.push(layer);
    }
  });
  
  return layers;
};

_Viewer.prototype.addBaseLayer = function(type){
  var layer;
  type ? layer = BaseLayers[type]:  layer = BaseLayers.BING.Aerial;
  this.map.addLayer(layer);
};

_Viewer.prototype.changeBaseLayer = function(layerName){
  var baseLayer = this.getLayerByName(layername);
  var layers = this.map.getLayers();
  layers.insertAt(0, baseLayer);
};

module.exports = MapHelpers;

},{"../layers/bases":45}],48:[function(require,module,exports){
var utils = {
  merge: function(obj1,obj2){
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
  }
}

module.exports = utils;

},{}],49:[function(require,module,exports){
module.exports = "<!-- item template -->\n<div id=\"catalog\" class=\"tabbable-panel catalog\">\n  <div class=\"tabbable-line\">\n    <ul class=\"nav nav-tabs\" role=\"tablist\">\n      <li role=\"presentation\" class=\"active\"><a href=\"#tree\" aria-controls=\"tree\" role=\"tab\" data-toggle=\"tab\" data-i18n=\"tree\">Data</a></li>\n      <li v-if=\"hasBaseLayers\" role=\"presentation\"><a href=\"#baselayers\" aria-controls=\"baselayers\" role=\"tab\" data-toggle=\"tab\" data-i18n=\"baselayers\">Layer Base</a></li>\n      <li role=\"presentation\"><a href=\"#legend\" aria-controls=\"legend\" role=\"tab\" data-toggle=\"tab\" data-i18n=\"legend\">Legenda</a></li>\n    </ul>\n    <div  class=\"tab-content\">\n      <div role=\"tabpanel\" class=\"tab-pane active tree\" id=\"tree\">\n        <ul class=\"tree-root\">\n          <tristate-tree v-if=\"!isHidden\" :layerstree=\"layerstree\" class=\"item\" v-for=\"layerstree in layerstree\">\n          </tristate-tree>\n        </ul>\n      </div>\n      <div v-if=\"hasBaseLayers\" role=\"tabpanel\" class=\"tab-pane baselayers\" id=\"baselayers\">\n        <form>\n          <ul>\n            <li v-if=\"!baselayer.fixed\" v-for=\"baselayer in baselayers\">\n              <div class=\"radio\">\n                <label><input type=\"radio\" name=\"baselayer\" v-checked=\"baselayer.visible\" @click=\"setBaseLayer(baselayer.id)\">{{ baselayer.title }}</label>\n              </div>\n            </li>\n          </ul>\n        </form>\n      </div>\n      <legend :layerstree=\"layerstree\"></legend>\n    </div>\n  </div>\n</div>\n";

},{}],50:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var t = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var Component = require('gui/vue/component');
var GUI = require('gui/gui');
var ProjectsRegistry = require('core/project/projectsregistry');

var vueComponentOptions = {
  template: require('./catalog.html'),
  data: function() {
    return {
      project: ProjectsRegistry.getCurrentProject()
    }
  },
  computed: {
    layerstree: function(){
      return this.project.state.layerstree;
    },
    baselayers: function(){
      return this.project.state.baselayers;
    },
    hasBaseLayers: function(){
      return this.project.state.baselayers.length>0;
    }
  },
  methods: {
    setBaseLayer: function(id) {
      this.project.setBaseLayer(id);
    }
  },
  ready: function() {
    var self = this;
    this.$on('treenodetoogled',function(node){
      self.project.toggleLayer(node.id);
    });

    this.$on('treenodestoogled',function(nodes,parentChecked){
      var layersIds = _.map(nodes,'id');
      self.project.toggleLayers(layersIds,parentChecked);
    });
    
    this.$on('treenodeselected',function(node){
      if (!node.selected) {
        self.project.selectLayer(node.id);
      } else {
        self.project.unselectLayer(node.id);
      }
    });
  }
}

// se lo voglio istanziare manualmente
var InternalComponent = Vue.extend(vueComponentOptions);

// se lo voglio usare come componente come elemento html
Vue.component('g3w-catalog', vueComponentOptions);


/* COMPONENTI FIGLI */

// tree component


Vue.component('tristate-tree', {
  template: require('./tristate-tree.html'),
  props: {
    layerstree: [],
    //eredito il numero di childs dal parent
    n_parentChilds : 0,
    checked: false
  },
  data: function () {
    return {
      expanded: this.layerstree.expanded,
      parentChecked: false,
      //proprieta che serve per fare confronto per il tristate
      n_childs: this.layerstree.nodes ? this.layerstree.nodes.length : 0
    }
  },
  watch: {
      'checked': function (val){
        this.layerstree.visible = val;
      }
  },
  computed: {
    isFolder: function () {
      var isFolder = this.n_childs ? true : false;
      if (isFolder) {
        var _visibleChilds = 0;
        _.forEach(this.layerstree.nodes,function(layer){
          if (layer.visible){
            _visibleChilds += 1;
          }
        });
        this.n_parentChilds = this.n_childs - _visibleChilds;
      }
      return isFolder
    },
    isHidden: function() {
      return this.layerstree.hidden && (this.layerstree.hidden === true);
    },
    selected: function() {
      var isSelected = this.layerstree.selected ? "SI" : "NO";
      return isSelected;
    }
  },
  methods: {
    toggle: function (checkAllLayers) {
      var checkAll = checkAllLayers == 'true' ? true : false;
      if (this.isFolder && !checkAll) {
        this.layerstree.expanded = !this.layerstree.expanded;
      }
      else if (checkAll){
        if (this.parentChecked && !this.n_parentChilds){
          this.parentChecked = false;
        } else if (this.parentChecked && this.n_parentChilds) {
          this.parentChecked = true;
        }
        else {
          this.parentChecked = !this.parentChecked;
        }
        this.$dispatch('treenodestoogled',this.layerstree.nodes,this.parentChecked);
      }
      else {
        this.$dispatch('treenodetoogled',this.layerstree);
      }
    },
    select: function () {
      if (!this.isFolder) {
        this.$dispatch('treenodeselected',this.layerstree);
      }
    },
    triClass: function () {
      if (!this.n_parentChilds) {
        return 'fa-check-square-o';
      } else if ((this.n_parentChilds > 0) && (this.n_parentChilds < this.n_childs)) {
        return 'fa-square';
      } else {
        return 'fa-square-o';
      }
    }
  }
})

Vue.component('legend',{
    template: require('./legend.html'),
    props: ['layerstree'],
    data: function() {
      return {
        //data qui
      }
    },
    computed: {
      visiblelayers: function(){
        var _visiblelayers = [];
        var layerstree = this.layerstree;
        function traverse(obj){
        _.forIn(obj, function (layer, key) {
              //verifica che il valore dell'id non sia nullo
              if (!_.isNil(layer.id) && layer.visible) {
                  _visiblelayers.push(layer);
              }
              if (!_.isNil(layer.nodes)) {
                  traverse(layer.nodes);
              }
          });
        }
        traverse(layerstree);
        return _visiblelayers;
      }
    },
    watch: {
      'layerstree': {
        handler: function(val, old){
          //codice qui
        },
        deep: true
      }
    },
    ready: function() {
      //codice qui
    }
});

Vue.component('legend-item',{
  template: require('./legend_item.html'),
  props: ['layer'],
  computed: {
    legendurl: function(){
      // in attesa di risolvere lo schianto di QGSI Server...
      //return "http://localhost/cgi-bin/qgis_mapserv.fcgi?map=/home/giohappy/Scrivania/Dev/G3W/g3w-client/test/progetto/test.qgs&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&FORMAT=image/png&LAYERTITLE=False&ITEMFONTSIZE=10&LAYER="+this.layer.name;
      return ProjectsRegistry.getCurrentProject().getLayerById(this.layer.id).getLegendUrl();
    }
  },
  methods: {
    // esempio utilizzo del servizio GUI
    openform: function(){
      //GUI.notify.success("Apro un form");
      //GUI.showForm();
    }
  }
});

/* FINE COMPONENTI FIGLI */

/* INTERFACCIA PUBBLICA */
function CatalogComponent(options){
  base(this);
  this.id = "catalog-component";
  this.title = "catalog";
  this.internalComponent = new InternalComponent;
  //mergio opzioni con proprità di default del componente
  merge(this, options);
}

inherit(CatalogComponent, Component);

module.exports = CatalogComponent;

},{"./catalog.html":49,"./legend.html":51,"./legend_item.html":52,"./tristate-tree.html":53,"core/i18n/i18n.service":16,"core/project/projectsregistry":27,"core/utils/utils":34,"gui/gui":58,"gui/vue/component":77}],51:[function(require,module,exports){
module.exports = "<div role=\"tabpanel\" class=\"tab-pane\" id=\"legend\">\n  <legend-item :layer=\"layer\" v-for=\"layer in visiblelayers\"></legend-item>\n</div>\n";

},{}],52:[function(require,module,exports){
module.exports = "<div @click=\"openform()\">{{ layer.title }}</div>\n<div><img :src=\"legendurl\"></div>\n";

},{}],53:[function(require,module,exports){
module.exports = "<li class=\"tree-item\" :class=\"{selected: layerstree.selected}\">\n  <span :class=\"{bold: isFolder, 'fa-chevron-down': layerstree.expanded, 'fa-chevron-right': !layerstree.expanded}\" @click=\"toggle\" v-if=\"isFolder\" class=\"fa\"></span>\n  <span v-if=\"isFolder\" @click=\"toggle('true')\" :class=\"[triClass()]\" class=\"fa\"></span>\n  <span v-else @click=\"toggle\" :class=\"[layerstree.visible  ? 'fa-check-square-o': 'fa-square-o',layerstree.disabled  ? 'disabled': '']\" class=\"fa\" style=\"cursor:default\"></span>\n  <span id=\"tree-node-title\" :class=\"{bold: isFolder, disabled: layerstree.disabled}\" @click=\"select\">{{layerstree.title}}</span>\n  <ul v-show=\"layerstree.expanded\" v-if=\"isFolder\">\n    <tristate-tree :n_parent-childs.sync=\"n_parentChilds\" :layerstree=\"layerstree\" :checked=\"parentChecked\" v-for=\"layerstree in layerstree.nodes\">\n    </tristate-tree>\n  </ul>\n</li>\n\n\n\n\n";

},{}],54:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

var Component = function(options) {
  var options = options || {};
  this.internalComponent = null;
  this.id = options.id || Math.random() * 1000;
  this.title = options.title || ''
  this.state = {
    visible: options.visible || true,
    open: options.open || false
  }
};
inherit(Component,G3WObject);

var proto = Component.prototype;

proto.getId = function(){
  return this.id;
};

proto.getTitle = function(){
  return this.state.title;
};

proto.setTitle = function(title) {
  this.state.title = title;
};

//implementati due metodi per poter unificare il metodo di recupero del servizio
//legato al componente

proto.getService = function() {
  return this._service;
};

proto.setService = function(serviceInstance) {
  this._service = serviceInstance;
};

////////// fine metodi Service Components //////////

/* HOOKS */

/* 
 * Il metodo permette al componente di montarsi nel DOM
 * parentEl: elemento DOM padre, su cui inserirsi; 
 * ritorna una promise, risolta nel momento in cui sarà terminato il montaggio
*/
proto.mount = function(parent){};

/*
 * Metodo richiamato quando si vuole rimuovere il componente.
 * Ritorna una promessa che sarà risolta nel momento in cui il componente avrà completato la propria rimozione (ed eventuale rilascio di risorse dipendenti)
*/
proto.unmount = function(){};

/* 
 * Metodo (opzionale) che offre l'opportunità di ricalcolare proprietà dipendenti dalle dimensioni del padre
 * parentHeight: nuova altezza del parent
 * parentWidth: nuova larghezza del parent
 * richiamato ogni volta che il parent subisce un ridimensionamento
*/
proto.layout = function(parentWidth,parentHeight){};


module.exports = Component;

},{"core/g3wobject":13,"core/utils/utils":34}],55:[function(require,module,exports){
var G3WObject = require('core/g3wobject');
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;

function ComponentsRegistry() {
  this.components = {};
  
  this.registerComponent = function(component) {
    var id = component.getId();
    if (!this.components[id]) {
      this.components[id] = component;
    }
  }; 
  
  this.getComponent = function(id) {
    return this.components[id];
  };
  
  this.unregisterComponent = function(id) {
    var component = this._components[id];
    if (component) {
      if (_.isFunction(component.destroy)) {
        component.destroy();
      }
      delete component;
      this._components[id] = null;
    }
  };
}
inherit(ComponentsRegistry,G3WObject);

module.exports = new ComponentsRegistry;

},{"core/g3wobject":13,"core/utils/utils":34}],56:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var GUI = require('gui/gui');
var Panel =  require('gui/panel');
var PickCoordinatesInteraction = require('g3w-ol3/src/interactions/pickcoordinatesinteraction');
var QueryService = require('core/query/queryservice');

Vue.filter('startcase', function (value) {
  return _.startCase(value);
});

Vue.filter('lowerCase', function (value) {
  return _.lowerCase(value);
});

Vue.filter('relationplural', function (relation) {
  return (relation.plural) ? relation.plural : _.startCase(relation.name);
});

Vue.validator('email', function (val) {
  return /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(val)
});

Vue.validator('integer', function (val) {
  return /^(-?[1-9]\d*|0)$/.test(val);
})

var FormPanel = Vue.extend({
  template: require('./formpanel.html'),
  data: function() {
    return {
      state: {},
    }
  },
  transitions: {'addremovetransition': 'showhide'},
  methods: {
    exec: function(cbk){
      var relations = this.state.relations || null;
      cbk(this.state.fields,relations);
      GUI.closeForm();
    },
    btnEnabled: function(button) {
      return button.type != 'save' || (button.type == 'save' && this.$validation.valid);
    },
    hasFieldsRequired: function() {
      return this.$options.form._hasFieldsRequired();
    },
    isEditable: function(field){
      return this.$options.form._isEditable(field);
    },
    isSimple: function(field){
      return this.$options.form._isSimple(field);
    },
    isTextarea: function(field) {
      return this.$options.form._isTextarea(field);
    },
    isSelect: function(field){
      return this.$options.form._isSelect(field);
    },
    isLayerPicker: function(field){
      return this.$options.form._isLayerPicker(field);
    },
    layerPickerPlaceHolder: function(field){
      return this.$options.form._getlayerPickerLayerName(field.input.options.layerid);
    },
    pickLayer: function(field){
      this.$options.form._pickLayer(field);
    },
    isVisible: function(field){
      return this.$options.form._isVisible(field);
    },
    showRelation: function(relation){
      return this.$options.form._shouldShowRelation(relation);
    },
    relationPkFieldName: function(relation) {
      return relation.pk;
    },
    isRelationElementDeletable: function(relation,element) {
      var min = 1;
      if (relation.min) {
        min = Math.min(min.relation.min);
      }
      return min < relation.elements.length;
    },
    canAddRelationElements: function(relation) {
      var canAdd = true;
      if (relation.type == 'ONE') {
        canAdd = (relation.elements.length) ? false : true // se è una relazione 1:1 e non ho elementi, lo posso aggiungere, altrimenti no
      }
      else {
        var max = relation.max ? relation.max : Number.POSITIVE_INFINITY;
        canAdd = relation.elements.length < max; 
      }
      return canAdd;
    },
    addRelationElement: function(relation) {
      this.$options.form._addRelationElement(relation);
    },
    removeRelationElement: function(relation,element){
      this.$options.form._removeRelationElement(relation,element);
    },
    fieldsSubset: function(fields) {
      var end = Math.min(3,fields.length);
      return fields.slice(0,end);
    },
    fieldsSubsetLength: function(fields) {
      return this.fieldsSubset(fields).length;
    },
    collapseElementBox: function(relation,element) {
      var boxid = this.getUniqueRelationElementid(relation,element);
      if (this.state.elementsBoxes[boxid]) {
        return this.state.elementsBoxes[boxid].collapsed;
      }
    },
    toggleElementBox: function(relation,element) {
      var boxid = this.getUniqueRelationElementid(relation,element);
      this.state.elementsBoxes[boxid].collapsed = !this.state.elementsBoxes[boxid].collapsed;
    },
    getUniqueRelationElementid: function(relation,element){
      return this.$options.form.getUniqueRelationElementid(relation,element);
    }
  },
  computed: {
    isValid: function(field) {
      return this.$validate(field.name);
    },
    hasRelations: function(){
      return this.state.relations.length
    },
  }
});

var Inputs = {};
Inputs.STRING = 'string';
Inputs.INTEGER = 'integer';
Inputs.FLOAT = 'float';

Inputs.defaults = {};
Inputs.defaults[Inputs.STRING] = "";
Inputs.defaults[Inputs.INTEGER] = 0;
Inputs.defaults[Inputs.FLOAT] = 0.0;
Inputs.simpleFieldTypes = [Inputs.STRING,Inputs.INTEGER,Inputs.FLOAT];

Inputs.TEXTAREA = 'textarea';
Inputs.SELECT = 'select';
Inputs.LAYERPICKER = 'layerpicker';

Inputs.specialInputs = [Inputs.TEXTAREA,Inputs.SELECT,Inputs.LAYERPICKER];

function Form(options){
  // proprietà necessarie. In futuro le mettermo in una classe Panel da cui deriveranno tutti i pannelli che vogliono essere mostrati nella sidebar
  this.internalComponent = null;
  this.options =  options || {};
  this.provider = options.provider;
  this.id = options.id; // id del form
  this.name = options.name; // nome del form
  this.dataid = options.dataid; // "accessi", "giunzioni", ecc.
  this.pk = options.pk || null, // eventuale chiave primaria (non tutti i form potrebbero avercela o averne bisogno
  this.isnew = (!_.isNil(options.isnew) && _.isBoolean(options.isnew)) ? options.isnew : true;
  
  this.state = {
    // i dati del form possono avere o meno una primary key
    fields: options.fields,
    relations: options.relations
  }
  
  this._formPanel = options.formPanel || FormPanel;
  this._defaults = options.defaults || Inputs.defaults;
}
inherit(Form,Panel);

var proto = Form.prototype;

// viene richiamato dalla toolbar quando il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.mount = function(container){
  this._setupFields();
  var panel = this._setupPanel();
  this._mountPanel(panel,container);
  return resolve(true);
};

proto._mountPanel = function(panel,container){
  panel.$mount().$appendTo(container);
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.unmount = function(){
  this.internalComponent.$destroy(true);
  this.internalComponent = null;
  return resolve(true);
};

proto._isNew = function(){
  return this.isnew;
};

proto._hasFieldsRequired = function() {
  var someFieldsRequired = _.some(this.state.fields,function(field){
    return field.validate && field.validate.required;
  });
  var someRelationsRequired = _.some(this.state.relations,function(relation){
    return relation.validate && relation.validate.required;
  });
  return someFieldsRequired || someRelationsRequired;
};

proto._isVisible = function(field){
  if(!field.editable && (field.value == "" || _.isNull(field.value))){
    return false
  }
  return true;
};

proto._isEditable = function(field){
  return field.editable;
};

proto._isSimple = function(field){
  if (_.includes(Inputs.specialInputs,field.input.type)){
    return false;
  }
  return _.includes(Inputs.simpleFieldTypes,field.type)
};

proto._isTextarea = function(field) {
  return (field.input.type == Inputs.TEXTAREA);
};

proto._isSelect = function(field){
  return (_.includes(Inputs.specialInputs,field.input.type) && field.input.type == Inputs.SELECT);
};

proto._isLayerPicker = function(field){
  return (_.includes(Inputs.specialInputs,field.input.type) && field.input.type == Inputs.LAYERPICKER);
};

proto._pickLayer = function(field){
  var self = this;
  // ritorno una promessa, se qualcun altro volesse usare il risultato (es. per settare altri campi in base alla feature selezionata)
  var d = $.Deferred();
  // disabilito temporanemante lo strato modale per permettere l'interazione con la mappa
  GUI.setModal(false);
  mapService = GUI.getComponent('map').getService();
  var layer = mapService.getProject().getLayerById(field.input.options.layerid);
  var relFieldName = field.input.options.field;
  var relFieldLabel = layer.getAttributeLabel(field.input.options.field);
  
  this._pickInteraction = new PickCoordinatesInteraction();
  mapService.addInteraction(this._pickInteraction);
  this._pickInteraction.on('picked',function(e){   
    QueryService.queryByLocation(e.coordinate, [layer])
    .then(function(response){
      var featuresForLayers = response.data;
      if (featuresForLayers.length && featuresForLayers[0].features.length) { 
        var attributes = featuresForLayers[0].features[0].getProperties(); // prendo la prima feature del primo (e unico) layer
        var value = attributes[relFieldName] ? attributes[relFieldName] : attributes[relFieldLabel];
        field.value = value;
        d.resolve(attributes);
      }
      else {
        d.reject();
      }
    })
    .fail(function(){
      d.reject();
    })
    .always(function(){
      mapService.removeInteraction(self._pickInteraction);
      self._pickInteraction = null;
    })
  })
  return d.promise();
};

proto._getDefaultValue = function(field){
  var defaultValue = null;
  if (field.input && field.input.options && field.input.options.default){
    defaultValue = field.input.options.default;
  }
  else if (this._isSelect(field)){
    defaultValue = field.input.options.values[0].key;
  }
  /*else {
    defaultValue = this._defaults[field.type];
  }*/
  return defaultValue;
};

proto._getlayerPickerLayerName = function(layerId){
  mapService = GUI.getComponent('map').getService();
  var layer = mapService.getProject().getLayerById(layerId);
  if (layer){
    return layer.getName();
  }
  return "";
};

proto._shouldShowRelation = function(relation){
  return true;
};

// per definire i valori di default nel caso si tratta di un nuovo inserimento
proto._setupFields = function(){
  var self = this;
  
  var fields = _.filter(this.state.fields,function(field){
    // tutti i campi eccetto la PK (se non nulla)
    if (self.pk && field.value==null){
      return ((field.name != self.pk));
    }
    return true;
  });
  
  _.forEach(fields,function(field){
    if(_.isNil(field.value)){
      var defaultValue = self._getDefaultValue(field);
      if (defaultValue){
        field.value = defaultValue;
      }
    }
  });
  
  if (this.state.relations){
    var relations = this.state.relations;
    _.forEach(relations,function(relation){
      _.forEach(relation.elements,function(element){
        _.forEach(relation.fields,function(field){
          if(_.isNil(field.value)){
            var defaultValue = self._getDefaultValue(field);
            if (defaultValue){
              field.value = defaultValue;
            }
          }
        })
      })
    });
  }
};

proto._setupPanel = function(){
  var self = this;
  var panel = this.internalComponent = new this._formPanel({
    form: this
  });
  if (this.options.buttons) {
    panel.buttons = this.options.buttons;
  }
  
  
  var elementsBoxes = {};
  
  _.forEach(this.state.relations,function(relation){
    _.forEach(relation.elements,function(element){
      var boxid = self.getUniqueRelationElementid(relation,element);
      elementsBoxes[boxid] = {
        collapsed: true
      }
    })
  })
  this.state.elementsBoxes = elementsBoxes;
  panel.state = this.state;
  return panel;
};

proto.getUniqueRelationElementid = function(relation,element){
  return relation.name+'_'+element.id;
};

proto._getField = function(fieldName){
  var field = null;
  _.forEach(this.state.fields,function(f){
    if (f.name == fieldName){
      field = f;
    }
  })
  return field;
};

proto._addRelationElement = function(relation) {
  var element = this.provider.createRelationElement(relation);
  var elementBoxId = this.getUniqueRelationElementid(relation,element);
  Vue.set(this.state.elementsBoxes,elementBoxId,{collapsed:false});
  relation.elements.push(element);
};

proto._removeRelationElement = function(relation,element){
  var self = this;
  _.forEach(relation.elements,function(_element,idxToRemove){
    if (_element.id == element.id) {
      relation.elements.splice(idxToRemove,1);
      delete self.state.elementsBoxes.elmentBoxId;
    }
  })
};

proto._getRelationField = function(fieldName,relationName){
  var field = null;
  _.forEach(this.state.relations,function(relation,name){
    if (relationName == name){
      _.forEach(relation.fields,function(f){
        if (f.name == fieldName){
          field = f;
        }
      })
    }
  })
  return field;
};

module.exports = {
  Form: Form,
  FormPanel: FormPanel
}

},{"./formpanel.html":57,"core/query/queryservice":31,"core/utils/utils":34,"g3w-ol3/src/interactions/pickcoordinatesinteraction":43,"gui/gui":58,"gui/panel":65}],57:[function(require,module,exports){
module.exports = "<div>\n  <validator name=\"validation\">\n    <form novalidate class=\"form-horizontal g3w-form\">\n      <div class=\"box box-primary\">\n        <div class=\"box-header with-border\">\n          <h3 class=\"box-title\">Attributi elemento</h3>\n          <div class=\"box-tools pull-right\">\n          </div>\n        </div>\n        <div class=\"box-body\">\n          <template v-for=\"field in state.fields\">\n          <div v-if=\"isVisible(field)\" class=\"form-group has-feedback\">\n            <label :for=\"field.name\" class=\"col-sm-4 control-label\">{{ field.label }}<span v-if=\"field.validate && field.validate.required\">*</span></label>\n            <div class=\"col-sm-8\">\n              <input v-if=\"isSimple(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\">\n              <textarea v-if=\"isTextarea(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\">\n              </textarea>\n              <select v-if=\"isSelect(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\">\n                <option v-for=\"value in field.input.options.values\" value=\"{{ value.key }}\">{{ value.value }}</option>\n              </select>\n              <div v-if=\"isLayerPicker(field)\">\n                <input class=\"form-control\" @click=\"pickLayer(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" onfocus=\"blur()\" data-toggle=\"tooltip\" title=\"Ottieni il dato da un elemento del layer '{{ layerPickerPlaceHolder(field) }}'\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"'['+layerPickerPlaceHolder(field)+']'\">\n                <i class=\"glyphicon glyphicon-screenshot form-control-feedback\"></i>\n              </div>\n            </div>\n          </div>\n        </template>\n        </div>\n      </div>\n      <div v-for=\"relation in state.relations\" style=\"margin-top:10px\">\n        <div v-if=\"showRelation(relation)\" transition=\"expand\">\n          <div class=\"box box-default\">\n            <div class=\"box-header with-border\">\n              <h3 class=\"box-title\">{{ relation | relationplural }}</h3>\n            </div>\n            <div class=\"box-body\">\n              <table v-if=\"relation.elements.length\" class=\"table table-striped\">\n                <thead>\n                  <tr>\n                    <th v-for=\"field in fieldsSubset(relation.fields)\">{{field.label}}</th>\n                  </tr>\n                </thead>\n                <tbody>\n                  <template v-for=\"element in relation.elements\">\n                    <tr class=\"attributes-preview\" @click=\"toggleElementBox(relation,element)\">\n                      <td v-for=\"relfield in fieldsSubset(element.fields)\">\n                        <span>{{relfield.value}}</span>\n                      </td>\n                      <td>\n                        <i v-if=\"isRelationElementDeletable(relation,element)\" class=\"glyphicon glyphicon glyphicon-trash link trash\" @click.stop.prevent=\"removeRelationElement(relation,element)\"=></i>\n                        <i class=\"glyphicon glyphicon-option-horizontal link morelink\"></i>\n                      </td>\n                    </tr>\n                    <tr v-show=\"!collapseElementBox(relation,element)\" class=\"queryresults-featurebox\">\n                      <td :colspan=\"fieldsSubsetLength(element.fields)+1\">\n                        <template v-for=\"field in element.fields\">\n                          <div v-if=\"isVisible(field)\" class=\"form-group has-feedback\">\n                            <label :for=\"field.name\" class=\"col-sm-4 control-label\">{{ field.label }}<span v-if=\"field.validate && field.validate.required\">*</span></label>\n                            <div class=\"col-sm-8\">\n                              <input v-if=\"isSimple(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\">\n                              <textarea v-if=\"isTextarea(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\">\n                              </textarea>\n                              <select v-if=\"isSelect(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\">\n                              <option v-for=\"value in field.input.options.values\" value=\"{{ value.key }}\">{{ value.value }}</option>\n                              </select>\n                              <div v-if=\"isLayerPicker(field)\">\n                                <input class=\"form-control\" @click=\"pickLayer(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" onfocus=\"blur()\" data-toggle=\"tooltip\" title=\"Ottieni il dato da un elemento del layer '{{ layerPickerPlaceHolder(field) }}'\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"'['+layerPickerPlaceHolder(field)+']'\">\n                                <i class=\"glyphicon glyphicon-screenshot form-control-feedback\"></i>\n                              </div>\n                            </div>\n                          </div>\n                        </template>\n                      </td>\n                    </tr>\n                  </template>\n                </tbody>\n              </table>\n              <div v-if=\"canAddRelationElements(relation)\" class=\"row\" style=\"margin:0px\"><i class=\"glyphicon glyphicon-plus-sign pull-right btn-add\" @click=\"addRelationElement(relation)\"></i></div>\n            </div>\n          </div>\n        </div>\n      </div>\n      <div class=\"form-group\">\n        <div class=\"col-sm-offset-4 col-sm-8\">\n          <div v-if=\"hasFieldsRequired\" style=\"margin-bottom:10px\">\n            <span>* Campi richiesti</span>\n          </div>\n          <span v-for=\"button in buttons\">\n            <button class=\"btn \" :class=\"[button.class]\" @click.stop.prevent=\"exec(button.cbk)\" v-disabled=\"!btnEnabled(button)\">{{ button.title }}</button>\n          </span>\n        </div>\n      </div>\n    </form>\n  </validator>\n</div>\n";

},{}],58:[function(require,module,exports){
var noop = require('core/utils/utils').noop;
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');
var ComponentsRegistry = require('gui/componentsregistry');

// rappresenta l'interfaccia globale dell'API della GUI. 
// metodi devono essere implementati (definiti) dall'applicazione ospite
// l'app ospite dovrebbe chiamare anche la funzione GUI.ready() quando la UI è pronta
function GUI(){
  this.ready = false;
  // url delle risorse (immagini, ecc.)
  this.getResourcesUrl = noop;
  // show a Vue form
  this.showForm = noop;
  this.closeForm = noop;
  
  // mostra una lista di oggetti (es. lista di risultati)
  this.showListing = noop;
  this.closeListing = noop;
  this.hideListing = noop;
  
  // options conterrà i vari dati sui risultati. Sicuramente avrà la prprietà options.features
  // nel caso di queryByLocation avrà anche options.coordinate
  this.showQueryResults = function(options) {};
  this.hideQueryResults = noop;

  /* panel */
  this.showPanel = noop;
  this.hidePanel = noop;

  //metodi componente
  // aggiunge (e registra) un componente in un placeholder del template - Metodo implementato dal template
  this.addComponent = function(component,placeholder) {};
  this.removeComponent = function(id) {};
  // registra globalmente un componente (non legato ad uno specifico placeholder. Es. componente per mostrare risultati interrogazion)
  this.setComponent = function(component) {
    ComponentsRegistry.registerComponent(component);
  };
  this.getComponent = function(id) {
    return ComponentsRegistry.getComponent(id);
  };
  //fine metodi componente

  this.ready = function(){
    this.emit('ready');
    this.ready = true;
  };
  
  this.guiResized = function(){
    this.emit('guiresized');
  };

  /* spinner */
  GUI.showSpinner = function(options){};

  GUI.hideSpinner = function(id){};

  
  this.notify = noop;
  this.dialog = noop;
}

inherit(GUI,G3WObject);

module.exports = new GUI;

},{"core/g3wobject":13,"core/utils/utils":34,"gui/componentsregistry":55}],59:[function(require,module,exports){
module.exports = "<div>\n  Lista di oggetti\n</div>\n";

},{}],60:[function(require,module,exports){
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var GUI = require('gui/gui');
//var MapService = require('core/map/mapservice');

var ListPanelComponent = Vue.extend({
  template: require('./listpanel.html'),
  methods: {
    exec: function(cbk){
      var relations = this.state.relations || null;
      cbk(this.state.fields,relations);
      GUI.closeForm();
    }
  }
});


function ListPanel(options){
  // proprietà necessarie. In futuro le mettermo in una classe Panel da cui deriveranno tutti i pannelli che vogliono essere mostrati nella sidebar
  this.panelComponent = null;
  this.options =  options || {};
  this.id = options.id || null; // id del form
  this.name = options.name || null; // nome del form
  
  this.state = {
    list: options.list || []
  }
  
  this._listPanelComponent = options.listPanelComponent || ListPanelComponent;
}

var proto = ListPanel.prototype;

// viene richiamato dalla toolbar quando il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.onShow = function(container){
  var panel = this._setupPanel();
  this._mountPanel(panel,container);
  return resolve(true);
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.onClose = function(){
  this.panelComponent.$destroy(true);
  this.panelComponent = null;
  return resolve(true);
};

proto._setupPanel = function(){
  var panel = this.panelComponent = new this._listPanelComponent({
    panel: this
  });
  panel.state = this.state;
  return panel
};

proto._mountPanel = function(panel,container){
  panel.$mount().$appendTo(container);
};

module.exports = {
  ListPanelComponent: ListPanelComponent,
  ListPanel: ListPanel
}

},{"./listpanel.html":59,"core/utils/utils":34,"gui/gui":58}],61:[function(require,module,exports){
var ResetControl = require('g3w-ol3/src/controls/resetcontrol');
var QueryControl = require('g3w-ol3/src/controls/querycontrol');
var ZoomBoxControl = require('g3w-ol3/src/controls/zoomboxcontrol');

var OLControl = require('g3w-ol3/src/controls/olcontrol');

var ControlsFactory = {
  create: function(options) {
    var control;
    var ControlClass = ControlsFactory.CONTROLS[options.type];
    if (ControlClass) {
      control = new ControlClass(options);
    }
    return control;
  }
};

ControlsFactory.CONTROLS = {
  'reset': ResetControl,
  'zoombox': ZoomBoxControl,
  'query': QueryControl,
  'zoom': OLControl,
  'scaleline': OLControl,
  'overview': OLControl
};

module.exports = ControlsFactory;

},{"g3w-ol3/src/controls/olcontrol":37,"g3w-ol3/src/controls/querycontrol":38,"g3w-ol3/src/controls/resetcontrol":39,"g3w-ol3/src/controls/zoomboxcontrol":40}],62:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var GUI = require('gui/gui');
var ApplicationService = require('core/applicationservice');
var ProjectsRegistry = require('core/project/projectsregistry');
var ProjectTypes = require('core/project/projecttypes');
var GeometryTypes = require('core/geometry/geometry').GeometryTypes;
var ol3helpers = require('g3w-ol3/src/g3w.ol3').helpers;
var WMSLayer = require('core/map/layer/wmslayer');
var ControlsFactory = require('gui/map/control/factory');
var QueryService = require('core/query/queryservice');

function MapService(project){
  var self = this;
  this.config;
  this.viewer;
  this.target;
  this._mapControls = [],
  this._mapLayers = [];
  this.mapBaseLayers = {};
  this.layersExtraParams = {};
  this.state = {
      bbox: [],
      resolution: null,
      center: null,
      loading: false
  };
  this.config = ApplicationService.getConfig();
  
  var routerService = ApplicationService.getRouterService();
  routerService.addRoute('map/{?query}',function(query){
    var query = query || {};
    if (query.center) {

    }
  });
  
  this._howManyAreLoading = 0;
  this._incrementLoaders = function(){
    if (this._howManyAreLoading == 0){
      this.emit('loadstart');
      GUI.showSpinner({
        container: $('#map-spinner'),
        id: 'maploadspinner',
        style: 'blue'
      });
    }
    this._howManyAreLoading += 1;
  };
  
  this._decrementLoaders = function(){
    this._howManyAreLoading -= 1;
    if (this._howManyAreLoading == 0){
      this.emit('loadend');
      GUI.hideSpinner('maploadspinner');
    }
  };
  
  this._interactionsStack = [];
  if(!_.isNil(project)) {
    this.project = project;
  }
  else {
    this.project = ProjectsRegistry.getCurrentProject();
  }

  
  this.setters = {
    setMapView: function(bbox,resolution,center){
      this.state.bbox = bbox;
      this.state.resolution = resolution;
      this.state.center = center;
      this.updateMapLayers(this.mapLayers);
    },
    setupViewer: function(initialResolution){
      //$script("http://epsg.io/"+ProjectService.state.project.crs+".js");
      proj4.defs("EPSG:"+self.project.state.crs,this.project.state.proj4);
      if (self.viewer) {
        self.viewer.destroy();
        self.viewer = null;
      }
      self._setupViewer(initialResolution);
      self.setupControls();
      self.setupLayers();
      self.emit('viewerset');
    }
  };
  
  this._setupViewer = function(initialResolution){
    var extent = this.project.state.extent;
    var projection = this.getProjection();
    
    /*var constrain_extent;
    if (this.config.constraintextent) {
      var extent = this.config.constraintextent;
      var dx = extent[2]-extent[0];
      var dy = extent[3]-extent[1];
      var dx4 = dx/4;
      var dy4 = dy/4;
      var bbox_xmin = extent[0] + dx4;
      var bbox_xmax = extent[2] - dx4;
      var bbox_ymin = extent[1] + dy4;
      var bbox_ymax = extent[3] - dy4;
      
      constrain_extent = [bbox_xmin,bbox_ymin,bbox_xmax,bbox_ymax];
    }*/
    
    this.viewer = ol3helpers.createViewer({
      id: this.target,
      view: {
        projection: projection,
        /*center: this.config.initcenter || ol.extent.getCenter(extent),
        zoom: this.config.initzoom || 0,
        extent: this.config.constraintextent || extent,
        minZoom: this.config.minzoom || 0, // default di OL3 3.16.0
        maxZoom: this.config.maxzoom || 28 // default di OL3 3.16.0*/
        center: ol.extent.getCenter(extent),
        extent: extent,
        //minZoom: 0, // default di OL3 3.16.0
        //maxZoom: 28 // default di OL3 3.16.0
        maxResolution: initialResolution
      }
    });
    
    if (this.config.background_color) {
      $('#'+this.target).css('background-color',this.config.background_color);;
    }
    
    $(this.viewer.map.getViewport()).prepend('<div id="map-spinner" style="position:absolute;right:0px;"></div>');
    
    this.viewer.map.getInteractions().forEach(function(interaction){
      self._watchInteraction(interaction);
    });
    
    this.viewer.map.getInteractions().on('add',function(interaction){
      self._watchInteraction(interaction.element);
    })
    
    this.viewer.map.getInteractions().on('remove',function(interaction){
      //self._onRemoveInteraction(interaction);
    });
  
    
    this.viewer.map.getView().setResolution(initialResolution);
    
    this.viewer.map.on('moveend',function(e){
      self._setMapView();
    });

    //AL MOMENTO LASCIO COSÌ POI VEDIAMO
    QueryService.setMapService(this);

    this.emit('ready');
  };
  
  this.project.on('projectswitch',function(){
    self.setupLayers();
  });
  
  this.project.onafter('setLayersVisible',function(layersIds){
    var mapLayers = _.map(layersIds,function(layerId){
      var layer = self.project.getLayerById(layerId);
      return self.getMapLayerForLayer(layer);
    })
    self.updateMapLayers(self.getMapLayers());
  });
  
  this.project.onafter('setBaseLayer',function(){
    self.updateMapLayers(self.mapBaseLayers);
  });
  
  base(this);
};

inherit(MapService,G3WObject);

var proto = MapService.prototype;

// rende questo mapservice slave di un altro MapService
proto.slaveOf = function(mapService, sameLayers){
  // se impostare i layer iniziali uguali a quelli del mapService master
  var sameLayers = sameLayers || false;
};

proto.setLayersExtraParams = function(params,update){
  this.layersExtraParams = _.assign(this.layersExtraParams,params);
  this.emit('extraParamsSet',params,update);
};

proto.getProject = function() {
  return this.project;
};

proto.getMap = function() {
  return this.viewer.map;
};

proto.getProjection = function() {
  var extent = this.project.state.extent;
  var projection = new ol.proj.Projection({
    code: "EPSG:"+this.project.state.crs,
    extent: extent
  });
  return projection;
};

proto.getViewerElement = function(){
  return this.viewer.map.getTargetElement();
};

proto.getViewport = function(){
  return this.viewer.map.getViewport();
};

proto.getResolution = function() {
  return this.viewer.map.getView().getResolution();
};

proto.getEpsg = function() {
  return this.viewer.map.getView().getProjection().getCode();
};

proto.getGetFeatureInfoUrlForLayer = function(layer,coordinates,resolution,epsg,params) {
  var mapLayer = this.getMapLayerForLayer(layer);
  return mapLayer.getGetFeatureInfoUrl(coordinates,resolution,epsg,params);
};

proto.setupControls = function(){
  var self = this;
  var map = self.viewer.map;
  if (this.config && this.config.mapcontrols) {
    _.forEach(this.config.mapcontrols,function(controlType){
      var control;
      switch (controlType) {
        case 'reset':
          if (!isMobile.any) {
            control = ControlsFactory.create({
              type: controlType
            });
          }
          self.addControl(control);
          break;
        case 'zoom':
          control = ControlsFactory.create({
            type: controlType,
            zoomInLabel: "\ue98a",
            zoomOutLabel: "\ue98b"
          });
          self.addControl(control);
          break;
        case 'zoombox': 
          if (!isMobile.any) {
            control = ControlsFactory.create({
              type: controlType
            });
            control.on('zoomend',function(e){
              self.viewer.fit(e.extent);
            })
          }
          self.addControl(control);
          break;
        case 'zoomtoextent':
          control = ControlsFactory.create({
            type: controlType,
            label:  "\ue98c",
            extent: self.config.constraintextent
          });
          self.addControl(control);
          break;
        case 'query':
          control = ControlsFactory.create({
            type: controlType
          });
          control.on('picked',function(e){
            var coordinates = e.coordinates;
            var showQueryResults = GUI.showResultsFactory('query');
            
            var layers = self.project.getLayers({
              QUERYABLE: true,
              SELECTEDORALL: true
            });
            
            //faccio query by location su i layers selezionati o tutti
            var queryResultsPanel = showQueryResults('interrogazione');
            QueryService.queryByLocation(coordinates, layers)
            .then(function(results){
              queryResultsPanel.setQueryResponse(results);
            });
          });
          self.addControl(control);
          break;
        case 'scaleline':
          control = ControlsFactory.create({
            type: controlType,
            position: 'br'
          });
          self.addControl(control);
          break;
        case 'overview':
          var overviewProjectGid = self.project.getOverviewProjectGid();
          if (overviewProjectGid) {
            ProjectsRegistry.getProject(overviewProjectGid)
            .then(function(project){
              var overViewMapLayers = self.getOverviewMapLayers(project);
              control = ControlsFactory.create({
                type: controlType,
                position: 'bl',
                className: 'ol-overviewmap ol-custom-overviewmap',
                collapseLabel: $('<span class="glyphicon glyphicon-menu-left"></span>')[0],
                label: $('<span class="glyphicon glyphicon-menu-right"></span>')[0],
                collapsed: false,
                layers: overViewMapLayers,
                view: new ol.View({
                  projection: self.getProjection()
                })
              });
              self.addControl(control);
            });
          }
          break;
      };
    });
  }
};

proto.addControl = function(control){
  this.viewer.map.addControl(control);
  this._mapControls.push(control);
};

proto.addMapLayer = function(mapLayer) {
  this._mapLayers.push(mapLayer);
};

proto.getMapLayers = function() {
  return this._mapLayers;
};

proto.getMapLayerForLayer = function(layer){
  var mapLayer;
  var multilayerId = 'layer_'+layer.state.multilayer;
  _.forEach(this.getMapLayers(),function(_mapLayer){
    if (_mapLayer.getId() == multilayerId) {
      mapLayer = _mapLayer;
    }
  })
  return mapLayer;
};

proto.setupBaseLayers = function(){
  var self = this;
  if (!this.project.state.baselayers){
    return;
  }
  var self = this;
  this.mapBaseLayers = {};
  
  var initBaseLayer = ProjectsRegistry.config.initbaselayer;
  var baseLayersArray = this.project.state.baselayers;
  
  _.forEach(baseLayersArray,function(baseLayer){
    var visible = true;
    if (self.project.state.initbaselayer) {
      visible = baseLayer.id == (self.project.state.initbaselayer);
    }
    if (baseLayer.fixed) {
      visible = baseLayer.fixed;
    }
    baseLayer.visible = visible;
  })
  
  baseLayersArray.forEach(function(layer){     
    var config = {
      url: self.project.getWmsUrl(),
      id: layer.id,
      tiled: true
    };
    
    var mapLayer = new WMSLayer(config);
    self.registerListeners(mapLayer);
    
    mapLayer.addLayer(layer);
    self.mapBaseLayers[layer.id] = mapLayer;
  });
  
  _.forEach(_.values(this.mapBaseLayers).reverse(),function(mapLayer){
    self.viewer.map.addLayer(mapLayer.getOLLayer());
    mapLayer.update(self.state);
  })
};

proto.setupLayers = function(){
  var self = this;
  this.viewer.removeLayers();
  this.setupBaseLayers();
  this._reset();
  var layers = this.project.getLayers();
  //raggruppo per valore del multilayer con chiave valore multilayer e valore array
  var multiLayers = _.groupBy(layers,function(layer){
    return layer.state.multilayer;
  });
  _.forEach(multiLayers,function(layers,id){
    var multilayerId = 'layer_'+id
    var tiled = layers[0].state.tiled;
    var config = {
      url: self.project.getWmsUrl(),
      id: multilayerId,
      tiled: tiled
    };
    var mapLayer = new WMSLayer(config,self.layersExtraParams);
    self.addMapLayer(mapLayer);
    self.registerListeners(mapLayer);
    _.forEach(layers.reverse(),function(layer){
      mapLayer.addLayer(layer);
    });
  })
  
  _.forEach(this.getMapLayers().reverse(),function(mapLayer){
    self.viewer.map.addLayer(mapLayer.getOLLayer());
    mapLayer.update(self.state,self.layersExtraParams);
  })
  return this.mapLayers;
};

proto.getOverviewMapLayers = function(project) {
  var self = this;
  var projectLayers = project.getLayers({
    'VISIBLE': true
  });

  var multiLayers = _.groupBy(projectLayers,function(layer){
    return layer.state.multilayer;
  });
  
  var overviewMapLayers = [];
  _.forEach(multiLayers,function(layers,id){
    var multilayerId = 'overview_layer_'+id
    var tiled = layers[0].state.tiled;
    var config = {
      url: project.getWmsUrl(),
      id: multilayerId,
      tiled: tiled
    };
    var mapLayer = new WMSLayer(config);
    _.forEach(layers.reverse(),function(layer){
      mapLayer.addLayer(layer);
    });
    overviewMapLayers.push(mapLayer.getOLLayer(true));
  })
  
  return overviewMapLayers.reverse();
};

proto.updateMapLayers = function(mapLayers) {
  var self = this;
  _.forEach(mapLayers,function(mapLayer){
    mapLayer.update(self.state,self.layersExtraParams);
  })
};

proto.registerListeners = function(mapLayer){
  var self = this;
  mapLayer.on('loadstart',function(){
    self._incrementLoaders();
  });
  mapLayer.on('loadend',function(){
    self._decrementLoaders(false);
  });
  
  this.on('extraParamsSet',function(extraParams,update){
    if (update) {
      mapLayer.update(this.state,extraParams);
    }
  })
};

proto.setTarget = function(elId){
  this.target = elId;
};

proto.addInteraction = function(interaction){
  this._unsetControls();
  this.viewer.map.addInteraction(interaction);
  interaction.setActive(true);
};

proto.removeInteraction = function(interaction){
  this.viewer.map.removeInteraction(interaction);
};

// emetto evento quando viene attivata un interazione di tipo Pointer (utile ad es. per disattivare/riattivare i tool di editing)
proto._watchInteraction = function(interaction) {
  var self = this;
  interaction.on('change:active',function(e){
    if ((e.target instanceof ol.interaction.Pointer) && e.target.getActive()) {
      self.emit('pointerInteractionSet',e.target);
    }
  })
};

proto.goTo = function(coordinates,zoom){
  var zoom = zoom || 6;
  this.viewer.goTo(coordinates,zoom);
};

proto.goToWGS84 = function(coordinates,zoom){
  var coordinates = ol.proj.transform(coordinates,'EPSG:4326','EPSG:'+this.project.state.crs);
  this.goTo(coordinates,zoom);
};

proto.extentToWGS84 = function(extent){
  return ol.proj.transformExtent(extent,'EPSG:'+this.project.state.crs,'EPSG:4326');
};

proto.highlightGeometry = function(geometryObj,options){
  var options = options || {};
  var zoom = options.zoom || true;
  
  var view = this.viewer.map.getView();
  
  var geometry;
  if (geometryObj instanceof ol.geom.Geometry){
    geometry = geometryObj;
  }
  else {
    format = new ol.format.GeoJSON;
    geometry = format.readGeometry(geometryObj);
  }
  
  var geometryType = geometry.getType();
  if (geometryType == 'Point') {
    this.viewer.goTo(geometry.getCoordinates());
  }
  else {
    if (zoom) {
      this.viewer.fit(geometry,options);
    }
  }

  var duration = options.duration || 4000;
  
  if (options.fromWGS84) {
    geometry.transform('EPSG:4326','EPSG:'+ProjectService.state.project.crs);
  }
  
  var feature = new ol.Feature({
    geometry: geometry
  });
  var source = new ol.source.Vector();
  source.addFeatures([feature]);
  var layer = new ol.layer.Vector({
    source: source,
    style: function(feature){
      var styles = [];
      var geometryType = feature.getGeometry().getType();
      if (geometryType == 'LineString') {
        var style = new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: 'rgb(255,255,0)',
            width: 4
          })
        })
        styles.push(style);
      }
      else if (geometryType == 'Point'){
        var style = new ol.style.Style({
          image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
              color: 'rgb(255,255,0)',
            })
          }),
          zIndex: Infinity
        });
        styles.push(style);
      }
      
      return styles;
    }
  })
  layer.setMap(this.viewer.map);
  
  setTimeout(function(){
    layer.setMap(null);
  },duration);
};

proto.refreshMap = function(){
  _.forEach(this.mapLayers,function(wmsLayer){
    wmsLayer.getOLLayer().getSource().updateParams({"time": Date.now()});
  })
};

proto.resize = function(width,height) {
  if (!this.viewer) {
    var initialExtent = this.project.state.extent;
    var xRes = ol.extent.getWidth(initialExtent) / width;
    var yRes = ol.extent.getHeight(initialExtent) / height;
    var res = Math.max(xRes,yRes);
    this.setupViewer(res);
  }
  this.getMap().updateSize();
  this._setMapView();
};

proto._reset = function() {
  this._mapLayers = [];
};

proto._unsetControls = function() {
  _.forEach(this._mapControls,function(control){
    if (control.toggle) {
      control.toggle(false);
    }
  })
};

proto._setMapView = function(){
  var bbox = this.viewer.getBBOX();
  var resolution = this.viewer.getResolution();
  var center = this.viewer.getCenter();
  this.setMapView(bbox,resolution,center);
};

module.exports = MapService

},{"core/applicationservice":2,"core/g3wobject":13,"core/geometry/geometry":15,"core/map/layer/wmslayer":21,"core/project/projectsregistry":27,"core/project/projecttypes":28,"core/query/queryservice":31,"core/utils/utils":34,"g3w-ol3/src/g3w.ol3":41,"gui/gui":58,"gui/map/control/factory":61}],63:[function(require,module,exports){
module.exports = "<div id=\"map\" style=\"width:100%;height:100%\"></div>\n";

},{}],64:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var t = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var GUI = require('gui/gui');   
var Component = require('gui/vue/component');
var RouterService = require('core/router');
var ol3helpers = require('g3w-ol3/src/g3w.ol3').helpers;
var MapsRegistry = require('core/map/mapsregistry');
var MapService = require('../mapservice');

var vueComponentOptions = {
  template: require('./map.html'),
  ready: function(){
    var self = this;
    
    var mapService = this.$options.mapService;
    
    mapService.setTarget(this.$el.id);
    
    // questo serve per quando viene cambiato progetto/vista cartografica, in cui viene ricreato il viewer (e quindi la mappa)
    mapService.onafter('setupViewer',function(){
      mapService.setTarget(self.$el.id);
    });
  }
}

var InternalComponent = Vue.extend(vueComponentOptions);

Vue.component('g3w-map', vueComponentOptions);

function MapComponent(options){
  base(this,options);
  this.id = "map-component";
  this.title = "Catalogo dati";
  this._service = new MapService;
  merge(this, options);
  this.internalComponent = new InternalComponent({
    mapService: this._service
  });
};

inherit(MapComponent, Component);
var proto = MapComponent.prototype;

proto.layout = function(width,height) {
  $("#map").height(height);
  $("#map").width(width);
  this._service.resize(width,height);
};

module.exports =  MapComponent;

},{"../mapservice":62,"./map.html":63,"core/i18n/i18n.service":16,"core/map/mapsregistry":22,"core/router":32,"core/utils/utils":34,"g3w-ol3/src/g3w.ol3":41,"gui/gui":58,"gui/vue/component":77}],65:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var resolvedValue = require('core/utils/utils').resolve;
var G3WObject = require('core/g3wobject');

var Panel = function(options) {
  this.internalPanel = null;
  var options = options || {};
  this.id = options.id || null;
  this.title = options.title || '';
};

inherit(Panel, G3WObject);

var proto = Panel.prototype;

proto.getId = function(){
  return this.id;
};

proto.getTitle = function(){
  return this.title;
};

/* HOOKS */

/*
 * Il metodo permette al pannello di montarsi nel DOM
 * parent: elemento DOM padre, su cui inserirsi;
 * ritorna una promise, risolta nel momento in cui sarà terminato il montaggio
*/

// SONO DUE TIPOLOGIE DI MONTAGGIO CON IL QUALE IL PANNELLO
// CHE VERRA' MONTATO AL VOLO CON IL METODO MOUNT A SECONDA DEL TIPO DI PANNELLO RICHIESTO

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso

proto.mount = function(parent) {
  var panel = this.internalPanel;
  panel.$mount().$appendTo(parent);
  $(parent).localize();
  return resolvedValue(true);
};

/*
 * Metodo richiamato quando si vuole rimuovere il panello.
 * Ritorna una promessa che sarà risolta nel momento in cui il pannello avrà completato la propria rimozione (ed eventuale rilascio di risorse dipendenti)
*/
proto.unmount = function(){
  var panel = this.internalPanel;
  var deferred = $.Deferred();
  panel.$destroy(true);
  deferred.resolve();
  return deferred.promise();
};

/*
 * Metodo (opzionale) che offre l'opportunità di ricalcolare proprietà dipendenti dalle dimensioni del padre
 * parentHeight: nuova altezza del parent
 * parentWidth: nuova larghezza del parent
 * richiamato ogni volta che il parent subisce un ridimensionamento
*/
proto.onResize = function(parentWidth,parentHeight){};


module.exports = Panel;

},{"core/g3wobject":13,"core/utils/utils":34}],66:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var GUI = require('gui/gui');
var G3WObject = require('core/g3wobject');
var ComponentsRegistry = require('gui/componentsregistry');
var ProjectsRegistry = require('core/project/projectsregistry');

function QueryResultsService(){
  var self = this;
  this._actions = {
    'zoomto': QueryResultsService.zoomToElement,
    'gotogeometry': QueryResultsService.goToGeometry
  };
  
  this.init = function(options) {
    this.clearState();
  };
  
  this.state = {
    layers: [],
    query: {},
    querytitle: "",
    loading: true
  };
  
  this.setters = {
    setQueryResponse: function(queryResponse) {
      this.state.layers = [];
      this.state.query = queryResponse.query;
      this._digestFeaturesForLayers(queryResponse.data);
      this.state.loading = false;
    }
  };
  
  this.clearState = function() {
    this.state = {
      layers: [],
      query: {},
      querytitle: "",
      loading: true
    };
  };
  
  this.setTitle = function(querytitle) {
    this.state.querytitle = querytitle || "";
  };
  
  this.reset = function() {
    this.clearState();
  };
  
  this._digestFeaturesForLayers = function(featuresForLayers) {
    var self = this;
    _.forEach(featuresForLayers,function(featuresForLayer){
      var layer = featuresForLayer.layer;
      if (featuresForLayer.features.length) {
        var layerObj = {
          title: layer.state.title,
          id: layer.state.id,
          attributes: self._parseAttributes(layer.getAttributes(),featuresForLayer.features[0].getProperties()), // prendo solo gli attributi effettivamente ritornati dal WMS (usando la prima feature disponibile)
          features: []
        };
        _.forEach(featuresForLayer.features,function(feature){      
          var featureObj = {
            id: feature.getId(),
            attributes: feature.getProperties(),
            geometry: feature.getGeometry()
          }
          layerObj.features.push(featureObj);
        })
        self.state.layers.push(layerObj);
      }
    })
  };
  
  this._parseAttributes = function(layerAttributes,featureAttributes) {
    var featureAttributesNames = _.keys(featureAttributes);
    if (layerAttributes.length) {
      var featureAttributesNames = _.keys(featureAttributes);
      return _.filter(layerAttributes,function(attribute){
        return featureAttributesNames.indexOf(attribute.name) > -1;
      })
    }
    // se layer.attributes è vuoto (es. quando l'interrogazione è verso un layer esterno di cui non so i campi) costruisco la struttura "fittizia" usando l'attributo sia ocme name che come label
    else {
      return _.map(featureAttributesNames,function(featureAttributesName){
        return {
          name: featureAttributesName,
          label: featureAttributesName
        }
      })
    }
  }
  
  this.trigger = function(action,layer,feature) {
    var actionMethod = this._actions[action];
    if (actionMethod) {
      actionMethod(layer,feature);
    }
  };
  
  base(this);
};

QueryResultsService.zoomToElement = function(layer,feature) {

};

QueryResultsService.goToGeometry = function(layer,feature) {
  if (feature.geometry) {
    GUI.hideQueryResults();
    var mapService = ComponentsRegistry.getComponent('map').getService();
    mapService.highlightGeometry(feature.geometry);
  }
};

// Make the public service en Event Emitter
inherit(QueryResultsService, G3WObject);

module.exports = QueryResultsService;

},{"core/g3wobject":13,"core/project/projectsregistry":27,"core/utils/utils":34,"gui/componentsregistry":55,"gui/gui":58}],67:[function(require,module,exports){
module.exports = "<!--<div id=\"search-results\">\n  <div v-for=\"layer in state.layers\" style=\"cursor:pointer\">\n    <h4>{{ layer.title }}</h4>\n    <p>Numero di features: {{ layer.features.length }}</p>\n  </div>\n</div>-->\n<div id=\"search-results\" class=\"queryresults-container\">\n  <h3>Risultati {{state.querytitle | lowercase}}</h3>\n  <div v-show=\"state.loading\" class=\"bar-loader\"></div>\n  <ul v-if=\"hasResults()\" class=\"queryresults\" id=\"queryresults\">\n    <li v-if=\"layerHasFeatures(layer)\" v-for=\"layer in state.layers\">\n      <div class=\"box box-primary\">\n        <div class=\"box-header with-border\">\n          <h3 class=\"box-title\">{{ layer.title }} ({{layer.features.length}})</h3>\n          <div class=\"box-tools pull-right\">\n            <button class=\"btn btn-box-tool\" data-widget=\"collapse\"><i class=\"fa fa-minus\"></i></button>\n          </div>\n        </div>\n        <div class=\"box-body\">\n          <table class=\"table table-striped\">\n            <thead>\n              <tr>\n                <th v-for=\"attribute in attributesSubset(layer.attributes)\">{{attribute.label}}</th>\n              </tr>\n            </thead>\n            <tbody>\n              <template v-for=\"feature in layer.features\">\n                <tr class=\"attributes-preview\" @click=\"toggleFeatureBox(layer,feature)\">\n                  <td v-for=\"attribute in attributesSubset(layer.attributes)\">\n                    <span>{{feature.attributes[attribute.name]}}</span>\n                    <!--<span v-if=\"isSimple(layer,feature,attribute)\">{{feature.attributes[attribute.name]}}</span>-->\n                    <!--<span v-if=\"isRoute(layer,feature,attribute)\" class=\"link dashboardlink\" @click=\"goto(layer,feature.attributes[attribute.name])\">{{ feature.attributes[attribute.name] }}</span>-->\n                    <!--<img v-if=\"isPhoto(layer,feature,attribute)\" data-url=\"{{getPhotoUrl(feature.attributes[attribute.name])}}\" style=\"max-width:50px\" :src=\"getPhotoUrl(feature.attributes[attribute.name],thumb)\" />-->\n                    <!--<a v-if=\"isLink(layer,feature,attribute)\" href=\"layer.feature.attributes[attribute.name]\" class=\"glyphicon glyphicon-link\"></a>-->\n                  </td>\n                  <td><span class=\"glyphicon glyphicon-option-horizontal link morelink\"></span></td>\n              </tr>\n              <tr v-show=\"collapseFeatureBox(layer,feature)\" class=\"queryresults-featurebox\">\n                <td :colspan=\"attributesSubsetLength(layer.attributes)+1\">\n                  <div class=\"action-buttons-container\">\n                    <div v-if=\"geometryAvailable(feature)\" class=\"action-button hint--top-right\" aria-label=\"Visualizza sulla mappa\">\n                      <span class=\"action-button-icon glyphicon glyphicon-map-marker\" @click=\"trigger('gotogeometry',layer,feature)\"></span>\n                    </div>\n                    <!--<div class=\"action-button hint--top-right\" aria-label=\"Link all'elemento\">\n                      <span class=\"action-button-icon glyphicon glyphicon-link\"></span>\n                    </div>-->\n                  </div>\n                  <table>\n                    <tr v-for=\"attribute in layer.attributes\">\n                      <td class=\"attr-label\">{{attribute.label}}</td>\n                      <td class=\"attr-value\">{{feature.attributes[attribute.name]}}</td>\n                    </tr>\n                  </table>\n                </td>\n              </tr>\n              </template>\n            </tbody>\n          </table>\n        </div>\n      </div>\n    </li>\n  </ul>\n  <span v-if=\"!hasResults()\">Nessun risultato</span>\n</div>\n\n";

},{}],68:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var Component = require('gui/vue/component');
var G3WObject = require('core/g3wobject');
var QueryResultsService = require('gui/queryresults/queryresultsservice');

var vueComponentOptions = {
  template: require('./queryresults.html'),
  data: function() {
    return {
      state: this.$options.queryResultsService.state,
      layersFeaturesBoxes: {},
    }
  },
  replace: false,
  methods: {
    layerHasFeatures: function(layer) {
      if (layer.features) {
        return layer.features.length > 0;
      }
      return false;
    },
    hasResults: function() {
      return this.state.layers.length;
    },
    geometryAvailable: function(feature) {
      return feature.geometry ? true : false;
    },
    attributesSubset: function(attributes) {
      var end = Math.min(3,attributes.length);
      return attributes.slice(0,end);
    },
    attributesSubsetLength: function(attributes) {
      return this.attributesSubset(attributes).length;
    },
    collapseFeatureBox: function(layer,feature) {
      var collapsed = true;
      var boxid = layer.id+'_'+feature.id;
      if (this.layersFeaturesBoxes[boxid]) {
        collapsed = this.layersFeaturesBoxes[boxid].collapsed;
      }
      return collapsed;
    },
    toggleFeatureBox: function(layer,feature) {
      var boxid = layer.id+'_'+feature.id;
      this.layersFeaturesBoxes[boxid].collapsed = !this.layersFeaturesBoxes[boxid].collapsed;
    },
    trigger: function(action,layer,feature) {
      this.$options.queryResultsService.trigger(action,layer,feature);
    }
  }
};

// se lo voglio istanziare manualmente
var InternalComponent = Vue.extend(vueComponentOptions);

function QueryResultsComponent(options){
  base(this,options);
  var self = this;
  this.id = "queryresults";
  this.title = "Query Results";
  this._service = new QueryResultsService();
  //usato quando è stato distrutto
  this.setInternalComponent = function() {
    this.internalComponent = new InternalComponent({
      queryResultsService: this._service
    });
    this.createLayersFeaturesBoxes();
    this.internalComponent.querytitle = this._service.state.querytitle;
  }
  
  this._service.onafter('setQueryResponse',function(){
    self.createLayersFeaturesBoxes();
  })
  merge(this, options);
  
  this.createLayersFeaturesBoxes = function() {
    var layersFeaturesBoxes = {}
    var layers = this._service.state.layers;
    _.forEach(layers,function(layer){
      _.forEach(layer.features,function(feature){
        var boxid = layer.id+'_'+feature.id
        layersFeaturesBoxes[boxid] = {
          collapsed: false
        }
      })
    })
    this.internalComponent.layersFeaturesBoxes = layersFeaturesBoxes;
  };
};

inherit(QueryResultsComponent, Component);

module.exports = QueryResultsComponent;

/*

var resolvedValue = require('g3w/core/utils').resolvedValue;
var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');
var GUI = require('g3w/gui/gui');
var ApiService = require('g3w/core/apiservice');
var ProjectService = require('g3w/core/projectservice').ProjectService;
var MapService = require('g3w/core/mapservice');
var RouterService = require('g3w/core/router');

var TplService = require('./tplservice');

var Fields = {};
Fields.STRING = 'string';
Fields.INTEGER = 'integer';
Fields.FLOAT = 'float';


Fields.simpleFieldTypes = [Fields.STRING,Fields.INTEGER,Fields.FLOAT];
Fields.LINK = 'link';
Fields.PHOTO = 'photo';
Fields.POINTLINK = 'pointlink';
Fields.ROUTE = 'route';

var FieldsRules = {
  varianti: {
    id: Fields.ROUTE
  },
  paline: {
    id: Fields.ROUTE
  }
};

function getFieldType(layer,feature,attribute) {
  var fieldTypeFromRules = _.get(FieldsRules,layer.id+'.'+attribute.name);
  if (fieldTypeFromRules) {
    return fieldTypeFromRules;
  }
  
  var URLPattern = /^(https?:\/\/[^\s]+)/g;
  var PhotoPattern = /[^\s]+.(png|jpg|jpeg)$/g;
  var value = feature.attributes[attribute.name].toString();
  
  var extension = value.split('.').pop();
  if (value.match(URLPattern)) {
    return Fields.LINK;
  }
  
  if (value.match(PhotoPattern)) {
    return Fields.PHOTO;
  }
  
  if (Fields.simpleFieldTypes.indexOf(attribute.type) > -1) {
    return attribute.type;
  }
};

function isSimple(layer,feature,attribute) {
  var fieldType = getFieldType(layer,feature,attribute);
  return Fields.simpleFieldTypes.indexOf(fieldType) > -1;
};

function isLink(layer,feature,attribute) {
  var fieldType = getFieldType(layer,feature,attribute);
  return Fields.LINK == fieldType;
};

function isPhoto(layer,feature,attribute) {
  var fieldType = getFieldType(layer,feature,attribute);
  return Fields.PHOTO == fieldType;
};

function isRoute(layer,feature,attribute) {
  var fieldType = getFieldType(layer,feature,attribute);
  return Fields.ROUTE == fieldType;
};

var TplQueryResultsComponent = Vue.extend({
  template: require('./tplqueryresults.html'),
  data: function(){
    return {
      lotto: null,
      day: null,
      territorial_details: {},
      layers: [],
      basePhotoUrl: ''
    }
  },
  ready: function(){
    try {
      var viewer = new Viewer(document.getElementById('tpl-mapqueryresults'), {
        url: 'data-url',
        zIndex: 10000
      });
    }
    catch(err){
    }
  },
  methods: {
    layerHasFeatures: function(layer) {
      if (layer.features) {
        return layer.features.length > 0;
      }
      return false;
    },
    calcKm: function(meters) {
      return Math.round10((meters/1000),-2);
    },
    showFeature: function(feature) {
      GUI.hideListing();
      MapService.highlightGeometry(feature.geometry,{zoom: true});
    },
    hasGeometry: function(feature) {
      return _.isNil(feature.getGeometry);
    },
    isSimple: function(layer,feature,attribute) {
      return isSimple(layer,feature,attribute);
    },
    isPhoto: function(layer,feature,attribute) {
      return isPhoto(layer,feature,attribute);
    },
    isLink: function(layer,feature,attribute) {
      return isLink(layer,feature,attribute);
    },
    isRoute: function(layer,feature,attribute) {
      return isRoute(layer,feature,attribute);
    },
    getPhotoUrl: function(path,thumb) {
      var pathsplit = path.split('/');
      var photoName = pathsplit[pathsplit.length - 1];
      var photoSplit = photoName.split('_').slice(1);
      var prefix = 'foto';
      if (thumb) {
        prefix = 'thumb';
      }
      var thumbName = prefix+"_"+photoSplit.join('_');
      return this.basePhotoUrl + '/' + thumbName;
    },
    getLabel: function(layerName){
      return this.labels_territorio[layerName].denominazione;
    },
    getOrBlank: function(path) {
      var value = _.get(this,path);
      return (value && value != '') ? value : '-';
    },
    goto: function(layer,value) {
      switch (layer.id) {
        case 'varianti':
          GUI.hideListing();
          var lotto = this.lotto;
          var day = this.day;
          RouterService.goto('dashboard/corsevariante/'+value+'?day='+this.day);
          break;
        case 'paline':
          GUI.hideListing();
          var day = this.day;
          RouterService.goto('dashboard/fermata/'+value+'?day='+day);
          break;
      }
    },
    showVariante: function(id_variante) {
      GUI.hideListing();
      var lotto = this.lotto;
      var day = this.day;
      RouterService.goto('dashboard/varianti/'+this.lotto+'/###/'+id_variante+'?day='+this.day);
    },
    showFermata: function(id_fermata) {
      GUI.hideListing();
      var day = this.day;
      RouterService.goto('dashboard/fermata/'+id_fermata+'?day='+day);
    }
  }
})

var TplQueryResultsPanel = function(context){
  this.panelComponent = null;
  this.context = context;
  
  this.onShow = function(container){
    var self = this;
    var panel = this.panelComponent = new TplQueryResultsComponent();
    panel.layers = [];
    panel.labels_territorio = null;
    
    var layerData = _.keyBy(context.layersResults,'id');
    
    var territorial_details = {};
    var layers_labels_territorio = ['province','comuni','bacini','localita'];
    
    _.forEach(layers_labels_territorio,function(layerName){
      if (layerData[layerName].features && layerData[layerName].features.length) {
        territorial_details[layerName] =  layerData[layerName].features[0].attributes
      }
    });
    
    panel.lotto = context.lottoId;
    panel.day = context.day;
    panel.territorial_details = territorial_details;   
    
    var layersFromApi = ['varianti'];
    
    this.queryVarianti(this.context)
    .then(function(features){
      panel.layers.push({
        title: 'Varianti',
        id: 'varianti',
        attributes: ProjectService.getLayerByName('varianti').attributes,
        features: features
      })
    });
    
    var excludedLayers = _.concat(layers_labels_territorio,layersFromApi);
    var queryableLayers = _.filter(this.context.queryableLayers,function(layer){
      return excludedLayers.indexOf(layer.name) == -1;
    });
    
    _.forEach(queryableLayers,function(queryableLayer){
        var features = self.processResults(queryableLayer.name,self.context)
        panel.layers.push({
          title: queryableLayer.title,
          id: queryableLayer.name,
          attributes: queryableLayer.attributes,
          features: features
        });
    })

    panel.basePhotoUrl = context.urls.basePhotoUrl;
    
    panel.$mount().$appendTo(container);
    
    return resolvedValue(true);
  };
  
  this.onClose = function(){
    this.panelComponent.$destroy(true);
    this.panelComponent = null;
    return resolvedValue(true);
  };
  
  this.processResults = function(layerName,context) {
    var layerData = _.keyBy(context.layersResults,'id');
    var features = [];
    if (layerData[layerName]) {
      features = layerData[layerName].features;
    }
    return features;
  };
  
  this.queryVarianti = function(context){
    return ApiService.get('VARIANTIQUERYMAP',{
      params: {
        day: context.day,
        lotto: context.lottoId,
        coords: context.coordinates.join(','),
        res: context.resolution
      }
    })
    .then(function(response){
      return _.map(response,function(rowData){
        return {
          attributes: rowData
        }
      })
    });
  }
}
inherit(TplQueryResultsPanel,G3WObject);

module.exports = TplQueryResultsPanel;

*/

},{"./queryresults.html":67,"core/g3wobject":13,"core/utils/utils":34,"gui/queryresults/queryresultsservice":66,"gui/vue/component":77}],69:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var GUI = require('gui/gui');
var ProjectsRegistry = require('core/project/projectsregistry');
var G3WObject = require('core/g3wobject');
var SearchPanel = require('gui/search/vue/panel/searchpanel');

function SearchesService(){
  var self = this;
  //this._searchPanelService = new SearchPanelService();
  this.init = function(searchesObject) {
    var searches = searchesObject || ProjectsRegistry.getCurrentProject().state.search;
    this.state.searches = searches;
  };
  this.state = {
    searches: []
  };

  this.showSearchPanel = function(panelConfig) {
    var panel =  new SearchPanel();// creo panello search
    panel.init(panelConfig);//inizializzo pannello se
    GUI.showPanel(panel);
    return panel;
  };

  this.cleanSearchPanels = function() {
    this.state.panels = {};
  };

  this.stop = function(){
    var deferred = $.Deferred();
    deferred.resolve();
    return deferred.promise();
  };

};

// Make the public service en Event Emitter
inherit(SearchesService, G3WObject);

module.exports = SearchesService;

},{"core/g3wobject":13,"core/project/projectsregistry":27,"core/utils/utils":34,"gui/gui":58,"gui/search/vue/panel/searchpanel":71}],70:[function(require,module,exports){
module.exports = "<div class=\"g3w-search-panel form-group\">\n  <h3>{{title}}</h3>\n  <form id=\"g3w-search-form\">\n    <template v-for=\"forminput in forminputs\">\n      <div v-if=\"forminput.input.type == 'numberfield'\" class=\"form-group numeric\">\n        <label for=\"{{ forminput.id }} \">{{ forminput.label }}</label>\n        <input type=\"number\" v-model=\"formInputValues[$index].value\" class=\"form-control\" id=\"{{ forminput.id }}\">\n      </div>\n      <div v-if=\"forminput.input.type == 'textfield'\" class=\"form-group text\">\n        <label for=\"{{ forminput.id }}\">{{ forminput.label }}</label>\n        <input type=\"text\" v-model=\"formInputValues[$index].value\" class=\"form-control\" id=\"{{ forminput.id }}\">\n      </div>\n    </template>\n    <div class=\"form-group\">\n      <button class=\"btn btn-primary pull-right\" @click=\"doSearch($event)\" data-i18n=\"dosearch\">Search</button>\n    </div>\n  </form>\n</div>\n";

},{}],71:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var localize = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var GUI = require('gui/gui');
var QueryService = require('core/query/queryservice');
var ListPanel = require('gui/listpanel').ListPanel;
var Panel = require('gui/panel');
var ProjectsRegistry = require('core/project/projectsregistry');

//componente vue pannello search
var SearchPanelComponet = Vue.extend({
  template: require('./searchpanel.html'),
  data: function() {
    return {
      title: "",
      forminputs: [],
      filterObject: {},
      formInputValues : []
    }
  },
  methods: {
    doSearch: function(event) {
      var self = this;
      event.preventDefault();
      //al momento molto farragginoso ma da rivedere
      //per associazione valore input
      var showQueryResults = GUI.showResultsFactory('query');
      var queryResultsPanel = showQueryResults(self.title);
      this.filterObject = this.fillFilterInputsWithValues(this.filterObject, this.formInputValues);
      QueryService.queryByFilter(this.filterObject)
      .then(function(results){
        queryResultsPanel.setQueryResponse(results);
      })
    }
  }
});

//costruttore del pannello e del suo componente vue
function SearchPanel() {
  self = this;
  this.config = {};
  this.filter = {};
  this.id = null;
  this.querylayerid = null;
  this.internalPanel = new SearchPanelComponet();
  //funzione inizializzazione
  this.init = function(config) {
    this.config = config || {};
    this.name = this.config.name || this.name;
    this.id = this.config.id || this.id;
    this.filter = this.config.options.filter || this.filter;
    var queryLayerId = this.config.options.querylayerid || this.querylayerid;
    this.queryLayer = ProjectsRegistry.getCurrentProject().getLayerById(queryLayerId);
    //vado a riempire gli input del form del pannello
    this.fillInputsFormFromFilter();
    //creo e assegno l'oggetto filtro
    var filterObjFromConfig = QueryService.createQueryFilterFromConfig(this.filter);
    //alla fine creo l'ggetto finale del filtro da passare poi al provider QGISWMS o WFS etc.. che contiene sia
    //il filtro che url, il nome del layer il tipo di server etc ..
    this.internalPanel.filterObject = QueryService.createQueryFilterObject(this.queryLayer, filterObjFromConfig);
    //soluzione momentanea assegno  la funzione del SearchPanle ma come pattern è sbagliato
    //vorrei delegarlo a SearchesService ma lo stesso stanzia questo (loop) come uscirne???
    //creare un searchpanelservice?
    this.internalPanel.fillFilterInputsWithValues = this.fillFilterInputsWithValues;
    this.internalPanel.title = this.name;
  };
  //funzione che popola gli inputs che ci saranno nel form del pannello ricerca
  //oltre costruire un oggetto che legherà i valori degli inputs del form con gli oggetti
  //'operazionali' del filtro
  this.fillInputsFormFromFilter = function() {
    var id = 0;
    var formValue;
    _.forEach(this.filter,function(v,k,obj) {
      _.forEach(v, function(input){
        //sempre nuovo oggetto
        formValue = {};
        //inserisco l'id all'input
        input.id = id
        //aggiungo il tipo al valore per fare conversione da stringa a tipo input
        formValue.type = input.input.type;
        ////TEMPORANEO !!! DEVO PRENDERE IL VERO VALORE DI DEFAULT
        formValue.value = null;
        //popolo gli inputs:
        // valori
        self.internalPanel.formInputValues.push(formValue);
        //input
        self.internalPanel.forminputs.push(input);
        id+=1;
      });
    });
  };
  //funzione che associa i valori dell'inputs form al relativo oggetto "operazionde del filtro"
  this.fillFilterInputsWithValues = function(filterObject, formInputValues, globalIndex) {
    //funzione conversione da valore restituito dall'input (sempre stringa) al vero tipo di valore
    function convertInputValueToInputType(type, value) {
      switch(type) {
        case 'numberfield':
             value = parseInt(value);
             break;
        default:
             break;
      }
      return value;
    }
    //ciclo sull'oggetto filtro che ha come chiave root 'AND' o 'OR'
    _.forEach(filterObject.filterObject, function(v,k) {
      //scorro attraverso l'array di elementi operazionali da confrontare
      _.forEach(v, function(input, idx) {
        //elemento operazionale {'=':{}}
        _.forEach(input, function(v, k, obj) {
          //vado a leggere l'oggetto attributo
          if (_.isArray(v)) {
            //richiama la funzione ricorsivamente .. andrà bene ?
            fillFilterInputsWithValues(input, formInputValues, idx);
          } else {
            _.forEach(v, function(v, k, obj) {
              //considero l'index globale in modo che inputs di operazioni booleane interne
              //vengono considerate
              index = (globalIndex) ? globalIndex + idx : idx;
              obj[k] = convertInputValueToInputType(formInputValues[index].type, formInputValues[index].value);
            });
          };
        });
      });
    });
    return filterObject;
  };
};

inherit(SearchPanel, Panel);
module.exports = SearchPanel;

},{"./searchpanel.html":70,"core/i18n/i18n.service":16,"core/project/projectsregistry":27,"core/query/queryservice":31,"core/utils/utils":34,"gui/gui":58,"gui/listpanel":60,"gui/panel":65}],72:[function(require,module,exports){
module.exports = "<div id=\"g3w-search\" class=\"g3w-search g3w-tools\">\n  <ul>\n    <li v-for=\"search in project.search\">\n      <div class=\"search-header tool-header\" @click=\"showSearchPanel(search)\">\n        <span style=\"\">{{ search.name }}</span>\n      </div>\n    </li>\n  </ul>\n</div>\n";

},{}],73:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var t = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var Component = require('gui/vue/component');
var GUI = require('gui/gui');
var ProjectsRegistry = require('core/project/projectsregistry');
var G3WObject = require('core/g3wobject');
var SearchPanel = require('gui/search/vue/panel/searchpanel');
var ProjectsRegistry = require('core/project/projectsregistry');
var SearchesService = require('gui/search/searchesservice');

var vueComponentOptions = {
   template: require('./search.html'),
   data: function() {
    	return {
    	  project: ProjectsRegistry.getCurrentProject().state
    	};
   },
   methods: {
    showSearchPanel: function(search) {
        var panel = this.$options.searchesService.showSearchPanel(search);
    }
  }
};

// se lo voglio istanziare manualmente
var InternalComponent = Vue.extend(vueComponentOptions);
// se lo voglio usare come componente come elemento html
//Vue.component('g3w-search',vueComponentOptions);

/* COMPONENTI FIGLI */
/* FINE COMPONENTI FIGLI */

/* INTERFACCIA PUBBLICA */
function SearchComponent(options){
  base(this,options);
  this.id = "search-component";
  this.title = "search";
  this._service = new SearchesService();
  this.internalComponent = new InternalComponent({
    searchesService: this._service
  });
  this.state.visible = ProjectsRegistry.getCurrentProject().state.search.length > 0;
  merge(this, options);
  this.initService = function() {
    //inizializzo il servizio
    this._service.init();
  };
};

inherit(SearchComponent, Component);
module.exports = SearchComponent;

},{"./search.html":72,"core/g3wobject":13,"core/i18n/i18n.service":16,"core/project/projectsregistry":27,"core/utils/utils":34,"gui/gui":58,"gui/search/searchesservice":69,"gui/search/vue/panel/searchpanel":71,"gui/vue/component":77}],74:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

function ToolsService(){
  var self = this;
  this.config = null;
  this._actions = {};
  this.state = {
    toolsGroups: []
  };
  
  this.setters = {
    addToolGroup: function(group) {
      self.state.toolsGroups.push(group);
    }
  };
  
  this.addTools = function(groupName, tools) {
    var self = this;
    var group = this._getToolsGroup(groupName);
    if (!group) {
      group = {
        name: groupName,
        tools: []
      };
      this.addToolGroup(group);
    }
    _.forEach(tools,function(tool){
      group.tools.push(tool);
      self._addAction(tool);
    });
  };
  
  this.removeTool = function(toolId) {
  };
  
  this.fireAction = function(actionId){
    var action = this._actions[actionId];
    action();
  };
  
  this._getToolsGroup = function(groupName) {
    var group = null;
    _.forEach(this.state.toolsGroups,function(_group){
      if (_group.name == groupName) {
        group = _group;
      }
    });
    return group;
  };
  
  this._addAction = function(tool) {
    var actionId = Math.floor(Math.random() * 1000000)+1;
    tool.actionId = actionId;
    this._actions[actionId] = tool.action;
  };
  
  base(this);
}

inherit(ToolsService, G3WObject);

module.exports = ToolsService;

},{"core/g3wobject":13,"core/utils/utils":34}],75:[function(require,module,exports){
module.exports = "<div class=\"g3w-tools\">\n  <ul>\n    <li v-for=\"group in state.toolsGroups\">\n      <div class=\"tool-header\">\n        <span style=\"\">{{ group.name }}</span>\n      </div>\n      <div id=\"{{ group.name }}-tools\" class=\"tool-box\">\n        <template v-for=\"tool in group.tools\">\n          <div v-if=\"tool.type == 'checkbox' \" class=\"checkbox tool\">\n            <label><input type=\"checkbox\" @click=\"fireAction(tool.actionId)\" value=\"\">{{ tool.name }}</label>\n          </div>\n          <div class=\"tool\" v-else>\n            <i class=\"glyphicon glyphicon-cog\"></i>\n            <span @click=\"fireAction(tool.actionId)\">{{ tool.name }}</span>\n          </div>\n        </template>\n      </div>\n    </li>\n  </ul>\n</div>\n";

},{}],76:[function(require,module,exports){
var t = require('core/i18n/i18n.service').t;
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var Component = require('gui/vue/component');
var ToolsService = require('gui/tools/toolsservice');

var InternalComponent = Vue.extend({
    template: require('./tools.html'),
    data: function() {
      return {
        state: null
      }
    },
    methods: {
      fireAction: function(actionid){
        this.$options.toolsService.fireAction(actionid);
      }
    }
});

function ToolsComponent(options){
  base(this,options);
  var self = this;
  this._service = new ToolsService();
  this.id = "tools-component";
  this.title = "tools";
  this.state.visible = false;
  this._service.onafter('addToolGroup',function(){
    self.state.visible = self._service.state.toolsGroups.length > 0;
  })
  merge(this, options);
  this.internalComponent = new InternalComponent({
    toolsService: this._service
  });
  //sostituisco lo state del servizio allo state del componente vue interno
  this.internalComponent.state = this._service.state
};

inherit(ToolsComponent, Component);

var proto = ToolsComponent.prototype;

module.exports = ToolsComponent;

},{"./tools.html":75,"core/i18n/i18n.service":16,"core/utils/utils":34,"gui/tools/toolsservice":74,"gui/vue/component":77}],77:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var BaseComponent = require('gui/component');

var Component = function(options) {
  base(this,options);
};

inherit(Component, BaseComponent);

var proto = Component.prototype;

// viene richiamato dalla toolbar quando il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.mount = function(parent,append) {
  if (!this.internalComponent) {
    this.setInternalComponent();
  };
  if(append) {
    this.internalComponent.$mount().$appendTo(parent);
  }
  else {
    this.internalComponent.$mount(parent);
  }
  $(parent).localize();
  return resolve(true);
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.unmount = function() {
  // il problema che distruggere
  this.internalComponent.$destroy(true);
  this.internalComponent = null;
  return resolve();
};

proto.hide = function() {

};

module.exports = Component;

},{"core/utils/utils":34,"gui/component":54}],78:[function(require,module,exports){
var g3w = g3w || {};

g3w.core = {
   G3WObject: require('core/g3wobject'),
   utils: require('core/utils/utils'),
   ApplicationService: require('core/applicationservice'),
   ApiService: require('core/apiservice'),
   Router: require('core/router'),
   ProjectsRegistry: require('core/project/projectsregistry'),
   Project: require('core/project/project'),
   QueryService: require('core/query/queryservice'),
   MapLayer: require('core/map/layer/maplayer'),
   VectorLayer: require('core/map/layer/vectorlayer'),
   WmsLayer: require('core/map/layer/wmslayer'),
   VectorLayerLoader: require('core/map/layer/loader/vectorloaderlayer'),
   Geometry: require('core/geometry/geometry'),
   geom: require('core/geometry/geom'),
   PickCoordinatesInteraction: require('g3w-ol3/src/interactions/pickcoordinatesinteraction'),
   PickFeatureInteraction: require('g3w-ol3/src/interactions/pickfeatureinteraction'),
   i18n: require('core/i18n/i18n.service'),
   Plugin: require('core/plugin/plugin'),
   PluginsRegistry: require('core/plugin/pluginsregistry'),
   Editor: require('core/editing/editor')
};

g3w.gui = {
  GUI: require('gui/gui'),
  Form: require('gui/form').Form,
  FormPanel: require('gui/form').FormPanel,
  Panel: require('gui/panel'),
  vue: {
    //GeocodingComponent: require('gui/vue/geocoding/geocoding'),
    SearchComponent: require('gui/search/vue/search'),
    CatalogComponent: require('gui/catalog/vue/catalog'),
    MapComponent: require('gui/map/vue/map'),
    ToolsComponent: require('gui/tools/vue/tools'),
    QueryResultsComponent : require('gui/queryresults/vue/queryresults')
  }
};

module.exports = {
  core: g3w.core,
  gui: g3w.gui
};

},{"core/apiservice":1,"core/applicationservice":2,"core/editing/editor":4,"core/g3wobject":13,"core/geometry/geom":14,"core/geometry/geometry":15,"core/i18n/i18n.service":16,"core/map/layer/loader/vectorloaderlayer":18,"core/map/layer/maplayer":19,"core/map/layer/vectorlayer":20,"core/map/layer/wmslayer":21,"core/plugin/plugin":23,"core/plugin/pluginsregistry":24,"core/project/project":25,"core/project/projectsregistry":27,"core/query/queryservice":31,"core/router":32,"core/utils/utils":34,"g3w-ol3/src/interactions/pickcoordinatesinteraction":43,"g3w-ol3/src/interactions/pickfeatureinteraction":44,"gui/catalog/vue/catalog":50,"gui/form":56,"gui/gui":58,"gui/map/vue/map":64,"gui/panel":65,"gui/queryresults/vue/queryresults":68,"gui/search/vue/search":73,"gui/tools/vue/tools":76}]},{},[78])(78)
});


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjb3JlL2FwaXNlcnZpY2UuanMiLCJjb3JlL2FwcGxpY2F0aW9uc2VydmljZS5qcyIsImNvcmUvZWRpdGluZy9lZGl0YnVmZmVyLmpzIiwiY29yZS9lZGl0aW5nL2VkaXRvci5qcyIsImNvcmUvZWRpdGluZy9yZWxhdGlvbmVkaXRidWZmZXIuanMiLCJjb3JlL2VkaXRpbmcvdG9vbHMvYWRkZmVhdHVyZXRvb2wuanMiLCJjb3JlL2VkaXRpbmcvdG9vbHMvY3V0bGluZXRvb2wuanMiLCJjb3JlL2VkaXRpbmcvdG9vbHMvZGVsZXRlZmVhdHVyZXRvb2wuanMiLCJjb3JlL2VkaXRpbmcvdG9vbHMvZWRpdGluZ3Rvb2wuanMiLCJjb3JlL2VkaXRpbmcvdG9vbHMvbW9kaWZ5ZmVhdHVyZXRvb2wuanMiLCJjb3JlL2VkaXRpbmcvdG9vbHMvbW92ZXBvaW50dG9vbC5qcyIsImNvcmUvZWRpdGluZy90b29scy9waWNrZmVhdHVyZXRvb2wuanMiLCJjb3JlL2czd29iamVjdC5qcyIsImNvcmUvZ2VvbWV0cnkvZ2VvbS5qcyIsImNvcmUvZ2VvbWV0cnkvZ2VvbWV0cnkuanMiLCJjb3JlL2kxOG4vaTE4bi5zZXJ2aWNlLmpzIiwiY29yZS9tYXAvbGF5ZXIvbG9hZGVyL2xvYWRlcmxheWVyc2VydmljZS5qcyIsImNvcmUvbWFwL2xheWVyL2xvYWRlci92ZWN0b3Jsb2FkZXJsYXllci5qcyIsImNvcmUvbWFwL2xheWVyL21hcGxheWVyLmpzIiwiY29yZS9tYXAvbGF5ZXIvdmVjdG9ybGF5ZXIuanMiLCJjb3JlL21hcC9sYXllci93bXNsYXllci5qcyIsImNvcmUvbWFwL21hcHNyZWdpc3RyeS5qcyIsImNvcmUvcGx1Z2luL3BsdWdpbi5qcyIsImNvcmUvcGx1Z2luL3BsdWdpbnNyZWdpc3RyeS5qcyIsImNvcmUvcHJvamVjdC9wcm9qZWN0LmpzIiwiY29yZS9wcm9qZWN0L3Byb2plY3RsYXllci5qcyIsImNvcmUvcHJvamVjdC9wcm9qZWN0c3JlZ2lzdHJ5LmpzIiwiY29yZS9wcm9qZWN0L3Byb2plY3R0eXBlcy5qcyIsImNvcmUvcXVlcnkvcXVlcnlRR0lTV01TUHJvdmlkZXIuanMiLCJjb3JlL3F1ZXJ5L3F1ZXJ5V0ZTUHJvdmlkZXIuanMiLCJjb3JlL3F1ZXJ5L3F1ZXJ5c2VydmljZS5qcyIsImNvcmUvcm91dGVyLmpzIiwiY29yZS91dGlscy9nZW8uanMiLCJjb3JlL3V0aWxzL3V0aWxzLmpzIiwiZzN3LW9sMy9zcmMvY29udHJvbHMvY29udHJvbC5qcyIsImczdy1vbDMvc3JjL2NvbnRyb2xzL2ludGVyYWN0aW9uY29udHJvbC5qcyIsImczdy1vbDMvc3JjL2NvbnRyb2xzL29sY29udHJvbC5qcyIsImczdy1vbDMvc3JjL2NvbnRyb2xzL3F1ZXJ5Y29udHJvbC5qcyIsImczdy1vbDMvc3JjL2NvbnRyb2xzL3Jlc2V0Y29udHJvbC5qcyIsImczdy1vbDMvc3JjL2NvbnRyb2xzL3pvb21ib3hjb250cm9sLmpzIiwiZzN3LW9sMy9zcmMvZzN3Lm9sMy5qcyIsImczdy1vbDMvc3JjL2ludGVyYWN0aW9ucy9kZWxldGVmZWF0dXJlaW50ZXJhY3Rpb24uanMiLCJnM3ctb2wzL3NyYy9pbnRlcmFjdGlvbnMvcGlja2Nvb3JkaW5hdGVzaW50ZXJhY3Rpb24uanMiLCJnM3ctb2wzL3NyYy9pbnRlcmFjdGlvbnMvcGlja2ZlYXR1cmVpbnRlcmFjdGlvbi5qcyIsImczdy1vbDMvc3JjL2xheWVycy9iYXNlcy5qcyIsImczdy1vbDMvc3JjL2xheWVycy9yYXN0ZXJzLmpzIiwiZzN3LW9sMy9zcmMvbWFwL21hcGhlbHBlcnMuanMiLCJnM3ctb2wzL3NyYy91dGlscy5qcyIsImd1aS9jYXRhbG9nL3Z1ZS9jYXRhbG9nLmh0bWwiLCJndWkvY2F0YWxvZy92dWUvY2F0YWxvZy5qcyIsImd1aS9jYXRhbG9nL3Z1ZS9sZWdlbmQuaHRtbCIsImd1aS9jYXRhbG9nL3Z1ZS9sZWdlbmRfaXRlbS5odG1sIiwiZ3VpL2NhdGFsb2cvdnVlL3RyaXN0YXRlLXRyZWUuaHRtbCIsImd1aS9jb21wb25lbnQuanMiLCJndWkvY29tcG9uZW50c3JlZ2lzdHJ5LmpzIiwiZ3VpL2Zvcm0uanMiLCJndWkvZm9ybXBhbmVsLmh0bWwiLCJndWkvZ3VpLmpzIiwiZ3VpL2xpc3RwYW5lbC5odG1sIiwiZ3VpL2xpc3RwYW5lbC5qcyIsImd1aS9tYXAvY29udHJvbC9mYWN0b3J5LmpzIiwiZ3VpL21hcC9tYXBzZXJ2aWNlLmpzIiwiZ3VpL21hcC92dWUvbWFwLmh0bWwiLCJndWkvbWFwL3Z1ZS9tYXAuanMiLCJndWkvcGFuZWwuanMiLCJndWkvcXVlcnlyZXN1bHRzL3F1ZXJ5cmVzdWx0c3NlcnZpY2UuanMiLCJndWkvcXVlcnlyZXN1bHRzL3Z1ZS9xdWVyeXJlc3VsdHMuaHRtbCIsImd1aS9xdWVyeXJlc3VsdHMvdnVlL3F1ZXJ5cmVzdWx0cy5qcyIsImd1aS9zZWFyY2gvc2VhcmNoZXNzZXJ2aWNlLmpzIiwiZ3VpL3NlYXJjaC92dWUvcGFuZWwvc2VhcmNocGFuZWwuaHRtbCIsImd1aS9zZWFyY2gvdnVlL3BhbmVsL3NlYXJjaHBhbmVsLmpzIiwiZ3VpL3NlYXJjaC92dWUvc2VhcmNoLmh0bWwiLCJndWkvc2VhcmNoL3Z1ZS9zZWFyY2guanMiLCJndWkvdG9vbHMvdG9vbHNzZXJ2aWNlLmpzIiwiZ3VpL3Rvb2xzL3Z1ZS90b29scy5odG1sIiwiZ3VpL3Rvb2xzL3Z1ZS90b29scy5qcyIsImd1aS92dWUvY29tcG9uZW50LmpzIiwic2RrLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdk5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDek1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDektBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25VQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdOQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlaQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsbkJBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgcmVqZWN0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlamVjdDtcblxuZnVuY3Rpb24gQXBpU2VydmljZSgpe1xuICB0aGlzLl9jb25maWcgPSBudWxsO1xuICB0aGlzLl9iYXNlVXJsID0gbnVsbDtcbiAgdGhpcy5fYXBpVXJscyA9IHt9O1xuICBcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oY29uZmlnKSB7XG5cbiAgICB0aGlzLl9jb25maWcgPSBjb25maWc7XG4gICAgdGhpcy5fYmFzZVVybCA9IGNvbmZpZy51cmxzLmFwaTtcbiAgICB0aGlzLl9hcGlFbmRwb2ludHMgPSBjb25maWcudXJscy5hcGlFbmRwb2ludHM7XG4gIH07XG4gIFxuICB2YXIgaG93TWFueUFyZUxvYWRpbmcgPSAwO1xuICB0aGlzLl9pbmNyZW1lbnRMb2FkZXJzID0gZnVuY3Rpb24oKXtcbiAgICBpZiAoaG93TWFueUFyZUxvYWRpbmcgPT0gMCl7XG4gICAgICB0aGlzLmVtaXQoJ2FwaXF1ZXJ5c3RhcnQnKTtcbiAgICB9XG4gICAgaG93TWFueUFyZUxvYWRpbmcgKz0gMTtcbiAgfTtcbiAgXG4gIHRoaXMuX2RlY3JlbWVudExvYWRlcnMgPSBmdW5jdGlvbigpe1xuICAgIGhvd01hbnlBcmVMb2FkaW5nIC09IDE7XG4gICAgaWYgKGhvd01hbnlBcmVMb2FkaW5nID09IDApe1xuICAgICAgdGhpcy5lbWl0KCdhcGlxdWVyeWVuZCcpO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuZ2V0ID0gZnVuY3Rpb24oYXBpLCBvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBhcGlFbmRQb2ludCA9IHRoaXMuX2FwaUVuZHBvaW50c1thcGldO1xuICAgIGlmIChhcGlFbmRQb2ludCkge1xuICAgICAgdmFyIGNvbXBsZXRlVXJsID0gdGhpcy5fYmFzZVVybCArICcvJyArIGFwaUVuZFBvaW50O1xuICAgICAgaWYgKG9wdGlvbnMucmVxdWVzdCkge1xuICAgICAgICAgY29tcGxldGVVcmwgPSBjb21wbGV0ZVVybCArICcvJyArIG9wdGlvbnMucmVxdWVzdDtcbiAgICAgIH1cbiAgICAgIHZhciBwYXJhbXMgPSBvcHRpb25zLnBhcmFtcyB8fCB7fTtcbiAgICAgIFxuICAgICAgc2VsZi5lbWl0KGFwaSsncXVlcnlzdGFydCcpO1xuICAgICAgdGhpcy5faW5jcmVtZW50TG9hZGVycygpO1xuICAgICAgcmV0dXJuICQuZ2V0KGNvbXBsZXRlVXJsLHBhcmFtcylcbiAgICAgIC5kb25lKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgc2VsZi5lbWl0KGFwaSsncXVlcnllbmQnLHJlc3BvbnNlKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKGUpe1xuICAgICAgICBzZWxmLmVtaXQoYXBpKydxdWVyeWZhaWwnLGUpO1xuICAgICAgICByZXR1cm4gZTtcbiAgICAgIH0pXG4gICAgICAuYWx3YXlzKGZ1bmN0aW9uKCl7XG4gICAgICAgIHNlbGYuX2RlY3JlbWVudExvYWRlcnMoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiByZWplY3QoKTtcbiAgICB9XG4gIH07XG4gIFxuICBiYXNlKHRoaXMpO1xufVxuaW5oZXJpdChBcGlTZXJ2aWNlLEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEFwaVNlcnZpY2U7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xudmFyIEFwaVNlcnZpY2UgPSByZXF1aXJlKCdjb3JlL2FwaXNlcnZpY2UnKTtcbnZhciBSb3V0ZXJTZXJ2aWNlID0gcmVxdWlyZSgnY29yZS9yb3V0ZXInKTtcbnZhciBQcm9qZWN0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3RzcmVnaXN0cnknKTtcbnZhciBQbHVnaW5zUmVnaXN0cnkgPSByZXF1aXJlKCdjb3JlL3BsdWdpbi9wbHVnaW5zcmVnaXN0cnknKTtcblxudmFyIEFwcGxpY2F0aW9uU2VydmljZSA9IGZ1bmN0aW9uKCl7XG4gIHRoaXMuc2VjcmV0ID0gXCIjIyMgRzNXIENsaWVudCBBcHBsaWNhdGlvbiBTZXJ2aWNlICMjI1wiO1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMucmVhZHkgPSBmYWxzZTtcbiAgdGhpcy5jb21wbGV0ZSA9IGZhbHNlO1xuICB0aGlzLl9tb2RhbE92ZXJsYXkgPSBudWxsO1xuICB0aGlzLl9hY3F1aXJlUG9zdEJvb3N0cmFwID0gZmFsc2U7XG4gIHRoaXMuY29uZmlnID0ge307XG5cbiAgLy8gY2hpYW1hIGlsIGNvc3RydXR0b3JlIGRpIEczV09iamVjdCAoY2hlIGluIHF1ZXN0byBtb21lbnRvIG5vbiBmYSBuaWVudGUpXG4gIGJhc2UodGhpcyk7XG4gIFxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcsIGFjcXVpcmVQb3N0Qm9vc3RyYXApe1xuICAgIHRoaXMuX2NvbmZpZyA9IGNvbmZpZztcbiAgICBpZiAoYWNxdWlyZVBvc3RCb29zdHJhcCkge1xuICAgICAgdGhpcy5fYWNxdWlyZVBvc3RCb29zdHJhcCA9IHRydWU7XG4gICAgfVxuICAgIHRoaXMuX2Jvb3RzdHJhcCgpO1xuICB9O1xuICBcbiAgdGhpcy5nZXRDb25maWcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fY29uZmlnO1xuICB9O1xuICBcbiAgdGhpcy5nZXRSb3V0ZXJTZXJ2aWNlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFJvdXRlclNlcnZpY2U7XG4gIH07XG4gIFxuICB0aGlzLnBvc3RCb290c3RyYXAgPSBmdW5jdGlvbigpIHtcblxuICAgIGlmICghdGhpcy5jb21wbGV0ZSkge1xuICAgICAgUm91dGVyU2VydmljZS5pbml0KCk7XG4gICAgICB0aGlzLmNvbXBsZXRlID0gdHJ1ZTtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLl9ib290c3RyYXAgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvL25lbCBjYXNvIGluIGN1aSAocHJpbWEgdm9sdGEpIGwnYXBwbGljYXRpb24gc2VydmljZSBub24gw6ggcHJvbnRhXG4gICAgLy9mYWNjaW8gdW5hIHNlcmllIGRpIGNvc2VcbiAgICBpZiAoIXRoaXMucmVhZHkpIHtcbiAgICAgIC8vIEluaXppYWxpenphIGxhIGNvbmZpZ3VyYXppb25lIGRlaSBzZXJ2aXppLlxuICAgICAgLy8gT2dudW5nbyBjZXJjaGVyw6AgZGFsIGNvbmZpZyBxdWVsbG8gZGkgY3VpIGF2csOgIGJpc29nbm9cbiAgICAgIC8vIHVuYSB2b2x0YSBmaW5pdGEgbGEgY29uZmlndXJhemlvbmUgZW1ldHRvIGwnZXZlbnRvIHJlYWR5LlxuICAgICAgLy8gQSBxdWVzdG8gcHVudG8gcG90csOyIGF2dmlhcmUgbCdpc3RhbnphIFZ1ZSBnbG9iYWxlXG4gICAgICAkLndoZW4oXG4gICAgICAgIEFwaVNlcnZpY2UuaW5pdCh0aGlzLl9jb25maWcpLFxuICAgICAgICBQcm9qZWN0c1JlZ2lzdHJ5LmluaXQodGhpcy5fY29uZmlnKVxuICAgICAgKS50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgIFBsdWdpbnNSZWdpc3RyeS5pbml0KHtcbiAgICAgICAgICBwbHVzaW5nQmFzZVVybDogc2VsZi5fY29uZmlnLnVybHMuc3RhdGljdXJsLFxuICAgICAgICAgIHBsdWdpbnNDb25maWdzOiBzZWxmLl9jb25maWcucGx1Z2luc1xuICAgICAgICB9KTtcbiAgICAgICAgc2VsZi5lbWl0KCdyZWFkeScpO1xuICAgICAgICBpZiAoIXNlbGYuX2FjcXVpcmVQb3N0Qm9vc3RyYXApIHtcbiAgICAgICAgICBzZWxmLnBvc3RCb290c3RyYXAoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH07XG59O1xuaW5oZXJpdChBcHBsaWNhdGlvblNlcnZpY2UsRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQXBwbGljYXRpb25TZXJ2aWNlO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xudmFyIFJlbGF0aW9uRWRpdEJ1ZmZlciA9IHJlcXVpcmUoJy4vcmVsYXRpb25lZGl0YnVmZmVyJyk7XG5cbmZ1bmN0aW9uIEVkaXRCdWZmZXIoZWRpdG9yKXtcbiAgdGhpcy5fZWRpdG9yID0gZWRpdG9yO1xuICBcbiAgdGhpcy5fb3JpZ1ZlY3RvckxheWVyID0gbmV3IG9sLmxheWVyLlZlY3Rvcih7XG4gICAgc291cmNlOiBuZXcgb2wuc291cmNlLlZlY3RvcigpXG4gIH0pO1xuICB0aGlzLl9jbG9uZUxheWVyKCk7XG4gIFxuICAvL2J1ZmZlciBkZWxsZSBnZW9tZXRyaWVcbiAgdGhpcy5fZ2VvbWV0cmllc0J1ZmZlciA9IHt9O1xuICBcbiAgLy8gYnVmZmVyIGRlZ2xpIGF0dHJpYnV0aVxuICB0aGlzLl9hdHRyaWJ1dGVzQnVmZmVyID0ge307XG4gIFxuICAvLyBidWZmZXIgZGVnbGkgYXR0cmlidXRpIGRlbGxlIHJlbGF6aW9uaVxuICB0aGlzLl9yZWxhdGlvbnNCdWZmZXJzID0gbnVsbDtcbiAgLyp2YXIgcmVsYXRpb25zID0gZWRpdG9yLmdldFZlY3RvckxheWVyKCkuZ2V0UmVsYXRpb25zKCk7XG4gIGlmIChyZWxhdGlvbnMpIHtcbiAgICB0aGlzLl9zZXR1cFJlbGF0aW9uc0J1ZmZlcnMocmVsYXRpb25zKTtcbiAgfSovXG4gIFxufVxuaW5oZXJpdChFZGl0QnVmZmVyLEczV09iamVjdCk7XG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRCdWZmZXI7XG5cbnZhciBwcm90byA9IEVkaXRCdWZmZXIucHJvdG90eXBlO1xuXG5wcm90by5jb21taXQgPSBmdW5jdGlvbigpe1xuICB2YXIgbmV3RmVhdHVyZXMgPSB0aGlzLl9lZGl0b3IuZ2V0RWRpdFZlY3RvckxheWVyKCkuZ2V0RmVhdHVyZXMoKTtcbiAgdGhpcy5fZWRpdG9yLmdldFZlY3RvckxheWVyKCkuYWRkRmVhdHVyZXMobmV3RmVhdHVyZXMpO1xuICB0aGlzLl9lZGl0b3IuZ2V0RWRpdFZlY3RvckxheWVyKCkuY2xlYXIoKTtcbiAgdGhpcy5fY2xlYXJCdWZmZXJzKCk7XG4gIHRoaXMuX2Nsb25lTGF5ZXIoKTtcbn07XG5cbnByb3RvLnVuZG9BbGwgPSBmdW5jdGlvbigpe1xuICB0aGlzLl9yZXNldFZlY3RvckxheWVyKCk7XG4gIHRoaXMuX2NsZWFyQnVmZmVycygpO1xufTtcblxucHJvdG8uZGVzdHJveSA9IGZ1bmN0aW9uKCl7XG4gIHRoaXMuX2NsZWFyQnVmZmVycygpO1xufTtcblxucHJvdG8uZ2VuZXJhdGVJZCA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLl9lZGl0b3IuZ2VuZXJhdGVJZCgpO1xufTtcblxuLypwcm90by5fc2V0dXBSZWxhdGlvbnNCdWZmZXJzID0gZnVuY3Rpb24ocmVsYXRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgXy5mb3JFYWNoKHJlbGF0aW9ucyxmdW5jdGlvbihyZWxhdGlvbil7XG4gICAgdmFyIHJlbGF0aW9uQnVmZmVyID0gUmVsYXRpb25FZGl0QnVmZmVyKHRoaXMuX2VkaXRvcixyZWxhdGlvbi5uYW1lKTtcbiAgICBzZWxmLl9yZWxhdGlvbnNCdWZmZXJzW3JlbGF0aW9uLm5hbWVdID0gcmVsYXRpb25CdWZmZXI7XG4gIH0pXG59Ki9cblxucHJvdG8uYWRkRmVhdHVyZSA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICBpZighZmVhdHVyZS5nZXRJZCgpKXtcbiAgICBmZWF0dXJlLnNldElkKHRoaXMuZ2VuZXJhdGVJZCgpKTtcbiAgfVxuICB0aGlzLl9hZGRFZGl0VG9HZW9tZXRyeUJ1ZmZlcihmZWF0dXJlLCdhZGQnKTtcbiAgY29uc29sZS5sb2coXCJJbnNlcml0YSBudW92YSBmZWF0dXJlOiAoSUQ6IFwiK2ZlYXR1cmUuZ2V0SWQoKStcIiBcIitmZWF0dXJlLmdldEdlb21ldHJ5KCkuZ2V0Q29vcmRpbmF0ZXMoKStcIikgbmVsIGJ1ZmZlclwiKTtcbn07XG5cbnByb3RvLnVwZGF0ZUZlYXR1cmUgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgdGhpcy5fYWRkRWRpdFRvR2VvbWV0cnlCdWZmZXIoZmVhdHVyZSwndXBkYXRlJyk7XG4gIGNvbnNvbGUubG9nKFwiTW9kaWZpY2F0YSBmZWF0dXJlOiAoSUQ6IFwiK2ZlYXR1cmUuZ2V0SWQoKStcIiBcIitmZWF0dXJlLmdldEdlb21ldHJ5KCkuZ2V0Q29vcmRpbmF0ZXMoKStcIikgbmVsIGJ1ZmZlclwiKTtcbn07XG5cbnByb3RvLmRlbGV0ZUZlYXR1cmUgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgdGhpcy5fYWRkRWRpdFRvR2VvbWV0cnlCdWZmZXIoZmVhdHVyZSwnZGVsZXRlJyk7XG4gIGNvbnNvbGUubG9nKFwiUmltb3NzYSBmZWF0dXJlOiAoSUQ6IFwiK2ZlYXR1cmUuZ2V0SWQoKStcIiBcIitmZWF0dXJlLmdldEdlb21ldHJ5KCkuZ2V0Q29vcmRpbmF0ZXMoKStcIikgbmVsIGJ1ZmZlclwiKTtcbn07XG5cbnByb3RvLnVwZGF0ZUZpZWxkcyA9IGZ1bmN0aW9uKGZlYXR1cmUscmVsYXRpb25zQXR0cmlidXRlcyl7XG4gIGlmKCFmZWF0dXJlLmdldElkKCkpe1xuICAgIGZlYXR1cmUuc2V0SWQodGhpcy5nZW5lcmF0ZUlkKCkpO1xuICB9XG4gIHRoaXMuX2FkZEVkaXRUb0F0dHJpYnV0ZXNCdWZmZXIoZmVhdHVyZSxyZWxhdGlvbnNBdHRyaWJ1dGVzKTtcbiAgY29uc29sZS5sb2coXCJNb2RpZmljYXRpIGF0dHJpYnV0aSBmZWF0dXJlOiAoSUQ6IFwiK2ZlYXR1cmUuZ2V0SWQoKStcIilcIik7XG59O1xuXG5wcm90by5nZXRGZWF0dXJlQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGZpZCl7XG4gIGlmKHRoaXMuX2F0dHJpYnV0ZXNCdWZmZXJbZmlkXSl7XG4gICAgcmV0dXJuIHRoaXMuX2F0dHJpYnV0ZXNCdWZmZXJbZmlkXS5zbGljZSgtMSlbMF07XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59O1xuXG5wcm90by5hcmVGZWF0dXJlQXR0cmlidXRlc0VkaXRlZCA9IGZ1bmN0aW9uKGZpZCl7XG4gIGlmICh0aGlzLl9hdHRyaWJ1dGVzQnVmZmVyW2ZpZF0pe1xuICAgIHJldHVybiB0aGlzLl9hdHRyaWJ1dGVzQnVmZmVyW2ZpZF0ubGVuZ3RoID4gLTE7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxucHJvdG8uZ2V0UmVsYXRpb25zQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGZpZCl7XG4gIHJldHVybiB0aGlzLl9yZWxhdGlvbnNBdHRyaWJ1dGVzQnVmZmVyW2ZpZF0uc2xpY2UoLTEpWzBdO1xufTtcblxucHJvdG8uYXJlRmVhdHVyZVJlbGF0aW9uc0VkaXRlZCA9IGZ1bmN0aW9uKGZpZCl7XG4gIF8uZm9yRWFjaCh0aGlzLl9yZWxhdGlvbnNCdWZmZXJzLGZ1bmN0aW9uKHJlbGF0aW9uQnVmZmVyKXtcbiAgICBpZiAocmVsYXRpb25CdWZmZXJbZmlkXSl7XG4gICAgICByZXR1cm4gdGhpcy5fcmVsYXRpb25zQXR0cmlidXRlc0J1ZmZlcltmaWRdLmxlbmd0aCA+IC0xO1xuICAgIH1cbiAgfSkgXG4gIFxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5wcm90by5jb2xsZWN0RmVhdHVyZUlkcyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBnZW9tZXRyaWVzQnVmZmVycyA9IHRoaXMuX2dlb21ldHJpZXNCdWZmZXI7XG4gIHZhciBhdHRyaWJ1dGVzQnVmZmVycyA9IHRoaXMuX2F0dHJpYnV0ZXNCdWZmZXI7XG4gIFxuICB2YXIgbW9kaWZpZWRGaWRzID0gW107XG5cbiAgbW9kaWZpZWRGaWRzID0gXy5jb25jYXQobW9kaWZpZWRGaWRzLF8ua2V5cyhnZW9tZXRyaWVzQnVmZmVycykpO1xuICBtb2RpZmllZEZpZHMgPSBfLmNvbmNhdChtb2RpZmllZEZpZHMsXy5rZXlzKGF0dHJpYnV0ZXNCdWZmZXJzKSk7XG4gIFxuICByZXR1cm4gXy51bmlxKG1vZGlmaWVkRmlkcyk7XG59O1xuXG5wcm90by5jb2xsZWN0RmVhdHVyZXMgPSBmdW5jdGlvbihzdGF0ZSxhc0dlb0pTT04pe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBnZW9tZXRyaWVzQnVmZmVycyA9IHRoaXMuX2dlb21ldHJpZXNCdWZmZXI7XG4gIHZhciBhdHRyaWJ1dGVzQnVmZmVycyA9IHRoaXMuX2F0dHJpYnV0ZXNCdWZmZXI7XG4gIHZhciBhc0dlb0pTT04gPSBhc0dlb0pTT04gfHwgZmFsc2U7XG4gIHZhciBHZW9KU09ORm9ybWF0ID0gbmV3IG9sLmZvcm1hdC5HZW9KU09OKCk7XG4gIFxuICB2YXIgbW9kaWZpZWRGaWRzID0gdGhpcy5jb2xsZWN0RmVhdHVyZUlkcygpO1xuICBcbiAgdmFyIGxheWVyO1xuICBpZiAoc3RhdGUgPT0gJ25ldycpIHtcbiAgICBsYXllciA9IHNlbGYuX2VkaXRvci5nZXRFZGl0VmVjdG9yTGF5ZXIoKTtcbiAgfVxuICBlbHNlIHtcbiAgICBsYXllciA9IHNlbGYuX2VkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICB9XG4gIFxuICB2YXIgZmVhdHVyZXMgPSBbXTtcbiAgXy5mb3JFYWNoKG1vZGlmaWVkRmlkcyxmdW5jdGlvbihmaWQpe1xuICAgIFxuICAgIHZhciBmZWF0dXJlID0gbGF5ZXIuZ2V0RmVhdHVyZUJ5SWQoZmlkKTtcbiAgICB2YXIgaXNOZXcgPSBzZWxmLl9pc05ld0ZlYXR1cmUoZmlkKTtcbiAgICB2YXIgYWRkZWRGZWF0dXJlID0gKHN0YXRlID09ICduZXcnICYmIGlzTmV3ICYmIGZlYXR1cmUpO1xuICAgIHZhciB1cGRhdGVkRmVhdHVyZSA9IChzdGF0ZSA9PSAndXBkYXRlZCcgJiYgIWlzTmV3ICYmIGZlYXR1cmUpO1xuICAgIHZhciBkZWxldGVkRmVhdHVyZSA9IChzdGF0ZSA9PSAnZGVsZXRlZCcgJiYgIWlzTmV3ICYmICFmZWF0dXJlKTtcbiAgICBcbiAgICBpZiAoYWRkZWRGZWF0dXJlIHx8IHVwZGF0ZWRGZWF0dXJlKXtcbiAgICAgIGlmIChhc0dlb0pTT04pe1xuICAgICAgICBmZWF0dXJlID0gR2VvSlNPTkZvcm1hdC53cml0ZUZlYXR1cmVPYmplY3QoZmVhdHVyZSk7XG4gICAgICB9XG4gICAgICBmZWF0dXJlcy5wdXNoKGZlYXR1cmUpO1xuICAgIH1cbiAgICBlbHNlIGlmIChkZWxldGVkRmVhdHVyZSkge1xuICAgICAgZmVhdHVyZXMucHVzaChmaWQpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBmZWF0dXJlcztcbn07XG5cbnByb3RvLmNyZWF0ZUZlYXR1cmUgPSBmdW5jdGlvbihmaWQsZ2VvbWV0cnksYXR0cmlidXRlcyl7XG4gIHZhciBmZWF0dXJlID0gbmV3IG9sLkZlYXR1cmUoKTtcbiAgZmVhdHVyZS5zZXRJZChmaWQpO1xuICBmZWF0dXJlLnNldEdlb21ldHJ5KGdlb21ldHJ5KTtcbiAgZmVhdHVyZS5zZXRQcm9wZXJ0aWVzKGF0dHJpYnV0ZXMpO1xuICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnByb3RvLmNvbGxlY3RSZWxhdGlvbnNBdHRyaWJ1dGVzID0gZnVuY3Rpb24oKXtcbiAgdmFyIHJlbGF0aW9uc0F0dHJpYnV0ZXMgPSB7fTtcbiAgXy5mb3JFYWNoKHRoaXMuX3JlbGF0aW9uc0F0dHJpYnV0ZXNCdWZmZXIsZnVuY3Rpb24ocmVsYXRpb25zQnVmZmVyLGZpZCl7XG4gICAgbGFzdFJlbGF0aW9uc0F0dHJpYnV0ZXMgPSByZWxhdGlvbnNCdWZmZXJbcmVsYXRpb25zQnVmZmVyLmxlbmd0aC0xXTtcbiAgICByZWxhdGlvbnNBdHRyaWJ1dGVzW2ZpZF0gPSBsYXN0UmVsYXRpb25zQXR0cmlidXRlcztcbiAgfSlcbiAgcmV0dXJuIHJlbGF0aW9uc0F0dHJpYnV0ZXM7XG59O1xuXG5wcm90by5fYWRkRWRpdFRvR2VvbWV0cnlCdWZmZXIgPSBmdW5jdGlvbihmZWF0dXJlLG9wZXJhdGlvbil7XG4gIHZhciBnZW9tZXRyaWVzQnVmZmVyID0gdGhpcy5fZ2VvbWV0cmllc0J1ZmZlcjtcbiAgXG4gIHZhciBpZCA9IGZlYXR1cmUuZ2V0SWQoKTtcbiAgdmFyIGdlb21ldHJ5ID0gZmVhdHVyZS5nZXRHZW9tZXRyeSgpO1xuICBcbiAgaWYgKG9wZXJhdGlvbiA9PSAnZGVsZXRlJyl7XG4gICAgICBnZW9tZXRyeSA9IG51bGw7XG4gICAgICB2YXIgbGF5ZXIgPSB0aGlzLl9pc05ld0ZlYXR1cmUoaWQpID8gdGhpcy5fZWRpdG9yLl9lZGl0VmVjdG9yTGF5ZXIgOiB0aGlzLl9lZGl0b3IuX3ZlY3RvckxheWVyO1xuICAgICAgbGF5ZXIuZ2V0U291cmNlKCkucmVtb3ZlRmVhdHVyZShmZWF0dXJlKTtcbiAgfSBcbiAgXG4gIGlmICghXy5oYXMoZ2VvbWV0cmllc0J1ZmZlcixpZCkpe1xuICAgIGdlb21ldHJpZXNCdWZmZXJbaWRdID0gW107XG4gIH1cbiAgZ2VvbWV0cmllc0J1ZmZlcltpZF0ucHVzaChnZW9tZXRyeSk7XG4gIHRoaXMuX3NldERpcnR5KCk7XG59O1xuXG5wcm90by5fYWRkRWRpdFRvQXR0cmlidXRlc0J1ZmZlciA9IGZ1bmN0aW9uKGZlYXR1cmUscmVsYXRpb25zQXR0cmlidXRlcyl7XG4gIHZhciBmaWQgPSBmZWF0dXJlLmdldElkKCk7XG4gIHZhciBhdHRyaWJ1dGVzID0gZmVhdHVyZS5nZXRQcm9wZXJ0aWVzKCk7XG4gIHZhciBhdHRyaWJ1dGVzQnVmZmVyID0gdGhpcy5fYXR0cmlidXRlc0J1ZmZlcjtcblxuICBpZiAoIV8uaGFzKGF0dHJpYnV0ZXNCdWZmZXIsZmlkKSl7XG4gICAgYXR0cmlidXRlc0J1ZmZlcltmaWRdID0gW107XG4gIH1cbiAgYXR0cmlidXRlc0J1ZmZlcltmaWRdLnB1c2goYXR0cmlidXRlcyk7XG4gIFxuICBpZiAocmVsYXRpb25zQXR0cmlidXRlcyl7XG4gICAgaWYgKCFfLmhhcyh0aGlzLl9yZWxhdGlvbnNBdHRyaWJ1dGVzQnVmZmVyLGZpZCkpe1xuICAgIHRoaXMuX3JlbGF0aW9uc0F0dHJpYnV0ZXNCdWZmZXJbZmlkXSA9IFtdO1xuICB9XG4gICAgdGhpcy5fcmVsYXRpb25zQXR0cmlidXRlc0J1ZmZlcltmaWRdLnB1c2gocmVsYXRpb25zQXR0cmlidXRlcyk7XG4gIH1cbiAgdGhpcy5fc2V0RGlydHkoKTtcbn07XG5cbi8vIGd1YXJkbyBzZSDDqCB1bmEgZmVhdHVyZSBnacOgIHByZXNlbnRlIG5lbCBidWZmZXIgZGVsbGUgbnVvdmUgZ2VvbWV0cmllXG5wcm90by5faXNOZXdGZWF0dXJlID0gZnVuY3Rpb24oZmlkKXtcbiAgLy9yZXR1cm4gaWQudG9TdHJpbmcoKS5pbmRleE9mKCdfbmV3XycpID4gLTE7XG4gIHJldHVybiB0aGlzLl9lZGl0b3IuaXNOZXdGZWF0dXJlKGZpZCk7XG59O1xuXG5wcm90by5fc2V0RGlydHkgPSBmdW5jdGlvbigpe1xuICB0aGlzLl9lZGl0b3IuX3NldERpcnR5KCk7XG59O1xuXG5wcm90by5fcmVzZXRWZWN0b3JMYXllciA9IGZ1bmN0aW9uKCl7XG4gIHRoaXMuX2VkaXRvci52ZWN0b0xheWVyID0gdGhpcy5fb3JpZ1ZlY3RvckxheWVyO1xuICB0aGlzLl9vcmlnVmVjdG9yTGF5ZXIuZ2V0U291cmNlKCkuY2xlYXIoKTtcbn07XG5cbnByb3RvLl9jbGVhckJ1ZmZlcnMgPSBmdW5jdGlvbigpe1xuICB0aGlzLl9nZW9tZXRyaWVzQnVmZmVyID0ge307XG4gIHRoaXMuX2F0dHJpYnV0ZXNCdWZmZXIgPSB7fTtcbiAgdGhpcy5fcmVsYXRpb25zQXR0cmlidXRlc0J1ZmZlciA9IHt9O1xuICB0aGlzLl9lZGl0b3IuX3NldERpcnR5KGZhbHNlKTtcbn07XG5cbnByb3RvLl9jbG9uZUxheWVyID0gZnVuY3Rpb24oKXtcbiAgdmFyIGNsb25lZEZlYXR1cmVzID0gW107XG4gIHRoaXMuX2VkaXRvci5fdmVjdG9yTGF5ZXIuZ2V0U291cmNlKCkuZm9yRWFjaEZlYXR1cmUoZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgY2xvbmVkRmVhdHVyZXMucHVzaChmZWF0dXJlLmNsb25lKCkpO1xuICB9LHRoaXMpO1xuICB0aGlzLl9vcmlnVmVjdG9yTGF5ZXIuZ2V0U291cmNlKCkuYWRkRmVhdHVyZXMoY2xvbmVkRmVhdHVyZXMpO1xufTtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIHJlc29sdmUgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykucmVzb2x2ZTtcbnZhciByZWplY3QgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykucmVqZWN0O1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgR1VJID0gcmVxdWlyZSgnZ3VpL2d1aScpO1xudmFyIFZlY3RvckxheWVyID0gcmVxdWlyZSgnY29yZS9tYXAvbGF5ZXIvdmVjdG9ybGF5ZXInKTtcblxuLy92YXIgU2VxdWVuY2VyID0gcmVxdWlyZSgnLi9zdGVwc2VxdWVuY2VyJyk7XG52YXIgQWRkRmVhdHVyZVRvb2wgPSByZXF1aXJlKCcuL3Rvb2xzL2FkZGZlYXR1cmV0b29sJyk7XG52YXIgTW92ZUZlYXR1cmVUb29sID0gcmVxdWlyZSgnLi90b29scy9tb3ZlcG9pbnR0b29sJyk7XG52YXIgTW9kaWZ5RmVhdHVyZVRvb2wgPSByZXF1aXJlKCcuL3Rvb2xzL21vZGlmeWZlYXR1cmV0b29sJyk7XG52YXIgRGVsZXRlRmVhdHVyZVRvb2wgPSByZXF1aXJlKCcuL3Rvb2xzL2RlbGV0ZWZlYXR1cmV0b29sJyk7XG52YXIgUGlja0ZlYXR1cmVUb29sID0gcmVxdWlyZSgnLi90b29scy9waWNrZmVhdHVyZXRvb2wnKTtcbnZhciBDdXRMaW5lVG9vbCA9IHJlcXVpcmUoJy4vdG9vbHMvY3V0bGluZXRvb2wnKTtcbnZhciBFZGl0QnVmZmVyID0gcmVxdWlyZSgnLi9lZGl0YnVmZmVyJyk7XG5cbnZhciBFZGl0b3JHZW9tZXRyeVR5cGVzID0gW1xuICAnUG9pbnQnLFxuICAvLydNdWx0aVBvaW50JyxcbiAgJ0xpbmVTdHJpbmcnLFxuICAnTXVsdGlMaW5lU3RyaW5nJyxcbiAgLy8nUG9seWdvbicsXG4gIC8vJ011bHRpUG9seWdvbidcbl07XG5cbi8vIEVkaXRvciBkaSB2ZXR0b3JpIHB1bnR1YWxpXG5mdW5jdGlvbiBFZGl0b3IobWFwU2VydmljZSxvcHRpb25zKXtcbiAgdGhpcy5fbWFwU2VydmljZSA9IG1hcFNlcnZpY2U7XG4gIHRoaXMuX3ZlY3RvckxheWVyID0gbnVsbDtcbiAgdGhpcy5fZWRpdFZlY3RvckxheWVyID0gbnVsbDtcbiAgdGhpcy5fZWRpdEJ1ZmZlciA9IG51bGw7XG4gIHRoaXMuX2FjdGl2ZVRvb2wgPSBudWxsO1xuICB0aGlzLl9kaXJ0eSA9IGZhbHNlO1xuICB0aGlzLl9uZXdQcmVmaXggPSAnX25ld18nO1xuXG4gIHRoaXMuX3dpdGhGZWF0dXJlTG9ja3MgPSBmYWxzZTtcbiAgdGhpcy5fZmVhdHVyZUxvY2tzID0gbnVsbDtcblxuICB0aGlzLl9zdGFydGVkID0gZmFsc2U7XG5cbiAgdGhpcy5fc2V0dGVyc2xpc3RlbmVycyA9IHtcbiAgICBiZWZvcmU6IHt9LFxuICAgIGFmdGVyOiB7fVxuICB9O1xuICB0aGlzLl9nZW9tZXRyeXR5cGVzID0gW1xuICAgICdQb2ludCcsXG4gICAgLy8nTXVsdGlQb2ludCcsXG4gICAgJ0xpbmVTdHJpbmcnLFxuICAgICdNdWx0aUxpbmVTdHJpbmcnLFxuICAgIC8vJ1BvbHlnb24nLFxuICAgIC8vJ011bHRpUG9seWdvbidcbiAgXTtcblxuICAvLyBlbGVuY28gZGVpIHRvb2wgZSBkZWxsZSByZWxhdGl2ZSBjbGFzc2kgcGVyIHRpcG8gZGkgZ2VvbWV0cmlhIChpbiBiYXNlIGEgdmVjdG9yLmdlb21ldHJ5dHlwZSlcbiAgdGhpcy5fdG9vbHNGb3JHZW9tZXRyeVR5cGVzID0ge1xuICAgICdQb2ludCc6IHtcbiAgICAgIGFkZGZlYXR1cmU6IEFkZEZlYXR1cmVUb29sLFxuICAgICAgbW92ZWZlYXR1cmU6IE1vdmVGZWF0dXJlVG9vbCxcbiAgICAgIGRlbGV0ZWZlYXR1cmU6IERlbGV0ZUZlYXR1cmVUb29sLFxuICAgICAgZWRpdGF0dHJpYnV0ZXM6IFBpY2tGZWF0dXJlVG9vbFxuICAgIH0sXG4gICAgJ0xpbmVTdHJpbmcnOiB7XG4gICAgICBhZGRmZWF0dXJlOiBBZGRGZWF0dXJlVG9vbCxcbiAgICAgIG1vZGlmeXZlcnRleDogTW9kaWZ5RmVhdHVyZVRvb2wsXG4gICAgICBtb3ZlZmVhdHVyZTogTW92ZUZlYXR1cmVUb29sLFxuICAgICAgZGVsZXRlZmVhdHVyZTogRGVsZXRlRmVhdHVyZVRvb2wsXG4gICAgICBlZGl0YXR0cmlidXRlczogUGlja0ZlYXR1cmVUb29sLFxuICAgICAgY3V0bGluZTogQ3V0TGluZVRvb2xcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5fYWN0aXZlVG9vbCA9IG5ldyBmdW5jdGlvbigpe1xuICAgIHRoaXMudHlwZSA9IG51bGw7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG51bGw7XG5cbiAgICB0aGlzLnNldFRvb2wgPSBmdW5jdGlvbih0eXBlLGluc3RhbmNlKXtcbiAgICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgICB0aGlzLmluc3RhbmNlID0gaW5zdGFuY2U7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VHlwZSA9IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gdGhpcy50eXBlO1xuICAgIH07XG5cbiAgICB0aGlzLmdldFRvb2wgPSBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHRoaXMuaW5zdGFuY2U7XG4gICAgfTtcblxuICAgIHRoaXMuY2xlYXIgPSBmdW5jdGlvbigpe1xuICAgICAgdGhpcy50eXBlID0gbnVsbDtcbiAgICAgIHRoaXMuaW5zdGFuY2UgPSBudWxsO1xuICAgIH07XG4gIH1cblxuICB0aGlzLl90b29scyA9IHt9O1xuXG4gIGJhc2UodGhpcyk7XG59XG5pbmhlcml0KEVkaXRvcixHM1dPYmplY3QpO1xubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3I7XG5cbnZhciBwcm90byA9IEVkaXRvci5wcm90b3R5cGU7XG5cbnByb3RvLmdldE1hcFNlcnZpY2UgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuX21hcFNlcnZpY2U7XG59O1xuXG4vLyBhc3NvY2lhIGwnb2dnZXR0byBWZWN0b3JMYXllciBzdSBjdWkgc2kgdnVvbGUgZmFyZSBsJ2VkaXRpbmdcbnByb3RvLnNldFZlY3RvckxheWVyID0gZnVuY3Rpb24odmVjdG9yTGF5ZXIpe1xuICB2YXIgZ2VvbWV0cnl0eXBlID0gdmVjdG9yTGF5ZXIuZ2VvbWV0cnl0eXBlO1xuICBpZiAoIWdlb21ldHJ5dHlwZSB8fCAhIHRoaXMuX2lzQ29tcGF0aWJsZVR5cGUoZ2VvbWV0cnl0eXBlKSl7XG4gICAgdGhyb3cgRXJyb3IoXCJWZWN0b3IgZ2VvbWV0cnkgdHlwZSBcIitnZW9tZXRyeXR5cGUrXCIgaXMgbm90IHZhbGlkIGZvciBlZGl0aW5nXCIpO1xuICB9XG4gIHRoaXMuX3NldFRvb2xzRm9yVmVjdG9yVHlwZShnZW9tZXRyeXR5cGUpO1xuICB0aGlzLl92ZWN0b3JMYXllciA9IHZlY3RvckxheWVyO1xufTtcblxuLy8gYXZ2aWEgbGEgc2Vzc2lvbmUgZGkgZWRpdGF6aW9uZSBjb24gdW4gZGV0ZXJtaW5hdG8gdG9vbCAoZXMuIGFkZGZlYXR1cmUpXG5wcm90by5zdGFydCA9IGZ1bmN0aW9uKCl7XG4gIC8vIFRPRE86IGFnZ2l1bmdlcmUgbm90aWZpY2EgbmVsIGNhc28gcXVlc3RvIGlmIG5vbiBzaSB2ZXJpZmljaGlcbiAgdmFyIHJlcyA9IGZhbHNlO1xuICAvLyBzZSDDg8KoIHN0YXRvIHNldHRhdG8gaWwgdmVjdG9yTGF5ZXJcbiAgaWYgKHRoaXMuX3ZlY3RvckxheWVyKXtcbiAgICAvLyBuZWwgY2FzbyBub24gc2lhIGdpw4MgIGF2dmlhdG8gcHJpbWEgbG8gc3RvcHBvO1xuICAgIHRoaXMuc3RvcCgpO1xuXG4gICAgLy8gaXN0YW56aW8gbCdlZGl0VmVjdG9yTGF5ZXJcbiAgICB0aGlzLl9lZGl0VmVjdG9yTGF5ZXIgPSBuZXcgVmVjdG9yTGF5ZXIoe1xuICAgICAgbmFtZTogXCJlZGl0dmVjdG9yXCIsXG4gICAgICBnZW9tZXRyeXR5cGU6IHRoaXMuX3ZlY3RvckxheWVyLmdlb21ldHJ5dHlwZSxcbiAgICB9KVxuICAgIHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcC5hZGRMYXllcih0aGlzLl9lZGl0VmVjdG9yTGF5ZXIuZ2V0TWFwTGF5ZXIoKSk7XG5cbiAgICAvLyBpc3RhbnppbyBsJ0VkaXRCdWZmZXJcbiAgICB0aGlzLl9lZGl0QnVmZmVyID0gbmV3IEVkaXRCdWZmZXIodGhpcyk7XG4gICAgdGhpcy5fc2V0U3RhcnRlZCh0cnVlKTtcbiAgICByZXMgPSB0cnVlO1xuICB9XG4gIHJldHVybiByZXM7XG59O1xuXG4vLyB0ZXJtaW5hIGwnZWRpdGF6aW9uZVxucHJvdG8uc3RvcCA9IGZ1bmN0aW9uKCl7XG4gIGlmICh0aGlzLmlzU3RhcnRlZCgpKXtcbiAgICBpZiAodGhpcy5zdG9wVG9vbCgpKSB7XG4gICAgICB0aGlzLl9lZGl0QnVmZmVyLmRlc3Ryb3koKTtcbiAgICAgIHRoaXMuX2VkaXRCdWZmZXIgPSBudWxsO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgICAgIHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLnJlbW92ZUxheWVyQnlOYW1lKHRoaXMuX2VkaXRWZWN0b3JMYXllci5uYW1lKTtcbiAgICAgIHRoaXMuX3NldFN0YXJ0ZWQoZmFsc2UpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbnByb3RvLnNldFRvb2wgPSBmdW5jdGlvbih0b29sVHlwZSxvcHRpb25zKXtcbiAgaWYgKCF0aGlzLnN0b3BUb29sKCkpe1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2YXIgdG9vbENsYXNzID0gdGhpcy5fdG9vbHNbdG9vbFR5cGVdO1xuXG4gIC8vIHNlIGVzaXN0ZSBpbCB0b29sIHJpY2hpZXN0b1xuICBpZiAodG9vbENsYXNzICl7XG4gICAgdmFyIHRvb2xJbnN0YW5jZSA9IG5ldyB0b29sQ2xhc3ModGhpcyxvcHRpb25zKTtcbiAgICB0aGlzLl9hY3RpdmVUb29sLnNldFRvb2wodG9vbFR5cGUsdG9vbEluc3RhbmNlKTtcbiAgICB0aGlzLl9zZXRUb29sU2V0dGVyc0xpc3RlbmVycyh0b29sSW5zdGFuY2UsdGhpcy5fc2V0dGVyc2xpc3RlbmVycyk7XG4gICAgdG9vbEluc3RhbmNlLnJ1bigpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59O1xuXG5wcm90by5zdG9wVG9vbCA9IGZ1bmN0aW9uKCl7XG4gIGlmICh0aGlzLl9hY3RpdmVUb29sLmluc3RhbmNlICYmICF0aGlzLl9hY3RpdmVUb29sLmluc3RhbmNlLnN0b3AoKSl7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHRoaXMuX2FjdGl2ZVRvb2wuY2xlYXIoKTtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5wcm90by5nZXRBY3RpdmVUb29sID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuX2FjdGl2ZVRvb2w7XG59O1xuXG5wcm90by5pc1N0YXJ0ZWQgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5fc3RhcnRlZDtcbn07XG5cbnByb3RvLmhhc0FjdGl2ZVRvb2wgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gIV8uaXNOdWxsKHRoaXMuX2FjdGl2ZVRvb2wuaW5zdGFuY2UpO1xufTtcblxucHJvdG8uaXNUb29sQWN0aXZlID0gZnVuY3Rpb24odG9vbFR5cGUpe1xuICBpZiAodGhpcy5fYWN0aXZlVG9vbC50b29sVHlwZSl7XG4gICAgcmV0dXJuIHRoaXMuX2FjdGl2ZVRvb2wudG9vbFR5cGUgPT0gdG9vbFR5cGU7XG4gIH07XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbnByb3RvLmNvbW1pdCA9IGZ1bmN0aW9uKG5ld0ZlYXR1cmVzKXtcbiAgdGhpcy5fZWRpdEJ1ZmZlci5jb21taXQobmV3RmVhdHVyZXMpO1xufTtcblxucHJvdG8udW5kb0FsbCA9IGZ1bmN0aW9uKCl7XG4gIHRoaXMuX2VkaXRCdWZmZXIudW5kb0FsbCgpO1xufTtcblxucHJvdG8uc2V0RmVhdHVyZUxvY2tzID0gZnVuY3Rpb24oZmVhdHVyZUxvY2tzKXtcbiAgdGhpcy5fd2l0aEZlYXR1cmVMb2NrcyA9IHRydWU7XG4gIHRoaXMuX2ZlYXR1cmVMb2NrcyA9IGZlYXR1cmVMb2Nrcztcbn07XG5cbnByb3RvLmdldEZlYXR1cmVMb2NrcyA9IGZ1bmN0aW9uKGZlYXR1cmVMb2Nrcyl7XG4gIHJldHVybiB0aGlzLl9mZWF0dXJlTG9ja3M7XG59O1xuXG5wcm90by5nZXRGZWF0dXJlTG9ja0lkcyA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiBfLm1hcCh0aGlzLl9mZWF0dXJlTG9ja3MsZnVuY3Rpb24oZmVhdHVyZWxvY2spe1xuICAgIHJldHVybiBmZWF0dXJlbG9jay5sb2NraWQ7XG4gIH0pO1xufTtcblxucHJvdG8uZ2V0RmVhdHVyZUxvY2tzTG9ja0lkcyA9IGZ1bmN0aW9uKGZlYXR1cmVMb2Nrcyl7XG4gIHZhciBmZWF0dXJlTG9ja3MgPSBmZWF0dXJlTG9ja3MgfHwgdGhpcy5fZmVhdHVyZUxvY2tzO1xuICByZXR1cm4gXy5tYXAoZmVhdHVyZUxvY2tzLGZ1bmN0aW9uKGZlYXR1cmVsb2NrKXtcbiAgICByZXR1cm4gZmVhdHVyZWxvY2subG9ja2lkO1xuICB9KTtcbn07XG5cbnByb3RvLmdldEZlYXR1cmVMb2Nrc0ZlYXR1cmVJZHMgPSBmdW5jdGlvbihmZWF0dXJlTG9ja3Mpe1xuICB2YXIgZmVhdHVyZUxvY2tzID0gZmVhdHVyZUxvY2tzIHx8IHRoaXMuX2ZlYXR1cmVMb2NrcztcbiAgcmV0dXJuIF8ubWFwKGZlYXR1cmVMb2NrcyxmdW5jdGlvbihmZWF0dXJlbG9jayl7XG4gICAgcmV0dXJuIGZlYXR1cmVsb2NrLmZlYXR1cmVpZDtcbiAgfSk7XG59O1xuXG5wcm90by5nZXRGZWF0dXJlTG9ja0lkc0ZvckZlYXR1cmVJZHMgPSBmdW5jdGlvbihmaWRzKXtcbiAgdmFyIGZlYXR1cmVsb2Nrc0ZvckZpZHMgPSBfLmZpbHRlcih0aGlzLl9mZWF0dXJlTG9ja3MsZnVuY3Rpb24oZmVhdHVyZWxvY2spe1xuICAgIHJldHVybiBfLmluY2x1ZGVzKGZpZHMsZmVhdHVyZWxvY2suZmVhdHVyZWlkKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHRoaXMuZ2V0RmVhdHVyZUxvY2tzTG9ja0lkcyhmZWF0dXJlbG9ja3NGb3JGaWRzKTtcbn07XG5cbnByb3RvLmdldEVkaXRlZEZlYXR1cmVzID0gZnVuY3Rpb24oKXtcbiAgdmFyIG1vZGlmaWVkRmlkcyA9IHRoaXMuX2VkaXRCdWZmZXIuY29sbGVjdEZlYXR1cmVJZHMoKTtcbiAgdmFyIGxvY2tJZHMgPSB0aGlzLmdldEZlYXR1cmVMb2NrSWRzRm9yRmVhdHVyZUlkcyhtb2RpZmllZEZpZHMpO1xuICByZXR1cm4ge1xuICAgIGFkZDogdGhpcy5fZWRpdEJ1ZmZlci5jb2xsZWN0RmVhdHVyZXMoJ25ldycsdHJ1ZSksXG4gICAgdXBkYXRlOiB0aGlzLl9lZGl0QnVmZmVyLmNvbGxlY3RGZWF0dXJlcygndXBkYXRlZCcsdHJ1ZSksXG4gICAgZGVsZXRlOiB0aGlzLl9lZGl0QnVmZmVyLmNvbGxlY3RGZWF0dXJlcygnZGVsZXRlZCcsdHJ1ZSksXG4gICAgcmVsYXRpb25zOiB0aGlzLl9lZGl0QnVmZmVyLmNvbGxlY3RSZWxhdGlvbnNBdHRyaWJ1dGVzKCksXG4gICAgbG9ja2lkczogbG9ja0lkc1xuICB9XG59O1xuXG5wcm90by5zZXRGaWVsZHNXaXRoVmFsdWVzID0gZnVuY3Rpb24oZmVhdHVyZSxmaWVsZHMscmVsYXRpb25zKXtcbiAgdmFyIGF0dHJpYnV0ZXMgPSB7fTtcbiAgXy5mb3JFYWNoKGZpZWxkcyxmdW5jdGlvbihmaWVsZCl7XG4gICAgYXR0cmlidXRlc1tmaWVsZC5uYW1lXSA9IGZpZWxkLnZhbHVlO1xuICB9KTtcblxuICB2YXIgcmVsYXRpb25zQXR0cmlidXRlcyA9IG51bGw7XG4gIGlmIChyZWxhdGlvbnMpe1xuICAgIHZhciByZWxhdGlvbnNBdHRyaWJ1dGVzID0ge307XG4gICAgXy5mb3JFYWNoKHJlbGF0aW9ucyxmdW5jdGlvbihyZWxhdGlvbil7XG4gICAgICB2YXIgYXR0cmlidXRlcyA9IHt9O1xuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9uLmZpZWxkcyxmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgIGF0dHJpYnV0ZXNbZmllbGQubmFtZV0gPSBmaWVsZC52YWx1ZTtcbiAgICAgIH0pO1xuICAgICAgcmVsYXRpb25zQXR0cmlidXRlc1tyZWxhdGlvbi5uYW1lXSA9IGF0dHJpYnV0ZXM7XG4gICAgfSk7XG4gIH1cbiAgZmVhdHVyZS5zZXRQcm9wZXJ0aWVzKGF0dHJpYnV0ZXMpO1xuICB0aGlzLl9lZGl0QnVmZmVyLnVwZGF0ZUZpZWxkcyhmZWF0dXJlLHJlbGF0aW9uc0F0dHJpYnV0ZXMpO1xufTtcblxucHJvdG8uc2V0RmllbGRzID0gZnVuY3Rpb24oZmVhdHVyZSxmaWVsZHMpe1xuICBmZWF0dXJlLnNldFByb3BlcnRpZXMoZmllbGRzKTtcbiAgdGhpcy5fZWRpdEJ1ZmZlci51cGRhdGVGaWVsZHMoZmVhdHVyZSk7XG59O1xuXG5wcm90by5nZXRSZWxhdGlvbnNXaXRoVmFsdWVzID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gIHZhciBmaWQgPSBmZWF0dXJlLmdldElkKCk7XG4gIGlmICh0aGlzLl92ZWN0b3JMYXllci5oYXNSZWxhdGlvbnMoKSl7XG4gICAgdmFyIGZpZWxkc1Byb21pc2U7XG4gICAgLy8gc2Ugbm9uIGhhIGZpZCB2dW9sIGRpcmUgY2hlIMODwqggbnVvdm8gZSBzZW56YSBhdHRyaWJ1dGksIHF1aW5kaSBwcmVuZG8gaSBmaWVsZHMgdnVvdGlcbiAgICBpZiAoIWZpZCl7XG4gICAgICBmaWVsZHNQcm9taXNlID0gdGhpcy5fdmVjdG9yTGF5ZXIuZ2V0UmVsYXRpb25zV2l0aFZhbHVlcygpO1xuICAgIH1cbiAgICAvLyBzZSBwZXIgY2FzbyBoYSB1biBmaWQgbWEgw4PCqCB1biB2ZXR0b3JpYWxlIG51b3ZvXG4gICAgZWxzZSBpZiAoIXRoaXMuX3ZlY3RvckxheWVyLmdldEZlYXR1cmVCeUlkKGZpZCkpe1xuICAgICAgLy8gc2UgcXVlc3RhIGZlYXR1cmUsIGFuY29yYSBub24gcHJlc2VudGUgbmVsIHZlY3RvckxheWVyLCBoYSBjb211bnF1ZSBpIHZhbG9yaSBkZWxsZSBGS3MgcG9wb2xhdGUsIGFsbG9yYSBsZSBlc3RyYWdnb1xuICAgICAgaWYgKHRoaXMuX3ZlY3RvckxheWVyLmZlYXR1cmVIYXNSZWxhdGlvbnNGa3NXaXRoVmFsdWVzKGZlYXR1cmUpKXtcbiAgICAgICAgdmFyIGZrcyA9IHRoaXMuX3ZlY3RvckxheWVyLmdldFJlbGF0aW9uc0Zrc1dpdGhWYWx1ZXNGb3JGZWF0dXJlKGZlYXR1cmUpO1xuICAgICAgICBmaWVsZHNQcm9taXNlID0gdGhpcy5fdmVjdG9yTGF5ZXIuZ2V0UmVsYXRpb25zV2l0aFZhbHVlc0Zyb21Ga3MoZmtzKTtcbiAgICAgIH1cbiAgICAgIC8vIGFsdHJpbWVudGkgcHJlbmRvIGkgZmllbGRzIHZ1b3RpXG4gICAgICBlbHNlIHtcbiAgICAgICAgZmllbGRzUHJvbWlzZSA9IHRoaXMuX3ZlY3RvckxheWVyLmdldFJlbGF0aW9uc1dpdGhWYWx1ZXMoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gc2UgaW52ZWNlIMODwqggdW4gdmV0dG9yaWFsZSBwcmVlc2lzdGVudGUgY29udHJvbGxvIGludGFudG8gc2UgaGEgZGF0aSBkZWxsZSByZWxhemlvbmkgZ2nDgyAgZWRpdGF0aVxuICAgIGVsc2Uge1xuICAgICAgdmFyIGhhc0VkaXRzID0gdGhpcy5fZWRpdEJ1ZmZlci5hcmVGZWF0dXJlUmVsYXRpb25zRWRpdGVkKGZpZCk7XG4gICAgICBpZiAoaGFzRWRpdHMpe1xuICAgICAgICB2YXIgcmVsYXRpb25zID0gdGhpcy5fdmVjdG9yTGF5ZXIuZ2V0UmVsYXRpb25zKCk7XG4gICAgICAgIHZhciByZWxhdGlvbnNBdHRyaWJ1dGVzID0gdGhpcy5fZWRpdEJ1ZmZlci5nZXRSZWxhdGlvbnNBdHRyaWJ1dGVzKGZpZCk7XG4gICAgICAgIF8uZm9yRWFjaChyZWxhdGlvbnNBdHRyaWJ1dGVzLGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgICAgICAgICBfLmZvckVhY2gocmVsYXRpb25zW3JlbGF0aW9uS2V5XS5maWVsZHMsZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgZmllbGQudmFsdWUgPSByZWxhdGlvbnNBdHRyaWJ1dGVzW3JlbGF0aW9uLm5hbWVdW2ZpZWxkLm5hbWVdO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBmaWVsZHNQcm9taXNlID0gcmVzb2x2ZShyZWxhdGlvbnMpO1xuICAgICAgfVxuICAgICAgLy8gc2Ugbm9uIGNlIGxpIGhhIHZ1b2wgZGlyZSBjaGUgZGV2byBjYXJpY2FyZSBpIGRhdGkgZGVsbGUgcmVsYXppb25pIGRhIHJlbW90b1xuICAgICAgZWxzZSB7XG4gICAgICAgIGZpZWxkc1Byb21pc2UgPSB0aGlzLl92ZWN0b3JMYXllci5nZXRSZWxhdGlvbnNXaXRoVmFsdWVzKGZpZCk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGVsc2Uge1xuICAgIGZpZWxkc1Byb21pc2UgPSByZXNvbHZlKG51bGwpO1xuICB9XG4gIHJldHVybiBmaWVsZHNQcm9taXNlO1xufTtcblxucHJvdG8uY3JlYXRlUmVsYXRpb25FbGVtZW50ID0gZnVuY3Rpb24ocmVsYXRpb24pIHtcbiAgdmFyIGVsZW1lbnQgPSB7fVxuICBlbGVtZW50LmZpZWxkcyA9IF8uY2xvbmVEZWVwKHRoaXMuX3ZlY3RvckxheWVyLmdldFJlbGF0aW9uRmllbGRzKHJlbGF0aW9uKSk7XG4gIGVsZW1lbnQuaWQgPSB0aGlzLmdlbmVyYXRlSWQoKTtcbiAgcmV0dXJuIGVsZW1lbnQ7XG59O1xuXG5wcm90by5nZXRSZWxhdGlvblBrRmllbGRJbmRleCA9IGZ1bmN0aW9uKHJlbGF0aW9uTmFtZSkge1xuICByZXR1cm4gdGhpcy5fdmVjdG9yTGF5ZXIuZ2V0UmVsYXRpb25Qa0ZpZWxkSW5kZXgocmVsYXRpb25OYW1lKTtcbn1cblxucHJvdG8uZ2V0RmllbGQgPSBmdW5jdGlvbihuYW1lLGZpZWxkcyl7XG4gIHZhciBmaWVsZHMgPSBmaWVsZHMgfHwgdGhpcy5nZXRWZWN0b3JMYXllcigpLmdldEZpZWxkc1dpdGhWYWx1ZXMoKTtcbiAgdmFyIGZpZWxkID0gbnVsbDtcbiAgXy5mb3JFYWNoKGZpZWxkcyxmdW5jdGlvbihmKXtcbiAgICBpZiAoZi5uYW1lID09IG5hbWUpe1xuICAgICAgZmllbGQgPSBmO1xuICAgIH1cbiAgfSlcbiAgcmV0dXJuIGZpZWxkO1xufTtcblxucHJvdG8uaXNEaXJ0eSA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLl9kaXJ0eTtcbn07XG5cbnByb3RvLm9uYWZ0ZXIgPSBmdW5jdGlvbihzZXR0ZXIsbGlzdGVuZXIpe1xuICB0aGlzLl9vbmFmdGVydG9vbGFjdGlvbihzZXR0ZXIsbGlzdGVuZXIpO1xufTtcblxuLy8gcGVybWV0dGUgZGkgaW5zZXJpcmUgdW4gc2V0dGVyIGxpc3RlbmVyIHNpbmNyb25vIHByaW1hIGNoZSB2ZW5nYSBlZmZldHR1YXRhIHVuYSBvcGVyYXppb25lIGRhIHVuIHRvb2wgKGVzLiBhZGRmZWF0dXJlKVxucHJvdG8ub25iZWZvcmUgPSBmdW5jdGlvbihzZXR0ZXIsbGlzdGVuZXIpe1xuICB0aGlzLl9vbmJlZm9yZXRvb2xhY3Rpb24oc2V0dGVyLGxpc3RlbmVyLGZhbHNlKTtcbn07XG5cbi8vIGNvbWUgb25iZWZvcmUoKSBtYSBwZXIgbGlzdGVuZXIgYXNpbmNyb25pXG5wcm90by5vbmJlZm9yZWFzeW5jID0gZnVuY3Rpb24oc2V0dGVyLGxpc3RlbmVyKXtcbiAgdGhpcy5fb25iZWZvcmV0b29sYWN0aW9uKHNldHRlcixsaXN0ZW5lcix0cnVlKTtcbn07XG5cbnByb3RvLmFkZEZlYXR1cmUgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgdGhpcy5fZWRpdEJ1ZmZlci5hZGRGZWF0dXJlKGZlYXR1cmUpO1xufTtcblxucHJvdG8udXBkYXRlRmVhdHVyZSA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICB0aGlzLl9lZGl0QnVmZmVyLnVwZGF0ZUZlYXR1cmUoZmVhdHVyZSk7XG59O1xuXG5wcm90by5kZWxldGVGZWF0dXJlID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gIHRoaXMuX2VkaXRCdWZmZXIuZGVsZXRlRmVhdHVyZShmZWF0dXJlKTtcbn07XG5cbnByb3RvLmdldFZlY3RvckxheWVyID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuX3ZlY3RvckxheWVyO1xufTtcblxucHJvdG8uZ2V0RWRpdFZlY3RvckxheWVyID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuX2VkaXRWZWN0b3JMYXllcjtcbn07XG5cbnByb3RvLmdlbmVyYXRlSWQgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5fbmV3UHJlZml4K0RhdGUubm93KCk7XG59O1xuXG5wcm90by5pc05ld0ZlYXR1cmUgPSBmdW5jdGlvbihmaWQpe1xuICBpZiAoZmlkKSB7XG4gICAgcmV0dXJuIGZpZC50b1N0cmluZygpLmluZGV4T2YodGhpcy5fbmV3UHJlZml4KSA9PSAwO1xuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuLypwcm90by5pc05ld0ZlYXR1cmUgPSBmdW5jdGlvbihmaWQpe1xuIGlmIChmaWQpIHtcbiBpZighdGhpcy5nZXRWZWN0b3JMYXllcigpLmdldEZlYXR1cmVCeUlkKGZpZCkpe1xuIHJldHVybiB0cnVlO1xuIH1cbiByZXR1cm4gZmFsc2U7XG4gfVxuIGVsc2Uge1xuIHJldHVybiB0cnVlXG4gfVxuIH07Ki9cblxucHJvdG8uX2lzQ29tcGF0aWJsZVR5cGUgPSBmdW5jdGlvbihnZW9tZXRyeXR5cGUpe1xuICByZXR1cm4gdGhpcy5fZ2VvbWV0cnl0eXBlcy5pbmRleE9mKGdlb21ldHJ5dHlwZSkgPiAtMTtcbn07XG5cbnByb3RvLl9zZXRUb29sc0ZvclZlY3RvclR5cGUgPSBmdW5jdGlvbihnZW9tZXRyeXR5cGUpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciB0b29scyA9IHRoaXMuX3Rvb2xzRm9yR2VvbWV0cnlUeXBlc1tnZW9tZXRyeXR5cGVdO1xuICBfLmZvckVhY2godG9vbHMsZnVuY3Rpb24odG9vbENsYXNzLHRvb2wpe1xuICAgIHNlbGYuX3Rvb2xzW3Rvb2xdID0gdG9vbENsYXNzO1xuICB9KVxufTtcblxucHJvdG8uX29uYWZ0ZXJ0b29sYWN0aW9uID0gZnVuY3Rpb24oc2V0dGVyLGxpc3RlbmVyKXtcbiAgaWYgKCFfLmdldCh0aGlzLl9zZXR0ZXJzbGlzdGVuZXJzLmFmdGVyLHNldHRlcikpe1xuICAgIHRoaXMuX3NldHRlcnNsaXN0ZW5lcnMuYWZ0ZXJbc2V0dGVyXSA9IFtdO1xuICB9XG4gIHRoaXMuX3NldHRlcnNsaXN0ZW5lcnMuYWZ0ZXJbc2V0dGVyXS5wdXNoKHtcbiAgICBmbmM6IGxpc3RlbmVyXG4gIH0pO1xufVxuXG5wcm90by5fb25iZWZvcmV0b29sYWN0aW9uID0gZnVuY3Rpb24oc2V0dGVyLGxpc3RlbmVyLGFzeW5jKXtcbiAgaWYgKCFfLmdldCh0aGlzLl9zZXR0ZXJzbGlzdGVuZXJzLmJlZm9yZSxzZXR0ZXIpKXtcbiAgICB0aGlzLl9zZXR0ZXJzbGlzdGVuZXJzLmJlZm9yZVtzZXR0ZXJdID0gW107XG4gIH1cbiAgdGhpcy5fc2V0dGVyc2xpc3RlbmVycy5iZWZvcmVbc2V0dGVyXS5wdXNoKHtcbiAgICBmbmM6IGxpc3RlbmVyLFxuICAgIGhvdzogYXN5bmMgPyAnYXN5bmMnIDogJ3N5bmMnXG4gIH0pO1xufVxuXG4vLyB1bmEgdm9sdGEgaXN0YW56aWF0byBpbCB0b29sIGFnZ2l1bmdvIGEgcXVlc3RvIHR1dHRpIGkgbGlzdGVuZXIgZGVmaW5pdGkgYSBsaXZlbGxvIGRpIGVkaXRvclxucHJvdG8uX3NldFRvb2xTZXR0ZXJzTGlzdGVuZXJzID0gZnVuY3Rpb24odG9vbCxzZXR0ZXJzTGlzdGVuZXJzKXtcbiAgXy5mb3JFYWNoKHNldHRlcnNMaXN0ZW5lcnMuYmVmb3JlLGZ1bmN0aW9uKGxpc3RlbmVycyxzZXR0ZXIpe1xuICAgIGlmIChfLmhhc0luKHRvb2wuc2V0dGVycyxzZXR0ZXIpKXtcbiAgICAgIF8uZm9yRWFjaChsaXN0ZW5lcnMsZnVuY3Rpb24obGlzdGVuZXIpe1xuICAgICAgICBpZiAobGlzdGVuZXIuaG93ID09ICdzeW5jJyl7XG4gICAgICAgICAgdG9vbC5vbmJlZm9yZShzZXR0ZXIsbGlzdGVuZXIuZm5jKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0b29sLm9uYmVmb3JlYXN5bmMoc2V0dGVyLGxpc3RlbmVyLmZuYyk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICB9KTtcblxuICBfLmZvckVhY2goc2V0dGVyc0xpc3RlbmVycy5hZnRlcixmdW5jdGlvbihsaXN0ZW5lcnMsc2V0dGVyKXtcbiAgICBpZiAoXy5oYXNJbih0b29sLnNldHRlcnMsc2V0dGVyKSl7XG4gICAgICBfLmZvckVhY2gobGlzdGVuZXJzLGZ1bmN0aW9uKGxpc3RlbmVyKXtcbiAgICAgICAgdG9vbC5vbmFmdGVyKHNldHRlcixsaXN0ZW5lci5mbmMpO1xuICAgICAgfSlcbiAgICB9XG4gIH0pXG59O1xuXG5wcm90by5fc2V0U3RhcnRlZCA9IGZ1bmN0aW9uKGJvb2wpe1xuICB0aGlzLl9zdGFydGVkID0gYm9vbDtcbn07XG5cbnByb3RvLl9zZXREaXJ0eSA9IGZ1bmN0aW9uKGJvb2wpe1xuICBpZiAoXy5pc05pbChib29sKSl7XG4gICAgdGhpcy5fZGlydHkgPSB0cnVlO1xuICB9XG4gIGVsc2Uge1xuICAgIHRoaXMuX2RpcnR5ID0gYm9vbDtcbiAgfVxuICB0aGlzLmVtaXQoXCJkaXJ0eVwiLHRoaXMuX2RpcnR5KTtcbn07IiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xuXG5mdW5jdGlvbiBSZWxhdGlvbkVkaXRCdWZmZXIoZWRpdG9yLHJlbGF0aW9uTmFtZSl7XG4gIHRoaXMuX25hbWUgPSByZWxhdGlvbk5hbWU7XG4gIHRoaXMuX2VkaXRvciA9IGVkaXRvcjtcbiAgXG4gIC8vIGJ1ZmZlciBkZWdsaSBhdHRyaWJ1dGlcbiAgdGhpcy5fYXR0cmlidXRlc0J1ZmZlciA9IHt9O1xufVxuaW5oZXJpdChSZWxhdGlvbkVkaXRCdWZmZXIsRzNXT2JqZWN0KTtcbm1vZHVsZS5leHBvcnRzID0gUmVsYXRpb25FZGl0QnVmZmVyO1xuXG52YXIgcHJvdG8gPSBSZWxhdGlvbkVkaXRCdWZmZXIucHJvdG90eXBlO1xuXG5wcm90by5jb21taXQgPSBmdW5jdGlvbigpe1xuICB0aGlzLl9jbGVhckJ1ZmZlcnMoKTtcbiAgdGhpcy5fY2xvbmVMYXllcigpO1xufTtcblxucHJvdG8udW5kb0FsbCA9IGZ1bmN0aW9uKCl7XG4gIHRoaXMuX3Jlc2V0VmVjdG9yTGF5ZXIoKTtcbiAgdGhpcy5fY2xlYXJCdWZmZXJzKCk7XG59O1xuXG5wcm90by5kZXN0cm95ID0gZnVuY3Rpb24oKXtcbiAgdGhpcy5fY2xlYXJCdWZmZXJzKCk7XG59O1xuXG5wcm90by5nZW5lcmF0ZUlkID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuX2VkaXRvci5nZW5lcmF0ZUlkKCk7XG59O1xuXG5wcm90by5hZGRFbGVtZW50ID0gZnVuY3Rpb24oZWxlbWVudCl7XG4gIGlmKCFlbGVtZW50LmlkKXtcbiAgICBlbGVtZW50LmlkID0gKHRoaXMuZ2VuZXJhdGVJZCgpKTtcbiAgfVxuICB0aGlzLl9hZGRFZGl0VG9CdWZmZXIoZWxlbWVudCwnYWRkJyk7XG4gIGNvbnNvbGUubG9nKFwiSW5zZXJpdGEgbnVvdm8gZWxlbWVudG8gcmVsYXppb25lOiAoSUQ6IFwiK2VsZW1lbnQuaWQrXCIgbmVsIGJ1ZmZlclwiKTtcbn07XG5cbnByb3RvLnVwZGF0ZUVsZW1lbnQgPSBmdW5jdGlvbihlbGVtZW50KXtcbiAgdGhpcy5fYWRkRWRpdFRvQnVmZmVyKGVsZW1lbnQsJ3VwZGF0ZScpO1xuICBjb25zb2xlLmxvZyhcIk1vZGlmaWNhdGEgZWxlbWVudG8gcmVsYXppb25lOiAoSUQ6IFwiK2VsZW1lbnQuaWQrXCIgbmVsIGJ1ZmZlclwiKTtcbn07XG5cbnByb3RvLmRlbGV0ZUVsZW1lbnQgPSBmdW5jdGlvbihlbGVtZW50KXtcbiAgdGhpcy5fYWRkRWRpdFRvQnVmZmVyKGVsZW1lbnQsJ2RlbGV0ZScpO1xuICBjb25zb2xlLmxvZyhcIlJpbW9zc2EgZWxlbWVudG8gcmVsYXppb25lOiAoSUQ6IFwiK2VsZW1lbnQuaWQrXCIgbmVsIGJ1ZmZlclwiKTtcbn07XG5cbnByb3RvLmdldEVsZW1lbnRBdHRyaWJ1dGVzID0gZnVuY3Rpb24oZWxlbWVudElkKXtcbiAgaWYodGhpcy5fYXR0cmlidXRlc0J1ZmZlcltlbGVtZW50SWRdKXtcbiAgICByZXR1cm4gdGhpcy5fYXR0cmlidXRlc0J1ZmZlcltlbGVtZW50SWRdLnNsaWNlKC0xKVswXTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn07XG5cbnByb3RvLmFyZUVsZW1lbnRBdHRyaWJ1dGVzRWRpdGVkID0gZnVuY3Rpb24oZWxlbWVudElkKXtcbiAgaWYgKHRoaXMuX2F0dHJpYnV0ZXNCdWZmZXJbZWxlbWVudElkXSl7XG4gICAgcmV0dXJuIHRoaXMuX2F0dHJpYnV0ZXNCdWZmZXJbZWxlbWVudElkXS5sZW5ndGggPiAtMTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5wcm90by5jb2xsZWN0RmVhdHVyZUlkcyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBnZW9tZXRyaWVzQnVmZmVycyA9IHRoaXMuX2dlb21ldHJpZXNCdWZmZXI7XG4gIHZhciBhdHRyaWJ1dGVzQnVmZmVycyA9IHRoaXMuX2F0dHJpYnV0ZXNCdWZmZXI7XG4gIFxuICB2YXIgbW9kaWZpZWRGaWRzID0gW107XG5cbiAgbW9kaWZpZWRGaWRzID0gXy5jb25jYXQobW9kaWZpZWRGaWRzLF8ua2V5cyhnZW9tZXRyaWVzQnVmZmVycykpO1xuICBtb2RpZmllZEZpZHMgPSBfLmNvbmNhdChtb2RpZmllZEZpZHMsXy5rZXlzKGF0dHJpYnV0ZXNCdWZmZXJzKSk7XG4gIFxuICByZXR1cm4gXy51bmlxKG1vZGlmaWVkRmlkcyk7XG59O1xuXG5wcm90by5jb2xsZWN0RWxlbWVudHMgPSBmdW5jdGlvbihzdGF0ZSxhc0dlb0pTT04pe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBnZW9tZXRyaWVzQnVmZmVycyA9IHRoaXMuX2dlb21ldHJpZXNCdWZmZXI7XG4gIHZhciBhdHRyaWJ1dGVzQnVmZmVycyA9IHRoaXMuX2F0dHJpYnV0ZXNCdWZmZXI7XG4gIHZhciBhc0dlb0pTT04gPSBhc0dlb0pTT04gfHwgZmFsc2U7XG4gIHZhciBHZW9KU09ORm9ybWF0ID0gbmV3IG9sLmZvcm1hdC5HZW9KU09OKCk7XG4gIFxuICB2YXIgbW9kaWZpZWRGaWRzID0gdGhpcy5jb2xsZWN0RmVhdHVyZUlkcygpO1xuICBcbiAgdmFyIGxheWVyO1xuICBpZiAoc3RhdGUgPT0gJ25ldycpIHtcbiAgICBsYXllciA9IHNlbGYuX2VkaXRvci5nZXRFZGl0VmVjdG9yTGF5ZXIoKTtcbiAgfVxuICBlbHNlIHtcbiAgICBsYXllciA9IHNlbGYuX2VkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICB9XG4gIFxuICB2YXIgZmVhdHVyZXMgPSBbXTtcbiAgXy5mb3JFYWNoKG1vZGlmaWVkRmlkcyxmdW5jdGlvbihmaWQpe1xuICAgIFxuICAgIHZhciBmZWF0dXJlID0gbGF5ZXIuZ2V0RmVhdHVyZUJ5SWQoZmlkKTtcbiAgICB2YXIgaXNOZXcgPSBzZWxmLl9pc05ld0ZlYXR1cmUoZmlkKTtcbiAgICB2YXIgYWRkZWRGZWF0dXJlID0gKHN0YXRlID09ICduZXcnICYmIGlzTmV3ICYmIGZlYXR1cmUpO1xuICAgIHZhciB1cGRhdGVkRmVhdHVyZSA9IChzdGF0ZSA9PSAndXBkYXRlZCcgJiYgIWlzTmV3ICYmIGZlYXR1cmUpO1xuICAgIHZhciBkZWxldGVkRmVhdHVyZSA9IChzdGF0ZSA9PSAnZGVsZXRlZCcgJiYgIWlzTmV3ICYmICFmZWF0dXJlKTtcbiAgICBcbiAgICBpZiAoYWRkZWRGZWF0dXJlIHx8IHVwZGF0ZWRGZWF0dXJlKXtcbiAgICAgIGlmIChhc0dlb0pTT04pe1xuICAgICAgICBmZWF0dXJlID0gR2VvSlNPTkZvcm1hdC53cml0ZUZlYXR1cmVPYmplY3QoZmVhdHVyZSk7XG4gICAgICB9XG4gICAgICBmZWF0dXJlcy5wdXNoKGZlYXR1cmUpO1xuICAgIH1cbiAgICBlbHNlIGlmIChkZWxldGVkRmVhdHVyZSkge1xuICAgICAgZmVhdHVyZXMucHVzaChmaWQpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBmZWF0dXJlcztcbn07XG5cbnByb3RvLmNvbGxlY3RSZWxhdGlvbkF0dHJpYnV0ZXMgPSBmdW5jdGlvbigpe1xuICB2YXIgcmVsYXRpb25zQXR0cmlidXRlcyA9IHt9O1xuICBfLmZvckVhY2godGhpcy5fcmVsYXRpb25zQXR0cmlidXRlc0J1ZmZlcixmdW5jdGlvbihyZWxhdGlvbnNCdWZmZXIsZmlkKXtcbiAgICBsYXN0UmVsYXRpb25zQXR0cmlidXRlcyA9IHJlbGF0aW9uc0J1ZmZlcltyZWxhdGlvbnNCdWZmZXIubGVuZ3RoLTFdO1xuICAgIHJlbGF0aW9uc0F0dHJpYnV0ZXNbZmlkXSA9IGxhc3RSZWxhdGlvbnNBdHRyaWJ1dGVzO1xuICB9KVxuICByZXR1cm4gcmVsYXRpb25zQXR0cmlidXRlcztcbn07XG5cbnByb3RvLl9hZGRFZGl0VG9CdWZmZXIgPSBmdW5jdGlvbihlbGVtZW50LG9wZXJhdGlvbil7XG4gIHZhciBpZCA9IGVsZW1lbnQuaWQ7XG4gIFxuICBpZiAoIV8uaGFzKGF0dHJpYnV0ZXNCdWZmZXIsaWQpKXtcbiAgICBhdHRyaWJ1dGVzQnVmZmVyW2lkXSA9IFtdO1xuICB9XG4gIFxuICBpZihvcGVyYXRpb24gPT0gJ2RlbGV0ZScpIHtcbiAgICBlbGVtZW50ID0gbnVsbDtcbiAgfVxuICBcbiAgYXR0cmlidXRlc0J1ZmZlcltpZF0ucHVzaChlbGVtZW50KTtcbiAgdGhpcy5fc2V0RGlydHkoKTtcbn07XG5cbnByb3RvLl9zZXREaXJ0eSA9IGZ1bmN0aW9uKGJvb2wpe1xuICB0aGlzLl9lZGl0b3IuX3NldERpcnR5KGJvb2wpO1xufTtcblxucHJvdG8uX2NsZWFyQnVmZmVycyA9IGZ1bmN0aW9uKCl7XG4gIHRoaXMuX2F0dHJpYnV0ZXNCdWZmZXIgPSB7fTtcbiAgdGhpcy5fc2V0RGlydHkoZmFsc2UpO1xufTtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG5cbnZhciBFZGl0aW5nVG9vbCA9IHJlcXVpcmUoJy4vZWRpdGluZ3Rvb2wnKTtcblxuZnVuY3Rpb24gQWRkRmVhdHVyZVRvb2woZWRpdG9yLG9wdGlvbnMpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5fcnVubmluZyA9IGZhbHNlO1xuICB0aGlzLl9idXN5ID0gZmFsc2U7XG4gIHRoaXMuc291cmNlID0gZWRpdG9yLmdldEVkaXRWZWN0b3JMYXllcigpLmdldE1hcExheWVyKCkuZ2V0U291cmNlKCk7XG4gIHRoaXMuaXNQYXVzYWJsZSA9IHRydWU7XG4gIFxuICB0aGlzLmRyYXdJbnRlcmFjdGlvbiA9IG51bGw7XG4gIHRoaXMuX3NuYXAgPSBvcHRpb25zLnNuYXAgfHwgbnVsbDtcbiAgdGhpcy5fc25hcEludGVyYWN0aW9uID0gbnVsbDsgXG4gIFxuICB0aGlzLl9maW5pc2hDb25kaXRpb24gPSBvcHRpb25zLmZpbmlzaENvbmRpdGlvbiB8fCBfLmNvbnN0YW50KHRydWUpO1xuICBcbiAgdGhpcy5fY29uZGl0aW9uID0gb3B0aW9ucy5jb25kaXRpb24gfHwgXy5jb25zdGFudCh0cnVlKTtcbiAgXG4gIC8vIHF1aSBzaSBkZWZpbmlzY29ubyBpIG1ldG9kaSBjaGUgdm9nbGlhbW8gcG90ZXIgaW50ZXJjZXR0YXJlLCBlZCBldmVudHVhbG1lbnRlIGJsb2NjYXJlICh2ZWRpIEFQSSBHM1dPYmplY3QpXG4gIHRoaXMuc2V0dGVycyA9IHtcbiAgICBhZGRGZWF0dXJlOiB7XG4gICAgICBmbmM6IEFkZEZlYXR1cmVUb29sLnByb3RvdHlwZS5fYWRkRmVhdHVyZSxcbiAgICAgIGZhbGxiYWNrOiBBZGRGZWF0dXJlVG9vbC5wcm90b3R5cGUuX2ZhbGxCYWNrXG4gICAgfVxuICB9O1xuICBcbiAgYmFzZSh0aGlzLGVkaXRvcik7XG59XG5pbmhlcml0KEFkZEZlYXR1cmVUb29sLEVkaXRpbmdUb29sKTtcbm1vZHVsZS5leHBvcnRzID0gQWRkRmVhdHVyZVRvb2w7XG5cbnZhciBwcm90byA9IEFkZEZlYXR1cmVUb29sLnByb3RvdHlwZTtcblxuLy8gbWV0b2RvIGVzZWd1aXRvIGFsbCdhdnZpbyBkZWwgdG9vbFxucHJvdG8ucnVuID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBcbiAgdGhpcy5kcmF3SW50ZXJhY3Rpb24gPSBuZXcgb2wuaW50ZXJhY3Rpb24uRHJhdyh7XG4gICAgdHlwZTogdGhpcy5lZGl0b3IuZ2V0RWRpdFZlY3RvckxheWVyKCkuZ2VvbWV0cnl0eXBlLFxuICAgIHNvdXJjZTogdGhpcy5zb3VyY2UsXG4gICAgY29uZGl0aW9uOiB0aGlzLl9jb25kaXRpb24sXG4gICAgZmluaXNoQ29uZGl0aW9uOiB0aGlzLl9maW5pc2hDb25kaXRpb24gLy8gZGlzcG9uaWJpbGUgZGEgaHR0cHM6Ly9naXRodWIuY29tL29wZW5sYXllcnMvb2wzL2NvbW1pdC9kNDI1Zjc1YmVhMDVjYjc3NTU5OTIzZTQ5NGY1NDE1NmM2NjkwYzBiXG4gIH0pO1xuICB0aGlzLmFkZEludGVyYWN0aW9uKHRoaXMuZHJhd0ludGVyYWN0aW9uKTtcbiAgdGhpcy5kcmF3SW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICBcbiAgdGhpcy5kcmF3SW50ZXJhY3Rpb24ub24oJ2RyYXdzdGFydCcsZnVuY3Rpb24oZSl7XG4gICAgc2VsZi5lZGl0b3IuZW1pdCgnZHJhd3N0YXJ0JyxlKTtcbiAgfSk7XG4gIFxuICB0aGlzLmRyYXdJbnRlcmFjdGlvbi5vbignZHJhd2VuZCcsZnVuY3Rpb24oZSl7XG4gICAgc2VsZi5lZGl0b3IuZW1pdCgnZHJhd2VuZCcsZSk7XG4gICAgaWYgKCFzZWxmLl9idXN5KXtcbiAgICAgIHNlbGYuX2J1c3kgPSB0cnVlO1xuICAgICAgc2VsZi5wYXVzZSgpO1xuICAgICAgc2VsZi5hZGRGZWF0dXJlKGUuZmVhdHVyZSk7XG4gICAgfVxuICB9KTtcbiAgXG4gIGlmICh0aGlzLl9zbmFwKXtcbiAgICB0aGlzLl9zbmFwSW50ZXJhY3Rpb24gPSBuZXcgb2wuaW50ZXJhY3Rpb24uU25hcCh7XG4gICAgICBzb3VyY2U6IHRoaXMuX3NuYXAudmVjdG9yTGF5ZXIuZ2V0U291cmNlKClcbiAgICB9KTtcbiAgICB0aGlzLmFkZEludGVyYWN0aW9uKHRoaXMuX3NuYXBJbnRlcmFjdGlvbik7XG4gIH1cbn07XG5cbnByb3RvLnBhdXNlID0gZnVuY3Rpb24ocGF1c2Upe1xuICBpZiAoXy5pc1VuZGVmaW5lZChwYXVzZSkgfHwgcGF1c2Upe1xuICAgIGlmICh0aGlzLl9zbmFwSW50ZXJhY3Rpb24pe1xuICAgICAgdGhpcy5fc25hcEludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgfVxuICAgIHRoaXMuZHJhd0ludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gIH1cbiAgZWxzZSB7XG4gICAgaWYgKHRoaXMuX3NuYXBJbnRlcmFjdGlvbil7XG4gICAgICB0aGlzLl9zbmFwSW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICAgIH1cbiAgICB0aGlzLmRyYXdJbnRlcmFjdGlvbi5zZXRBY3RpdmUodHJ1ZSk7XG4gIH1cbn07XG5cbi8vIG1ldG9kbyBlc2VndWl0byBhbGxhIGRpc2F0dGl2YXppb25lIGRlbCB0b29sXG5wcm90by5zdG9wID0gZnVuY3Rpb24oKXtcbiAgaWYgKHRoaXMuX3NuYXBJbnRlcmFjdGlvbil7XG4gICAgIHRoaXMucmVtb3ZlSW50ZXJhY3Rpb24odGhpcy5fc25hcEludGVyYWN0aW9uKTtcbiAgICAgdGhpcy5fc25hcEludGVyYWN0aW9uID0gbnVsbDtcbiAgfVxuICB0aGlzLnJlbW92ZUludGVyYWN0aW9uKHRoaXMuZHJhd0ludGVyYWN0aW9uKTtcbiAgdGhpcy5kcmF3SW50ZXJhY3Rpb24gPSBudWxsO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbnByb3RvLnJlbW92ZUxhc3RQb2ludCA9IGZ1bmN0aW9uKCl7XG4gIGlmICh0aGlzLmRyYXdJbnRlcmFjdGlvbil7XG4gICAgLy8gcHJvdm8gYSByaW11b3ZlcmUgbCd1bHRpbW8gcHVudG8uIE5lbCBjYXNvIG5vbiBlc2lzdGEgbGEgZ2VvbWV0cmlhIGdlc3Rpc2NvIHNpbGVuemlvc2FtZW50ZSBsJ2Vycm9yZVxuICAgIHRyeXtcbiAgICAgIHRoaXMuZHJhd0ludGVyYWN0aW9uLnJlbW92ZUxhc3RQb2ludCgpO1xuICAgIH1cbiAgICBjYXRjaCAoZSl7XG4gICAgICAvL1xuICAgIH1cbiAgfVxufTtcblxucHJvdG8uX2FkZEZlYXR1cmUgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgLy8gYWdnaXVuZ28gbGEgZ2VvbWV0cmlhIG5lbGwnZWRpdCBidWZmZXJcbiAgdGhpcy5lZGl0b3IuYWRkRmVhdHVyZShmZWF0dXJlKTtcbiAgdGhpcy5fYnVzeSA9IGZhbHNlO1xuICB0aGlzLnBhdXNlKGZhbHNlKTtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5wcm90by5fZmFsbEJhY2sgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgdGhpcy5fYnVzeSA9IGZhbHNlO1xuICAvLyByaW11b3ZvIGwndWx0aW1hIGZlYXR1cmUgaW5zZXJpdGEsIG92dmVybyBxdWVsbGEgZGlzZWduYXRhIG1hIGNoZSBub24gc2kgdnVvbGUgc2FsdmFyZVxuICB0aGlzLnNvdXJjZS5nZXRGZWF0dXJlc0NvbGxlY3Rpb24oKS5wb3AoKTtcbiAgdGhpcy5wYXVzZShmYWxzZSk7XG59O1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgZ2VvbSA9IHJlcXVpcmUoJ2NvcmUvZ2VvbWV0cnkvZ2VvbScpO1xudmFyIFBpY2tGZWF0dXJlSW50ZXJhY3Rpb24gPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9pbnRlcmFjdGlvbnMvcGlja2ZlYXR1cmVpbnRlcmFjdGlvbicpO1xudmFyIFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uID0gcmVxdWlyZSgnZzN3LW9sMy9zcmMvaW50ZXJhY3Rpb25zL3BpY2tjb29yZGluYXRlc2ludGVyYWN0aW9uJyk7XG5cbnZhciBFZGl0aW5nVG9vbCA9IHJlcXVpcmUoJy4vZWRpdGluZ3Rvb2wnKTtcblxuZnVuY3Rpb24gQ3V0TGluZVRvb2woZWRpdG9yLG9wdGlvbnMpe1xuICB0aGlzLnNldHRlcnMgPSB7XG4gICAgY3V0TGluZTogQ3V0TGluZVRvb2wucHJvdG90eXBlLl9jdXRMaW5lXG4gIH07XG4gIFxuICBiYXNlKHRoaXMsZWRpdG9yLG9wdGlvbnMpO1xuICBcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmlzUGF1c2FibGUgPSB0cnVlO1xuICB0aGlzLnN0ZXBzID0gbmV3IEVkaXRpbmdUb29sLlN0ZXBzKEN1dExpbmVUb29sLnN0ZXBzKTtcbiAgXG4gIHRoaXMuX29yaWdGZWF0dXJlID0gbnVsbDtcbiAgdGhpcy5fb3JpZ0dlb21ldHJ5ID0gbnVsbDtcbiAgdGhpcy5fbmV3RmVhdHVyZXMgPSBbXTtcbiAgdGhpcy5fbGluZVBpY2tJbnRlcmFjdGlvbiA9IG51bGw7XG4gIHRoaXMuX3BvaW50UGlja0ludGVyYWN0aW9uID0gbnVsbDtcbiAgdGhpcy5fc2VsZWN0TGluZVRvS2VlcEludGVyYWN0aW9uID0gbnVsbDtcbiAgdGhpcy5fcG9pbnRMYXllciA9IG9wdGlvbnMucG9pbnRMYXllciB8fCBudWxsO1xuICB0aGlzLl9taW5DdXRQb2ludERpc3RhbmNlID0gb3B0aW9ucy5taW5DdXRQb2ludERpc3RhbmNlIHx8IEluZmluaXR5O1xuICB0aGlzLl9tb2RUeXBlID0gb3B0aW9ucy5tb2RUeXBlIHx8ICdNT0RPTkNVVCc7IC8vICdORVdPTkNVVCcgfCAnTU9ET05DVVQnXG4gIFxuICB0aGlzLl9zZWxlY3RlZExpbmVPdmVybGF5ID0gbmV3IG9sLmxheWVyLlZlY3Rvcih7XG4gICAgc291cmNlOiBuZXcgb2wuc291cmNlLlZlY3RvcigpLFxuICAgIHN0eWxlOiBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgICAgY29sb3I6ICdyZ2IoMjU1LDI1NSwwKScsXG4gICAgICAgIHdpZHRoOiA0XG4gICAgICB9KVxuICAgIH0pXG4gIH0pO1xuICBcbiAgLy92YXIgY3V0TGluZUlkeCA9IDA7XG4gIC8vdmFyIGN1dExpbmVDb2xvcnMgPSBbJ3JnYigyNTUsMCwwKScsJ3JnYigwLDAsMjU1KSddXG4gIHRoaXMuX2xpbmVUb0tlZXBPdmVybGF5ID0gbmV3IG9sLmxheWVyLlZlY3Rvcih7XG4gICAgc291cmNlOiBuZXcgb2wuc291cmNlLlZlY3RvcigpLFxuICAgIC8qc3R5bGU6IGZ1bmN0aW9uKGZlYXR1cmUpeyBcbiAgICAgIGN1dExpbmVJZHggKz0gMTtcbiAgICAgIHJldHVybiBbbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgICAgICBjb2xvcjogY3V0TGluZUNvbG9yc1tjdXRMaW5lSWR4JTJdLFxuICAgICAgICAgIHdpZHRoOiA0XG4gICAgICAgIH0pXG4gICAgICB9KV1cbiAgICB9Ki9cbiAgfSk7XG5cbiAgXG59XG5pbmhlcml0KEN1dExpbmVUb29sLEVkaXRpbmdUb29sKTtcbm1vZHVsZS5leHBvcnRzID0gQ3V0TGluZVRvb2w7XG5cbnZhciBwcm90byA9IEN1dExpbmVUb29sLnByb3RvdHlwZTtcblxucHJvdG8ucnVuID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBcbiAgdGhpcy5fbGluZVBpY2tJbnRlcmFjdGlvbiA9IG5ldyBQaWNrRmVhdHVyZUludGVyYWN0aW9uKHtcbiAgICBsYXllcnM6IFt0aGlzLmxheWVyLHRoaXMuZWRpdGluZ0xheWVyXVxuICB9KTtcbiAgXG4gIHRoaXMuYWRkSW50ZXJhY3Rpb24odGhpcy5fbGluZVBpY2tJbnRlcmFjdGlvbik7XG4gIFxuICAvLyBzZWxlemlvbm8gbGEgbGluZWEgZGEgdGFnbGlhcmVcbiAgc2VsZi5zdGVwcy5uZXh0KCk7XG4gIHRoaXMuX2xpbmVQaWNrSW50ZXJhY3Rpb24ub24oJ3BpY2tlZCcsZnVuY3Rpb24oZSl7XG4gICAgdmFyIGN1dEZlYXR1cmU7XG4gICAgdmFyIGZlYXR1cmUgPSBzZWxmLl9vcmlnRmVhdHVyZSA9IGUuZmVhdHVyZTtcbiAgICBzZWxmLl9vcmlnR2VvbWV0cnkgPSBmZWF0dXJlLmdldEdlb21ldHJ5KCkuY2xvbmUoKTtcbiAgICBzZWxmLl9zaG93U2VsZWN0aW9uKHNlbGYuX29yaWdHZW9tZXRyeSwzMDApO1xuICAgIHNlbGYucmVtb3ZlSW50ZXJhY3Rpb24odGhpcyk7XG5cbiAgICBcbiAgICBpZiAoc2VsZi5fcG9pbnRMYXllcil7XG4gICAgICBzZWxmLl9wb2ludFBpY2tJbnRlcmFjdGlvbiA9IG5ldyBQaWNrRmVhdHVyZUludGVyYWN0aW9uKHtcbiAgICAgICAgbGF5ZXJzOiBbc2VsZi5fcG9pbnRMYXllcl1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHNlbGYuX3BvaW50UGlja0ludGVyYWN0aW9uID0gbmV3IFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uKCk7XG4gICAgfVxuICAgIFxuICAgIC8vIHBlc2NvIGNvb3JkaW5hdGEgbyBmZWF0dXJlIGRpIHRhZ2xpbyBzZWxlemlvbmF0YVxuICAgIHNlbGYuc3RlcHMubmV4dCgpO1xuICAgIHNlbGYuX3BvaW50UGlja0ludGVyYWN0aW9uLm9uKCdwaWNrZWQnLGZ1bmN0aW9uKGUpe1xuICAgICAgc2VsZi5yZW1vdmVJbnRlcmFjdGlvbih0aGlzKTtcbiAgICAgIHZhciBjb29yZGluYXRlO1xuICAgICAgaWYgKGUuZmVhdHVyZSl7XG4gICAgICAgIGN1dEZlYXR1cmUgPSBlLmZlYXR1cmU7XG4gICAgICAgIGNvb3JkaW5hdGUgPSBjdXRGZWF0dXJlLmdldEdlb21ldHJ5KCkuZ2V0Q29vcmRpbmF0ZXMoKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjb29yZGluYXRlID0gZS5jb29yZGluYXRlO1xuICAgICAgfVxuICAgICAgaWYgKGNvb3JkaW5hdGUpe1xuICAgICAgICAvLyBzbmFwcG8gc3VsbGEgbGluZWFcbiAgICAgICAgdmFyIGNsb3Nlc3RDb29yZGluYXRlID0gZmVhdHVyZS5nZXRHZW9tZXRyeSgpLmdldENsb3Nlc3RQb2ludChjb29yZGluYXRlKTtcbiAgICAgICAgdmFyIGRpc3RhbmNlID0gZ2VvbS5kaXN0YW5jZShjb29yZGluYXRlLGNsb3Nlc3RDb29yZGluYXRlKTtcbiAgICAgICAgLy8gc2UgbG8gc25hcCDDqCBlbnRybyBsYSB0b2xsZXJhbnphXG4gICAgICAgIGlmIChkaXN0YW5jZSA8IHNlbGYuX21pbkN1dFBvaW50RGlzdGFuY2Upe1xuICAgICAgICAgIC8vIHRhZ2xpbyBsYSBsaW5lYSBlIG90dGVuZ28gbCdhcnJheSBjb24gbGUgZHVlIG51b3ZlIGZlYXR1cmVcbiAgICAgICAgICB2YXIgc2xpY2VkTGluZXMgPSBzZWxmLl9jdXQoZmVhdHVyZS5nZXRHZW9tZXRyeSgpLGNsb3Nlc3RDb29yZGluYXRlKTtcbiAgICAgICAgICBpZiAoc2xpY2VkTGluZXMpe1xuICAgICAgICAgICAgdmFyIHByZXZMaW5lRmVhdHVyZSA9IHNsaWNlZExpbmVzWzBdO1xuICAgICAgICAgICAgdmFyIG5leHRMaW5lRmVhdHVyZSA9IHNsaWNlZExpbmVzWzFdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbmV3SWQgPSBzZWxmLmVkaXRvci5nZW5lcmF0ZUlkKCk7XG4gICAgICAgICAgICBwcmV2TGluZUZlYXR1cmUuc2V0SWQobmV3SWQrJ18xJyk7XG4gICAgICAgICAgICBuZXh0TGluZUZlYXR1cmUuc2V0SWQobmV3SWQrJ18yJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHByZW5kbyBsZSBwcm9wcmlldMOgIGRlbGxhIGZlYXR1cmUgb3JpZ2luYWxlIChlc2NsdXNhIGxhIGdlb21ldHJpYSlcbiAgICAgICAgICAgIHZhciBvcmlnUHJvcGVydGllcyA9IGZlYXR1cmUuZ2V0UHJvcGVydGllcygpO1xuICAgICAgICAgICAgZGVsZXRlIG9yaWdQcm9wZXJ0aWVzW2ZlYXR1cmUuZ2V0R2VvbWV0cnlOYW1lKCldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBzZWxmLl9zaG93U2VsZWN0aW9uKHByZXZMaW5lRmVhdHVyZS5nZXRHZW9tZXRyeSgpLDMwMCk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgIHNlbGYuX3Nob3dTZWxlY3Rpb24obmV4dExpbmVGZWF0dXJlLmdldEdlb21ldHJ5KCksMzAwKTtcbiAgICAgICAgICAgIH0sMzAwKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBuZWwgY2FzbyBkaSBtb2RpZmljYSBzdSB0YWdsaW9cbiAgICAgICAgICAgIGlmIChzZWxmLl9tb2RUeXBlID09ICdNT0RPTkNVVCcpe1xuICAgICAgICAgICAgICAvLyBzZWxlemlvbm8gbGEgcG9yemlvbmUgZGEgbWFudGVuZXJlL21vZGlmaWNhcmVcbiAgICAgICAgICAgICAgc2VsZi5zdGVwcy5uZXh0KCk7XG4gICAgICAgICAgICAgIHNlbGYuX3NlbGVjdExpbmVUb0tlZXAocHJldkxpbmVGZWF0dXJlLG5leHRMaW5lRmVhdHVyZSlcbiAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZmVhdHVyZVRvS2VlcCl7XG4gICAgICAgICAgICAgICAgLy8gYWdnaW9ybm8gbGEgZmVhdHVyZSBvcmlnaW5hbGUgY29uIGxhIGdlb21ldHJpYSBkZWxsYSBmZWF0dXJlIGNoZSBzaSDDqCBzZWxlemlvbmF0byBkYSBtYW50ZW5lcmVcbiAgICAgICAgICAgICAgICBmZWF0dXJlLnNldEdlb21ldHJ5KGZlYXR1cmVUb0tlZXAuZ2V0R2VvbWV0cnkoKS5jbG9uZSgpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB2YXIgZmVhdHVyZVRvQWRkO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIHJpbXVvdm8gdW5hIGRlbGxlIGR1ZSBudW92ZSBmZWF0dXJlIGUgbWkgdGVuZ28gbCd1bmljYSBmZWF0dXJlIGRhIGFnZ2l1bmdlcmUgY29tZSBudW92YVxuICAgICAgICAgICAgICAgIGlmIChwcmV2TGluZUZlYXR1cmUuZ2V0SWQoKSA9PSBmZWF0dXJlVG9LZWVwLmdldElkKCkpe1xuICAgICAgICAgICAgICAgICAgZGVsZXRlIHByZXZMaW5lRmVhdHVyZTtcbiAgICAgICAgICAgICAgICAgIGZlYXR1cmVUb0FkZCA9IG5leHRMaW5lRmVhdHVyZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobmV4dExpbmVGZWF0dXJlLmdldElkKCkgPT0gZmVhdHVyZVRvS2VlcC5nZXRJZCgpKXtcbiAgICAgICAgICAgICAgICAgIGRlbGV0ZSBuZXh0TGluZUZlYXR1cmU7XG4gICAgICAgICAgICAgICAgICBmZWF0dXJlVG9BZGQgPSBwcmV2TGluZUZlYXR1cmU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHNlbGYuX25ld0ZlYXR1cmVzLnB1c2goZmVhdHVyZVRvQWRkKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyB0cmFtaXRlIGwnZWRpdG9yIGFzc2Vnbm8gYWxsYSBudW92YSBmZWF0dXJlIGdsaSBzdGVzc2kgYXR0cmlidXRpIGRlbGwnYWx0cmEsIG9yaWdpbmFsZSwgbW9kaWZpY2F0YVxuICAgICAgICAgICAgICAgIGZlYXR1cmVUb0FkZC5zZXRQcm9wZXJ0aWVzKG9yaWdQcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgICAgICAvLyBlIGxhIGFnZ2l1bmdvIGFsIGxheWVyIGRpIGVkaXRpbmcsIGNvc8OsIG1pIHZpZW5lIG1vc3RyYXRhIGNvbWUgbnVvdmEgZmVhdHVyZSBzdWxsYSBtYXBwYVxuICAgICAgICAgICAgICAgIHNlbGYuZWRpdGluZ0xheWVyLmdldFNvdXJjZSgpLmFkZEZlYXR1cmVzKFtmZWF0dXJlVG9BZGRdKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgIGFkZGVkOiBbZmVhdHVyZVRvQWRkXSxcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZWQ6IGZlYXR1cmUsXG4gICAgICAgICAgICAgICAgICBjdXRmZWF0dXJlOmN1dEZlYXR1cmVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gYSBxdWVzdG8gcHVudG8gYXZ2aW8gaWwgc2V0dGVyLCBjaGUgc2kgb2NjdXBlcsOyIGRpIGFnZ2lvcm5hcmUgbCdlZGl0YnVmZmVyIGEgc2Vjb25kYSBkZWwgdGlwbyBkaSBtb2RpZmljYVxuICAgICAgICAgICAgICAgIHNlbGYuY3V0TGluZShkYXRhLHNlbGYuX21vZFR5cGUpXG4gICAgICAgICAgICAgICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgIHNlbGYuX3JvbGxCYWNrKCk7XG4gICAgICAgICAgICAgICAgICBzZWxmLnJlcnVuKCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAvLyBuZWwgY2FzbyBsYSBtb2RpZmljYSBzaWEgYWdnaXVuZ28gc3UgdGFnbGlhLCBhbGxvcmEgcmltdW92byBsJ29yaWdpbmFsZSBlIGFnZ2l1bmdvIGxlIGR1ZSBudW92ZSBmZWF0dXJlXG4gICAgICAgICAgICAgIHNlbGYubGF5ZXIuZ2V0U291cmNlKCkucmVtb3ZlRmVhdHVyZShmZWF0dXJlKTtcbiAgICAgICAgICAgICAgLy9zZWxmLmVkaXRvci5zZXRBdHRyaWJ1dGVzKHByZXZMaW5lRmVhdHVyZSxvcmlnUHJvcGVydGllcyk7XG4gICAgICAgICAgICAgIC8vc2VsZi5lZGl0b3Iuc2V0QXR0cmlidXRlcyhuZXh0TGluZUZlYXR1cmUsb3JpZ1Byb3BlcnRpZXMpO1xuICAgICAgICAgICAgICBzZWxmLl9uZXdGZWF0dXJlcy5wdXNoKHByZXZMaW5lRmVhdHVyZSk7XG4gICAgICAgICAgICAgIHNlbGYuX25ld0ZlYXR1cmVzLnB1c2gobmV4dExpbmVGZWF0dXJlKTtcbiAgICAgICAgICAgICAgc2VsZi5lZGl0aW5nTGF5ZXIuZ2V0U291cmNlKCkuYWRkRmVhdHVyZXMoW2ZlYXR1cmVUb0FkZCxwcmV2TGluZUZlYXR1cmVdKTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgICAgIGFkZGVkOiBbcHJldkxpbmVGZWF0dXJlLG5leHRMaW5lRmVhdHVyZV0sXG4gICAgICAgICAgICAgICAgcmVtb3ZlZDogZmVhdHVyZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBzZWxmLmN1dExpbmUoZGF0YSxzZWxmLl9tb2RUeXBlKVxuICAgICAgICAgICAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuX3JvbGxCYWNrKCk7XG4gICAgICAgICAgICAgICAgc2VsZi5yZXJ1bigpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNlbGYucmVydW4oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIHNlbGYuYWRkSW50ZXJhY3Rpb24oc2VsZi5fcG9pbnRQaWNrSW50ZXJhY3Rpb24pO1xuICB9KTtcbn07XG5cbnByb3RvLnBhdXNlID0gZnVuY3Rpb24ocGF1c2Upe1xuICBpZiAoXy5pc1VuZGVmaW5lZChwYXVzZSkgfHwgcGF1c2Upe1xuICAgIHRoaXMuX2xpbmVQaWNrSW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB0aGlzLl9wb2ludFBpY2tJbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICB9XG4gIGVsc2Uge1xuICAgIHRoaXMuX2xpbmVQaWNrSW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICAgIHRoaXMuX3BvaW50UGlja0ludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbiAgfVxufTtcblxucHJvdG8ucmVydW4gPSBmdW5jdGlvbigpe1xuICB0aGlzLnN0b3AoKTtcbiAgdGhpcy5ydW4oKTtcbn07XG5cbnByb3RvLnN0b3AgPSBmdW5jdGlvbigpe1xuICB0aGlzLl9jbGVhblVwKCk7XG4gIFxuICB2YXIgc3RvcCA9IEVkaXRpbmdUb29sLnByb3RvdHlwZS5zdG9wLmNhbGwodGhpcyk7XG4gIFxuICBpZiAoc3RvcCkge1xuICAgIHRoaXMucmVtb3ZlSW50ZXJhY3Rpb24odGhpcy5fbGluZVBpY2tJbnRlcmFjdGlvbik7XG4gICAgdGhpcy5yZW1vdmVJbnRlcmFjdGlvbih0aGlzLl9wb2ludFBpY2tJbnRlcmFjdGlvbik7XG4gICAgdGhpcy5fbGluZVBpY2tJbnRlcmFjdGlvbiA9IG51bGw7XG4gICAgdGhpcy5fcG9pbnRQaWNrSW50ZXJhY3Rpb24gPSBudWxsO1xuICB9XG5cbiAgcmV0dXJuIHN0b3A7XG59O1xuXG5wcm90by5fY2xlYW5VcCA9IGZ1bmN0aW9uKCl7XG4gIHRoaXMuX29yaWdGZWF0dXJlID0gbnVsbDtcbiAgdGhpcy5fb3JpZ0dlb21ldHJ5ID0gbnVsbDtcbiAgdGhpcy5fbmV3RmVhdHVyZXMgPSBbXTtcbiAgdGhpcy5fbGluZVRvS2VlcE92ZXJsYXkuc2V0TWFwKG51bGwpO1xuICB0aGlzLl9zZWxlY3RlZExpbmVPdmVybGF5LnNldE1hcChudWxsKTtcbn07XG5cbnByb3RvLl9yb2xsQmFjayA9IGZ1bmN0aW9uKCl7XG4gIC8vIHJpbWV0dG8gbGEgdmVjY2hpYSBnZW9tZXRyaWFcbiAgdGhpcy5fb3JpZ0ZlYXR1cmUuc2V0R2VvbWV0cnkodGhpcy5fb3JpZ0dlb21ldHJ5KTtcbiAgLy8gcmltdW92byBsZSBmZWF0dXJlIChudW92ZSkgZWRpdGF0ZSBkYWwgbGF5ZXIgZGkgZWRpdGF6aW9uZVxuICB0cnkge1xuICAgIF8uZm9yRWFjaCh0aGlzLl9uZXdGZWF0dXJlcyxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHNlbGYuZWRpdGluZ0xheWVyLmdldFNvdXJjZSgpLnJlbW92ZUZlYXR1cmUoZmVhdHVyZSk7XG4gICAgfSk7XG4gIH1cbiAgY2F0Y2ggKGUpIHt9O1xufTtcblxucHJvdG8uX2N1dExpbmUgPSBmdW5jdGlvbihkYXRhLG1vZFR5cGUpe1xuICAvLyBzZSBtb2RpZmljbyBzdSB0YWdsaW8gYWdnaW9ybm8gbGEgdmVjY2hpYSBmZWF0dXJlIGUgYWdnaXVuZ28gbGEgbnVvdmFcbiAgaWYgKG1vZFR5cGUgPT0gJ01PRE9OQ1VUJyl7XG4gICAgdmFyIGZlYXR1cmVUb1VwZGF0ZSA9IGRhdGEudXBkYXRlZDtcbiAgICB2YXIgZmVhdHVyZVRvQWRkID0gZGF0YS5hZGRlZFswXTtcbiAgICB0aGlzLmVkaXRvci51cGRhdGVGZWF0dXJlKGZlYXR1cmVUb1VwZGF0ZSk7XG4gICAgdGhpcy5lZGl0b3IuYWRkRmVhdHVyZShmZWF0dXJlVG9BZGQpO1xuICB9XG4gIC8vIGFsdHJpbWVudGkgcmltdW92byBsYSB2ZWNjaGlhIGUgYWdnaXVuZ28gbGUgbnVvdmVcbiAgZWxzZXtcbiAgICB2YXIgZmVhdHVyZVRvUmVtb3ZlID0gZGF0YS5yZW1vdmVkO1xuICAgIHZhciBmZWF0dXJlVG9BZGQxID0gZGF0YS5hZGRlZFswXTtcbiAgICB2YXIgZmVhdHVyZVRvQWRkMiA9IGRhdGEuYWRkZWRbMV07XG4gICAgdGhpcy5lZGl0b3IuZGVsZXRlRmVhdHVyZShmZWF0dXJlVG9SZW1vdmUpO1xuICAgIHRoaXMuZWRpdG9yLmFkZEZlYXR1cmUoZmVhdHVyZVRvQWRkMSk7XG4gICAgdGhpcy5lZGl0b3IuYWRkRmVhdHVyZShmZWF0dXJlVG9BZGQyKTtcbiAgfVxuICB0aGlzLl9idXN5ID0gZmFsc2U7XG4gIHRoaXMucGF1c2UoZmFsc2UpO1xuICB0aGlzLnN0ZXBzLmNvbXBsZXRlZCgpO1xuICB0aGlzLnJlcnVuKCk7XG4gIHJldHVybiB0cnVlO1xufTtcblxucHJvdG8uX3NlbGVjdExpbmVUb0tlZXAgPSBmdW5jdGlvbihwcmV2TGluZUZlYXR1cmUsbmV4dExpbmVGZWF0dXJlKXtcbiAgdmFyIGQgPSAkLkRlZmVycmVkKCk7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGxheWVyID0gdGhpcy5fbGluZVRvS2VlcE92ZXJsYXk7XG4gIGxheWVyLmdldFNvdXJjZSgpLmFkZEZlYXR1cmVzKFtwcmV2TGluZUZlYXR1cmUsbmV4dExpbmVGZWF0dXJlXSk7XG4gIGxheWVyLnNldE1hcCh0aGlzLmVkaXRvci5nZXRNYXBTZXJ2aWNlKCkudmlld2VyLm1hcCk7XG4gIFxuICB2YXIgc2VsZWN0TGluZUludGVyYWN0aW9uID0gbmV3IFBpY2tGZWF0dXJlSW50ZXJhY3Rpb24oe1xuICAgIGxheWVyczogW3RoaXMuX2xpbmVUb0tlZXBPdmVybGF5XSxcbiAgfSk7XG4gIHRoaXMuYWRkSW50ZXJhY3Rpb24oc2VsZWN0TGluZUludGVyYWN0aW9uKTtcbiAgXG4gIHNlbGVjdExpbmVJbnRlcmFjdGlvbi5vbigncGlja2VkJyxmdW5jdGlvbihlKXtcbiAgICBsYXllci5zZXRNYXAobnVsbCk7XG4gICAgc2VsZi5yZW1vdmVJbnRlcmFjdGlvbih0aGlzKTtcbiAgICBkLnJlc29sdmUoZS5mZWF0dXJlKTtcbiAgfSk7XG4gIFxuICByZXR1cm4gZC5wcm9taXNlKCk7XG59O1xuXG5wcm90by5fZmFsbEJhY2sgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgdGhpcy5fYnVzeSA9IGZhbHNlO1xuICB0aGlzLnBhdXNlKGZhbHNlKTtcbn07XG5cbnByb3RvLl9jdXQgPSBmdW5jdGlvbihnZW9tZXRyeSxjdXRDb29yZGluYXRlKXtcbiAgd2hpbGUgKGN1dENvb3JkaW5hdGUubGVuZ3RoIDwgZ2VvbWV0cnkuZ2V0U3RyaWRlKCkpIHtcbiAgICBjdXRDb29yZGluYXRlLnB1c2goMCk7XG4gIH1cblxuICB2YXIgbWluRGlzdGFuY2UgPSBJbmZpbml0eTtcbiAgdmFyIGNsb3Nlc3RJbmRleCA9IDA7XG4gIHZhciBpbmRleCA9IDA7XG4gIC8vIGNlcmNvIGwnaW5kaWNlIGRlbCBzZWdtZW50byBsaW5lYXJlIHN1IGN1aSByaWNhZGUgbGEgY29vcmRpbmF0YSBkaSB0YWdsaW9cbiAgZ2VvbWV0cnkuZm9yRWFjaFNlZ21lbnQoZnVuY3Rpb24odjAsdjEpe1xuICAgIHZhciBzZWdtZW50UG9pbnQgPSBnZW9tLmNsb3Nlc3RPblNlZ21lbnQoY3V0Q29vcmRpbmF0ZSxbdjAsdjFdKTtcbiAgICB2YXIgZGlzdGFuY2UgPSBnZW9tLmRpc3RhbmNlKGN1dENvb3JkaW5hdGUsc2VnbWVudFBvaW50KTtcbiAgICBpZiAoZGlzdGFuY2UgPCBtaW5EaXN0YW5jZSl7XG4gICAgICBtaW5EaXN0YW5jZSA9IGRpc3RhbmNlO1xuICAgICAgY2xvc2VzdEluZGV4ID0gaW5kZXg7XG4gICAgfVxuICAgIGluZGV4ICs9IDE7XG4gIH0pXG4gIFxuICB2YXIgY29vcmRpbmF0ZXMgPSBnZW9tZXRyeS5nZXRDb29yZGluYXRlcygpO1xuICAvLyBwcmVuZG8gbGEgcHJpbWEgcG9yemlvbmUgZGkgY29vcmRpbmF0ZVxuICB2YXIgcHJldkNvb3JkcyA9IGNvb3JkaW5hdGVzLnNsaWNlKDAsY2xvc2VzdEluZGV4KzEpO1xuICAvLyBhZ2dpdW5nbyBsYSBjb29yZGluYXRhIGRpIHRhZ2xpbyBhbGxhIHByaW1hIHBvcnppb25lXG4gIHByZXZDb29yZHMuc3BsaWNlKHByZXZDb29yZHMubGVuZ3RoLDAsY3V0Q29vcmRpbmF0ZSk7XG4gIC8vIHByZW5kbyBsYSBzZWNvbmRhIHBvcnppb25lIGRpIGNvb3JkaW5hdGVcbiAgdmFyIG5leHRDb29yZHMgPSBjb29yZGluYXRlcy5zbGljZShjbG9zZXN0SW5kZXgpO1xuICAvLyBhZ2dpdW5nbyBsYSBjb29yZGluYXRhIGRpIHRhZ2xpbyBhbGxhIHNlY29uZGEgcG9yemlvbmVcbiAgbmV4dENvb3Jkcy5zcGxpY2UoMCwxLGN1dENvb3JkaW5hdGUpO1xuICBcbiAgaWYgKHByZXZDb29yZHMubGVuZ3RoIDwgMiB8fCBuZXh0Q29vcmRzLmxlbmd0aCA8IDIpe1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBcbiAgLy8gY3JlbyBsZSBnZW9tZXRyaWVcbiAgdmFyIHByZXZMaW5lID0gbmV3IG9sLmdlb20uTGluZVN0cmluZygpO1xuICBwcmV2TGluZS5zZXRDb29yZGluYXRlcyhwcmV2Q29vcmRzKTtcbiAgdmFyIG5leHRMaW5lID0gbmV3IG9sLmdlb20uTGluZVN0cmluZygpO1xuICBuZXh0TGluZS5zZXRDb29yZGluYXRlcyhuZXh0Q29vcmRzKTtcbiAgXG4gIC8vIGNyZW8gbGUgbnVvdmUgZmVhdHVyZVxuICB2YXIgcHJldkxpbmVGZWF0ID0gbmV3IG9sLkZlYXR1cmUoe1xuICAgIGdlb21ldHJ5OiBwcmV2TGluZVxuICB9KTtcbiAgdmFyIG5leHRMaW5lRmVhdCA9IG5ldyBvbC5GZWF0dXJlKHtcbiAgICBnZW9tZXRyeTogbmV4dExpbmVcbiAgfSk7XG4gIFxuICByZXR1cm4gW3ByZXZMaW5lRmVhdCxuZXh0TGluZUZlYXRdO1xufTtcblxuXG4vLyBUT0RPIHF1ZXN0byBhbmRyw6Agc3Bvc3RhdG8gZGVudHJvIE1hcFNlcnZpY2UgbyBjb211bnF1ZSBpbiB1bmEgbGlicmVyaWEgY29yZVxucHJvdG8uX3Nob3dTZWxlY3Rpb24gPSBmdW5jdGlvbihnZW9tZXRyeSxkdXJhdGlvbil7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGR1cmF0aW9uID0gZHVyYXRpb24gfHwgbnVsbDtcbiAgdmFyIG92ZXJsYXkgPSB0aGlzLl9zZWxlY3RlZExpbmVPdmVybGF5O1xuICBcbiAgdmFyIGZlYXR1cmUgPSBuZXcgb2wuRmVhdHVyZSgpO1xuICBmZWF0dXJlLnNldEdlb21ldHJ5KGdlb21ldHJ5KTtcbiAgb3ZlcmxheS5nZXRTb3VyY2UoKS5hZGRGZWF0dXJlcyhbZmVhdHVyZV0pO1xuICBvdmVybGF5LnNldE1hcCh0aGlzLmVkaXRvci5nZXRNYXBTZXJ2aWNlKCkudmlld2VyLm1hcCk7XG4gIGlmKGR1cmF0aW9uKXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICBvdmVybGF5LnNldE1hcChudWxsKTtcbiAgICAgIHNlbGYuX3NlbGVjdGVkTGluZU92ZXJsYXkuZ2V0U291cmNlKCkuY2xlYXIoKTtcbiAgICB9LGR1cmF0aW9uKTtcbiAgfVxufTtcblxucHJvdG8uX2lzTmV3ID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gIHJldHVybiAoIV8uaXNOaWwodGhpcy5lZGl0aW5nTGF5ZXIuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZUJ5SWQoZmVhdHVyZS5nZXRJZCgpKSkpO1xufTtcblxuQ3V0TGluZVRvb2wuc3RlcHMgPSBbXG4gIHtcbiAgICB0eXBlOiBcInNlbGVjdGxpbmVcIlxuICB9LFxuICB7XG4gICAgdHlwZTogXCJzZWxlY3RjdXRwb2ludFwiXG4gIH0sXG4gIHtcbiAgICB0eXBlOiBcInNlbGVjdHBhcnR0b2tlZXBcIlxuICB9XG5dXG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xudmFyIERlbGV0ZUludGVyYWN0aW9uID0gcmVxdWlyZSgnZzN3LW9sMy9zcmMvaW50ZXJhY3Rpb25zLy9kZWxldGVmZWF0dXJlaW50ZXJhY3Rpb24nKTtcblxudmFyIEVkaXRpbmdUb29sID0gcmVxdWlyZSgnLi9lZGl0aW5ndG9vbCcpO1xuXG5mdW5jdGlvbiBEZWxldGVGZWF0dXJlVG9vbChlZGl0b3Ipe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuZWRpdG9yID0gZWRpdG9yO1xuICB0aGlzLmlzUGF1c2FibGUgPSB0cnVlO1xuICB0aGlzLmRyYXdJbnRlcmFjdGlvbiA9IG51bGw7XG4gIHRoaXMubGF5ZXIgPSBudWxsO1xuICB0aGlzLmVkaXRpbmdMYXllciA9IG51bGw7XG5cbiAgdGhpcy5zZXR0ZXJzID0ge1xuICAgIGRlbGV0ZUZlYXR1cmU6IERlbGV0ZUZlYXR1cmVUb29sLnByb3RvdHlwZS5fZGVsZXRlRmVhdHVyZVxuICB9O1xuICBcbiAgYmFzZSh0aGlzLGVkaXRvcik7XG59XG5pbmhlcml0KERlbGV0ZUZlYXR1cmVUb29sLEVkaXRpbmdUb29sKTtcbm1vZHVsZS5leHBvcnRzID0gRGVsZXRlRmVhdHVyZVRvb2w7XG5cbnZhciBwcm90byA9IERlbGV0ZUZlYXR1cmVUb29sLnByb3RvdHlwZTtcblxuLyogQlJVVFRJU1NJTU8hIFRvY2NhIHJpZGVmaW5pcmUgdHV0dGUgbGUgcGFydGkgaW50ZXJuZSBkaSBPTDMgbm9uIGVzcG9zdGUgZGFsbGUgQVBJICovXG5cbm9sLmdlb20uR2VvbWV0cnlUeXBlID0ge1xuICBQT0lOVDogJ1BvaW50JyxcbiAgTElORV9TVFJJTkc6ICdMaW5lU3RyaW5nJyxcbiAgTElORUFSX1JJTkc6ICdMaW5lYXJSaW5nJyxcbiAgUE9MWUdPTjogJ1BvbHlnb24nLFxuICBNVUxUSV9QT0lOVDogJ011bHRpUG9pbnQnLFxuICBNVUxUSV9MSU5FX1NUUklORzogJ011bHRpTGluZVN0cmluZycsXG4gIE1VTFRJX1BPTFlHT046ICdNdWx0aVBvbHlnb24nLFxuICBHRU9NRVRSWV9DT0xMRUNUSU9OOiAnR2VvbWV0cnlDb2xsZWN0aW9uJyxcbiAgQ0lSQ0xFOiAnQ2lyY2xlJ1xufTtcblxudmFyIHN0eWxlcyA9IHt9O1xudmFyIHdoaXRlID0gWzI1NSwgMjU1LCAyNTUsIDFdO1xudmFyIGJsdWUgPSBbMCwgMTUzLCAyNTUsIDFdO1xudmFyIHJlZCA9IFsyNTUsIDAsIDAsIDFdO1xudmFyIHdpZHRoID0gMztcbnN0eWxlc1tvbC5nZW9tLkdlb21ldHJ5VHlwZS5QT0xZR09OXSA9IFtcbiAgbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICBjb2xvcjogWzI1NSwgMjU1LCAyNTUsIDAuNV1cbiAgICB9KVxuICB9KVxuXTtcbnN0eWxlc1tvbC5nZW9tLkdlb21ldHJ5VHlwZS5NVUxUSV9QT0xZR09OXSA9XG4gICAgc3R5bGVzW29sLmdlb20uR2VvbWV0cnlUeXBlLlBPTFlHT05dO1xuXG5zdHlsZXNbb2wuZ2VvbS5HZW9tZXRyeVR5cGUuTElORV9TVFJJTkddID0gW1xuICBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgIHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG4gICAgICBjb2xvcjogd2hpdGUsXG4gICAgICB3aWR0aDogd2lkdGggKyAyXG4gICAgfSlcbiAgfSksXG4gIG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgIGNvbG9yOiByZWQsXG4gICAgICB3aWR0aDogd2lkdGhcbiAgICB9KVxuICB9KVxuXTtcbnN0eWxlc1tvbC5nZW9tLkdlb21ldHJ5VHlwZS5NVUxUSV9MSU5FX1NUUklOR10gPVxuICAgIHN0eWxlc1tvbC5nZW9tLkdlb21ldHJ5VHlwZS5MSU5FX1NUUklOR107XG5cbnN0eWxlc1tvbC5nZW9tLkdlb21ldHJ5VHlwZS5DSVJDTEVdID1cbiAgICBzdHlsZXNbb2wuZ2VvbS5HZW9tZXRyeVR5cGUuUE9MWUdPTl0uY29uY2F0KFxuICAgICAgICBzdHlsZXNbb2wuZ2VvbS5HZW9tZXRyeVR5cGUuTElORV9TVFJJTkddXG4gICAgKTtcblxuXG5zdHlsZXNbb2wuZ2VvbS5HZW9tZXRyeVR5cGUuUE9JTlRdID0gW1xuICBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgIGltYWdlOiBuZXcgb2wuc3R5bGUuQ2lyY2xlKHtcbiAgICAgIHJhZGl1czogd2lkdGggKiAyLFxuICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICBjb2xvcjogcmVkXG4gICAgICB9KSxcbiAgICAgIHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG4gICAgICAgIGNvbG9yOiB3aGl0ZSxcbiAgICAgICAgd2lkdGg6IHdpZHRoIC8gMlxuICAgICAgfSlcbiAgICB9KSxcbiAgICB6SW5kZXg6IEluZmluaXR5XG4gIH0pXG5dO1xuc3R5bGVzW29sLmdlb20uR2VvbWV0cnlUeXBlLk1VTFRJX1BPSU5UXSA9XG4gICAgc3R5bGVzW29sLmdlb20uR2VvbWV0cnlUeXBlLlBPSU5UXTtcblxuc3R5bGVzW29sLmdlb20uR2VvbWV0cnlUeXBlLkdFT01FVFJZX0NPTExFQ1RJT05dID1cbiAgICBzdHlsZXNbb2wuZ2VvbS5HZW9tZXRyeVR5cGUuUE9MWUdPTl0uY29uY2F0KFxuICAgICAgICBzdHlsZXNbb2wuZ2VvbS5HZW9tZXRyeVR5cGUuTElORV9TVFJJTkddLFxuICAgICAgICBzdHlsZXNbb2wuZ2VvbS5HZW9tZXRyeVR5cGUuUE9JTlRdXG4gICAgKTtcblxuXG5zdHlsZXNbb2wuZ2VvbS5HZW9tZXRyeVR5cGUuUE9MWUdPTl0gPSBfLmNvbmNhdChzdHlsZXNbb2wuZ2VvbS5HZW9tZXRyeVR5cGUuUE9MWUdPTl0sc3R5bGVzW29sLmdlb20uR2VvbWV0cnlUeXBlLkxJTkVfU1RSSU5HXSk7XG5zdHlsZXNbb2wuZ2VvbS5HZW9tZXRyeVR5cGUuR0VPTUVUUllfQ09MTEVDVElPTl0gPSBfLmNvbmNhdChzdHlsZXNbb2wuZ2VvbS5HZW9tZXRyeVR5cGUuR0VPTUVUUllfQ09MTEVDVElPTl0sc3R5bGVzW29sLmdlb20uR2VvbWV0cnlUeXBlLkxJTkVfU1RSSU5HXSk7XG4gICAgXG4vKiBGSU5FIEJSVVRUSVNTSU1PISAqL1xuXG5wcm90by5ydW4gPSBmdW5jdGlvbigpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMubGF5ZXIgPSB0aGlzLmVkaXRvci5nZXRWZWN0b3JMYXllcigpLmdldExheWVyKCk7XG4gIHRoaXMuZWRpdGluZ0xheWVyID0gdGhpcy5lZGl0b3IuZ2V0RWRpdFZlY3RvckxheWVyKCkuZ2V0TGF5ZXIoKTtcbiAgXG4gIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uID0gbmV3IG9sLmludGVyYWN0aW9uLlNlbGVjdCh7XG4gICAgbGF5ZXJzOiBbdGhpcy5sYXllcix0aGlzLmVkaXRpbmdMYXllcl0sXG4gICAgY29uZGl0aW9uOiBvbC5ldmVudHMuY29uZGl0aW9uLmNsaWNrLFxuICAgIHN0eWxlOiBmdW5jdGlvbihmZWF0dXJlLCByZXNvbHV0aW9uKSB7XG4gICAgICByZXR1cm4gc3R5bGVzW2ZlYXR1cmUuZ2V0R2VvbWV0cnkoKS5nZXRUeXBlKCldO1xuICAgIH1cbiAgfSk7XG4gIHRoaXMuYWRkSW50ZXJhY3Rpb24odGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24pO1xuICBcbiAgdGhpcy5fZGVsZXRlSW50ZXJhY3Rpb24gPSBuZXcgRGVsZXRlSW50ZXJhY3Rpb24oe1xuICAgIGZlYXR1cmVzOiB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpXG4gIH0pO1xuICB0aGlzLmFkZEludGVyYWN0aW9uKHRoaXMuX2RlbGV0ZUludGVyYWN0aW9uKTtcbiAgXG4gIHZhciBvcmlnR2VvbWV0cnkgPSBudWxsO1xuICBcbiAgLyp0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5vbignc2VsZWN0JyxmdW5jdGlvbihlKXtcbiAgICB2YXIgZmVhdHVyZSA9IGUuc2VsZWN0ZWRbMF07XG4gICAgb3JpZ0dlb21ldHJ5ID0gZmVhdHVyZS5nZXRHZW9tZXRyeSgpO1xuICB9KTsqL1xuICBcbiAgdGhpcy5fZGVsZXRlSW50ZXJhY3Rpb24ub24oJ2RlbGV0ZWVuZCcsZnVuY3Rpb24oZSl7XG4gICAgdmFyIGZlYXR1cmUgPSBlLmZlYXR1cmVzLmdldEFycmF5KClbMF07XG4gICAgdmFyIGlzTmV3ID0gc2VsZi5faXNOZXcoZmVhdHVyZSk7XG4gICAgLy90cnkge1xuICAgICAgaWYgKCFzZWxmLl9idXN5KXtcbiAgICAgICAgc2VsZi5fYnVzeSA9IHRydWU7XG4gICAgICAgIHNlbGYucGF1c2UodHJ1ZSk7XG4gICAgICAgIHNlbGYuZGVsZXRlRmVhdHVyZShmZWF0dXJlLGlzTmV3KVxuICAgICAgICAuYWx3YXlzKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgc2VsZi5fYnVzeSA9IGZhbHNlO1xuICAgICAgICAgIHNlbGYucGF1c2UoZmFsc2UpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIC8vfVxuICAgIC8qY2F0Y2ggKGVycm9yKXtcbiAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgIGZlYXR1cmUuc2V0R2VvbWV0cnkob3JpZ0dlb21ldHJ5KTtcbiAgICB9Ki9cbiAgfSk7XG5cbn07XG5cbnByb3RvLnBhdXNlID0gZnVuY3Rpb24ocGF1c2Upe1xuICBpZiAoXy5pc1VuZGVmaW5lZChwYXVzZSkgfHwgcGF1c2Upe1xuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgdGhpcy5fZGVsZXRlSW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgfVxuICBlbHNlIHtcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5zZXRBY3RpdmUodHJ1ZSk7XG4gICAgdGhpcy5fZGVsZXRlSW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICB9XG59O1xuXG5wcm90by5zdG9wID0gZnVuY3Rpb24oKXtcbiAgdmFyIG1hcCA9IEdVSS5nZXRDb21wb25lbnQoJ21hcCcpLmdldFNlcnZpY2UoKS52aWV3ZXIubWFwO1xuICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLmNsZWFyKCk7XG4gIHRoaXMucmVtb3ZlSW50ZXJhY3Rpb24odGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24pO1xuICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbiA9IG51bGw7XG4gIHRoaXMucmVtb3ZlSW50ZXJhY3Rpb24odGhpcy5fZGVsZXRlSW50ZXJhY3Rpb24pO1xuICB0aGlzLl9kZWxldGVJbnRlcmFjdGlvbiA9IG51bGw7XG4gIHJldHVybiB0cnVlO1xufTtcblxucHJvdG8uX2RlbGV0ZUZlYXR1cmUgPSBmdW5jdGlvbihmZWF0dXJlLGlzTmV3KXtcbiAgdGhpcy5lZGl0b3IuZGVsZXRlRmVhdHVyZShmZWF0dXJlLGlzTmV3KTtcbiAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKS5jbGVhcigpO1xuICB0aGlzLl9idXN5ID0gZmFsc2U7XG4gIHRoaXMucGF1c2UoZmFsc2UpO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbnByb3RvLl9mYWxsQmFjayA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICB0aGlzLl9idXN5ID0gZmFsc2U7XG4gIHRoaXMucGF1c2UoZmFsc2UpO1xufTtcblxucHJvdG8uX2lzTmV3ID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gIHJldHVybiAoIV8uaXNOaWwodGhpcy5lZGl0aW5nTGF5ZXIuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZUJ5SWQoZmVhdHVyZS5nZXRJZCgpKSkpO1xufTtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG5cbmZ1bmN0aW9uIEVkaXRpbmdUb29sKGVkaXRvcixvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5faW50ZXJhY3Rpb25zID0gW107XG4gIHRoaXMuZWRpdG9yID0gZWRpdG9yO1xuICB0aGlzLmxheWVyID0gdGhpcy5lZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKS5nZXRNYXBMYXllcigpO1xuICB0aGlzLmVkaXRpbmdMYXllciA9IHRoaXMuZWRpdG9yLmdldEVkaXRWZWN0b3JMYXllcigpLmdldE1hcExheWVyKCk7XG4gIHRoaXMuaXNQYXVzYWJsZSA9IGZhbHNlO1xuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB0aGlzLnN0ZXBzID0gbnVsbDtcbiAgXG4gIC8qdmFyIG1hcFNlcnZpY2UgPSB0aGlzLmVkaXRvci5nZXRNYXBTZXJ2aWNlKCk7XG4gIG1hcFNlcnZpY2Uub24oJ3BvaW50ZXJJbnRlcmFjdGlvblNldCcsZnVuY3Rpb24oaW50ZXJhY3Rpb24pe1xuICAgIHZhciBpc01pbmVJbnRlcmFjdGlvbiA9IGZhbHNlO1xuICAgIF8uZm9yRWFjaChzZWxmLl9pbnRlcmFjdGlvbnMsZnVuY3Rpb24oX2ludGVyYWN0aW9uKXtcbiAgICAgIGlmIChfaW50ZXJhY3Rpb24gPT0gaW50ZXJhY3Rpb24pIHtcbiAgICAgICAgaXNNaW5lSW50ZXJhY3Rpb24gPSB0cnVlO1xuICAgICAgfVxuICAgIH0pXG4gICAgaWYgKCFpc01pbmVJbnRlcmFjdGlvbikge1xuICAgICAgY29uc29sZS5sb2coXCJRdWFsY3VubyBoYSBwcmVzbyBpbCBjb250cm9sbG9cIik7XG4gICAgICBzZWxmLmVkaXRvci5zdG9wVG9vbCgpO1xuICAgIH1cbiAgfSk7Ki9cbiAgXG4gIGJhc2UodGhpcyk7XG59XG5pbmhlcml0KEVkaXRpbmdUb29sLEczV09iamVjdCk7XG5cbnZhciBwcm90byA9IEVkaXRpbmdUb29sLnByb3RvdHlwZTtcblxucHJvdG8uYWRkSW50ZXJhY3Rpb24gPSBmdW5jdGlvbihpbnRlcmFjdGlvbikge1xuICB2YXIgbWFwU2VydmljZSA9IHRoaXMuZWRpdG9yLmdldE1hcFNlcnZpY2UoKTtcbiAgbWFwU2VydmljZS5hZGRJbnRlcmFjdGlvbihpbnRlcmFjdGlvbik7XG4gIHRoaXMuX2ludGVyYWN0aW9ucy5wdXNoKGludGVyYWN0aW9uKTtcbn07XG5cbnByb3RvLnJlbW92ZUludGVyYWN0aW9uID0gZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgdmFyIF9pbnRlcmFjdGlvbnMgPSB0aGlzLl9pbnRlcmFjdGlvbnM7XG4gIHZhciBtYXBTZXJ2aWNlID0gdGhpcy5lZGl0b3IuZ2V0TWFwU2VydmljZSgpO1xuICBfLmZvckVhY2goX2ludGVyYWN0aW9ucyxmdW5jdGlvbihfaW50ZXJhY3Rpb24saWR4KSB7XG4gICAgaWYgKF9pbnRlcmFjdGlvbiA9PSBpbnRlcmFjdGlvbikge1xuICAgICAgX2ludGVyYWN0aW9ucy5zcGxpY2UoaWR4LDEpO1xuICAgIH1cbiAgfSk7XG4gIG1hcFNlcnZpY2UucmVtb3ZlSW50ZXJhY3Rpb24oaW50ZXJhY3Rpb24pO1xufTtcblxucHJvdG8ub3duc0ludGVyYWN0aW9uID0gZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgdmFyIG93bnMgPSBmYWxzZTtcbiAgXy5mb3JFYWNoKHRoaXMuX2ludGVyYWN0aW9ucyxmdW5jdGlvbihfaW50ZXJhY3Rpb24pIHtcbiAgICBpZiAoX2ludGVyYWN0aW9uID09IGludGVyYWN0aW9uKSB7XG4gICAgICBvd25zID0gdHJ1ZTtcbiAgICB9XG4gIH0pXG4gIHJldHVybiBvd25zO1xufTtcblxucHJvdG8uc3RvcCA9IGZ1bmN0aW9uKCl7XG4gIGlmICh0aGlzLnN0ZXBzKSB7XG4gICAgdGhpcy5zdGVwcy5kZXN0cm95KCk7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbkVkaXRpbmdUb29sLlN0ZXBzID0gZnVuY3Rpb24oc3RlcHMpe1xuICB2YXIgaW5kZXggPSAtMTtcbiAgdmFyIHN0ZXBzID0gc3RlcHM7XG4gIFxuICB0aGlzLm5leHQgPSBmdW5jdGlvbigpe1xuICAgIGluZGV4ICs9IDE7XG4gICAgdmFyIHN0ZXAgPSBzdGVwc1tpbmRleF07XG4gICAgdGhpcy5lbWl0KCdzdGVwJyxpbmRleCxzdGVwKTtcbiAgfTtcbiAgXG4gIHRoaXMuY3VycmVudFN0ZXAgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiBzdGVwc1tpbmRleF07XG4gIH07XG4gIFxuICB0aGlzLmN1cnJlbnRTdGVwSW5kZXggPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiBpbmRleDtcbiAgfTtcbiAgXG4gIHRoaXMudG90YWxTdGVwcyA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHN0ZXBzLmxlbmd0aDtcbiAgfTtcbiAgXG4gIHRoaXMucmVzZXQgPSBmdW5jdGlvbigpe1xuICAgIGluZGV4ID0gMDtcbiAgfTtcbiAgXG4gIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgfTtcbiAgXG4gIHRoaXMuY29tcGxldGVkID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLmVtaXQoJ2NvbXBsZXRlJyk7XG4gICAgdGhpcy5yZXNldCgpO1xuICB9O1xuICBcbiAgdGhpcy5pbnNlcnRTdGVwQXQgPSBmdW5jdGlvbihpZHgsc3RlcCl7XG4gICAgc3RlcHMuc3BsaWNlKGlkeCwwLHN0ZXApO1xuICB9XG59XG5pbmhlcml0KEVkaXRpbmdUb29sLlN0ZXBzLEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdGluZ1Rvb2w7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xuXG52YXIgRWRpdGluZ1Rvb2wgPSByZXF1aXJlKCcuL2VkaXRpbmd0b29sJyk7XG5cbmZ1bmN0aW9uIE1vZGlmeUZlYXR1cmVUb29sKGVkaXRvcixvcHRpb25zKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmVkaXRvciA9IGVkaXRvcjtcbiAgdGhpcy5pc1BhdXNhYmxlID0gdHJ1ZTtcbiAgdGhpcy5kcmF3SW50ZXJhY3Rpb24gPSBudWxsO1xuICB0aGlzLmxheWVyID0gbnVsbDtcbiAgdGhpcy5lZGl0aW5nTGF5ZXIgPSBudWxsO1xuICB0aGlzLl9kZWxldGVDb25kaXRpb24gPSBvcHRpb25zLmRlbGV0ZUNvbmRpdGlvbiB8fCB1bmRlZmluZWQ7XG4gIHRoaXMuX3NuYXAgPSBvcHRpb25zLnNuYXAgfHwgbnVsbDtcbiAgdGhpcy5fc25hcEludGVyYWN0aW9uID0gbnVsbDsgXG5cbiAgdGhpcy5zZXR0ZXJzID0ge1xuICAgIG1vZGlmeUZlYXR1cmU6IE1vZGlmeUZlYXR1cmVUb29sLnByb3RvdHlwZS5fbW9kaWZ5RmVhdHVyZVxuICB9O1xuICBcbiAgYmFzZSh0aGlzLGVkaXRvcik7XG59XG5pbmhlcml0KE1vZGlmeUZlYXR1cmVUb29sLEVkaXRpbmdUb29sKTtcbm1vZHVsZS5leHBvcnRzID0gTW9kaWZ5RmVhdHVyZVRvb2w7XG5cbnZhciBwcm90byA9IE1vZGlmeUZlYXR1cmVUb29sLnByb3RvdHlwZTtcblxucHJvdG8ucnVuID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmxheWVyID0gdGhpcy5lZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKS5nZXRNYXBMYXllcigpO1xuICB0aGlzLmVkaXRpbmdMYXllciA9IHRoaXMuZWRpdG9yLmdldEVkaXRWZWN0b3JMYXllcigpLmdldE1hcExheWVyKCk7XG4gIFxuICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbiA9IG5ldyBvbC5pbnRlcmFjdGlvbi5TZWxlY3Qoe1xuICAgIGxheWVyczogW3RoaXMubGF5ZXIsdGhpcy5lZGl0aW5nTGF5ZXJdLFxuICB9KTtcbiAgdGhpcy5hZGRJbnRlcmFjdGlvbih0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbik7XG4gIFxuICB0aGlzLl9tb2RpZnlJbnRlcmFjdGlvbiA9IG5ldyBvbC5pbnRlcmFjdGlvbi5Nb2RpZnkoe1xuICAgIGZlYXR1cmVzOiB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLFxuICAgIGRlbGV0ZUNvbmRpdGlvbjogdGhpcy5fZGVsZXRlQ29uZGl0aW9uLFxuICB9KTtcbiAgdGhpcy5hZGRJbnRlcmFjdGlvbih0aGlzLl9tb2RpZnlJbnRlcmFjdGlvbik7XG4gIFxuICB2YXIgb3JpZ0dlb21ldHJ5ID0gbnVsbDtcbiAgXG4gIHRoaXMuX21vZGlmeUludGVyYWN0aW9uLm9uKCdtb2RpZnlzdGFydCcsZnVuY3Rpb24oZSl7XG4gICAgdmFyIGZlYXR1cmUgPSBlLmZlYXR1cmVzLmdldEFycmF5KClbMF07XG4gICAgb3JpZ0dlb21ldHJ5ID0gZmVhdHVyZS5nZXRHZW9tZXRyeSgpLmNsb25lKCk7XG4gIH0pO1xuICBcbiAgdGhpcy5fbW9kaWZ5SW50ZXJhY3Rpb24ub24oJ21vZGlmeWVuZCcsZnVuY3Rpb24oZSl7XG4gICAgdmFyIGZlYXR1cmUgPSBlLmZlYXR1cmVzLmdldEFycmF5KClbMF07XG4gICAgdmFyIGlzTmV3ID0gc2VsZi5faXNOZXcoZmVhdHVyZSk7XG4gICAgLy90cnkge1xuICAgICAgaWYgKCFzZWxmLl9idXN5KXtcbiAgICAgICAgc2VsZi5fYnVzeSA9IHRydWU7XG4gICAgICAgIHNlbGYucGF1c2UodHJ1ZSk7XG4gICAgICAgIHNlbGYubW9kaWZ5RmVhdHVyZShmZWF0dXJlLGlzTmV3KVxuICAgICAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgICAgIGZlYXR1cmUuc2V0R2VvbWV0cnkob3JpZ0dlb21ldHJ5KTtcbiAgICAgICAgfSlcbiAgICAgICAgLmFsd2F5cyhmdW5jdGlvbigpe1xuICAgICAgICAgIHNlbGYuX2J1c3kgPSBmYWxzZTtcbiAgICAgICAgICBzZWxmLnBhdXNlKGZhbHNlKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAvL31cbiAgICAvL2NhdGNoIChlcnJvcil7XG4gICAgLy8gIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAvLyAgZmVhdHVyZS5zZXRHZW9tZXRyeShvcmlnR2VvbWV0cnkpO1xuICAgIC8vfVxuICB9KTtcbiAgXG4gIGlmICh0aGlzLl9zbmFwKXtcbiAgICB0aGlzLl9zbmFwSW50ZXJhY3Rpb24gPSBuZXcgb2wuaW50ZXJhY3Rpb24uU25hcCh7XG4gICAgICBzb3VyY2U6IHRoaXMuX3NuYXAudmVjdG9yTGF5ZXIuZ2V0U291cmNlKClcbiAgICB9KTtcbiAgICB0aGlzLmFkZEludGVyYWN0aW9uKHRoaXMuX3NuYXBJbnRlcmFjdGlvbik7XG4gIH1cbn07XG5cbnByb3RvLnBhdXNlID0gZnVuY3Rpb24ocGF1c2Upe1xuICBpZiAoXy5pc1VuZGVmaW5lZChwYXVzZSkgfHwgcGF1c2Upe1xuICAgIGlmICh0aGlzLl9zbmFwSW50ZXJhY3Rpb24pe1xuICAgICAgdGhpcy5fc25hcEludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgfVxuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgdGhpcy5fbW9kaWZ5SW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgfVxuICBlbHNlIHtcbiAgICBpZiAodGhpcy5fc25hcEludGVyYWN0aW9uKXtcbiAgICAgIHRoaXMuX3NuYXBJbnRlcmFjdGlvbi5zZXRBY3RpdmUodHJ1ZSk7XG4gICAgfVxuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbiAgICB0aGlzLl9tb2RpZnlJbnRlcmFjdGlvbi5zZXRBY3RpdmUodHJ1ZSk7XG4gIH1cbn07XG5cbnByb3RvLnN0b3AgPSBmdW5jdGlvbigpe1xuICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLmNsZWFyKCk7XG4gIGlmICh0aGlzLl9zbmFwSW50ZXJhY3Rpb24pe1xuICAgICB0aGlzLnJlbW92ZUludGVyYWN0aW9uKHRoaXMuX3NuYXBJbnRlcmFjdGlvbik7XG4gICAgIHRoaXMuX3NuYXBJbnRlcmFjdGlvbiA9IG51bGw7XG4gIH1cbiAgdGhpcy5yZW1vdmVJbnRlcmFjdGlvbih0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbik7XG4gIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uID0gbnVsbDtcbiAgdGhpcy5yZW1vdmVJbnRlcmFjdGlvbih0aGlzLl9tb2RpZnlJbnRlcmFjdGlvbik7XG4gIHRoaXMuX21vZGlmeUludGVyYWN0aW9uID0gbnVsbDtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5wcm90by5fbW9kaWZ5RmVhdHVyZSA9IGZ1bmN0aW9uKGZlYXR1cmUsaXNOZXcpe1xuICAvLyBhZ2dpb25ybyBsYSBnZW9tZXRyaWEgbmVsIGJ1ZmZlciBkaSBlZGl0aW5nXG4gIHRoaXMuZWRpdG9yLnVwZGF0ZUZlYXR1cmUoZmVhdHVyZSxpc05ldyk7XG4gIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCkuY2xlYXIoKTtcbiAgdGhpcy5fYnVzeSA9IGZhbHNlO1xuICB0aGlzLnBhdXNlKGZhbHNlKTtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5wcm90by5yZW1vdmVQb2ludCA9IGZ1bmN0aW9uKGNvb3JkaW5hdGUpe1xuICBpZiAodGhpcy5fbW9kaWZ5SW50ZXJhY3Rpb24pe1xuICAgIC8vIHByb3ZvIGEgcmltdW92ZXJlIGwndWx0aW1vIHB1bnRvLiBOZWwgY2FzbyBub24gZXNpc3RhIGxhIGdlb21ldHJpYSBnZXN0aXNjbyBzaWxlbnppb3NhbWVudGUgbCdlcnJvcmVcbiAgICB0cnl7XG4gICAgICB0aGlzLl9tb2RpZnlJbnRlcmFjdGlvbi5yZW1vdmVQb2ludCgpO1xuICAgIH1cbiAgICBjYXRjaCAoZSl7XG4gICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICB9XG4gIH1cbn07XG5cbnByb3RvLl9mYWxsQmFjayA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICB0aGlzLl9idXN5ID0gZmFsc2U7XG4gIHRoaXMucGF1c2UoZmFsc2UpO1xufTtcblxucHJvdG8uX2lzTmV3ID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gIHJldHVybiAoIV8uaXNOaWwodGhpcy5lZGl0aW5nTGF5ZXIuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZUJ5SWQoZmVhdHVyZS5nZXRJZCgpKSkpO1xufTtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xuXG52YXIgRWRpdGluZ1Rvb2wgPSByZXF1aXJlKCcuL2VkaXRpbmd0b29sJyk7XG5cbmZ1bmN0aW9uIE1vdmVGZWF0dXJlVG9vbChlZGl0b3Ipe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuZWRpdG9yID0gZWRpdG9yO1xuICB0aGlzLmlzUGF1c2FibGUgPSB0cnVlO1xuICB0aGlzLmRyYXdJbnRlcmFjdGlvbiA9IG51bGw7XG4gIHRoaXMubGF5ZXIgPSBudWxsO1xuICB0aGlzLmVkaXRpbmdMYXllciA9IG51bGw7XG4gIFxuICB0aGlzLl9vcmlnR2VvbWV0cnkgPSBudWxsO1xuXG4gIHRoaXMuc2V0dGVycyA9IHtcbiAgICBtb3ZlRmVhdHVyZToge1xuICAgICAgZm5jOiBNb3ZlRmVhdHVyZVRvb2wucHJvdG90eXBlLl9tb3ZlRmVhdHVyZSxcbiAgICAgIGZhbGxiYWNrOiBNb3ZlRmVhdHVyZVRvb2wucHJvdG90eXBlLl9mYWxsQmFja1xuICAgIH1cbiAgfTtcbiAgXG4gIGJhc2UodGhpcyxlZGl0b3IpO1xufVxuaW5oZXJpdChNb3ZlRmVhdHVyZVRvb2wsRWRpdGluZ1Rvb2wpO1xubW9kdWxlLmV4cG9ydHMgPSBNb3ZlRmVhdHVyZVRvb2w7XG5cbnZhciBwcm90byA9IE1vdmVGZWF0dXJlVG9vbC5wcm90b3R5cGU7XG5cbnByb3RvLnJ1biA9IGZ1bmN0aW9uKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5sYXllciA9IHRoaXMuZWRpdG9yLmdldFZlY3RvckxheWVyKCkuZ2V0TWFwTGF5ZXIoKTtcbiAgdGhpcy5lZGl0aW5nTGF5ZXIgPSB0aGlzLmVkaXRvci5nZXRFZGl0VmVjdG9yTGF5ZXIoKS5nZXRNYXBMYXllcigpO1xuICBcbiAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24gPSBuZXcgb2wuaW50ZXJhY3Rpb24uU2VsZWN0KHtcbiAgICBsYXllcnM6IFt0aGlzLmxheWVyLHRoaXMuZWRpdGluZ0xheWVyXSxcbiAgICBjb25kaXRpb246IG9sLmV2ZW50cy5jb25kaXRpb24uY2xpY2tcbiAgfSk7XG4gIHRoaXMuYWRkSW50ZXJhY3Rpb24odGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24pO1xuICBcbiAgdGhpcy5fdHJhbnNsYXRlSW50ZXJhY3Rpb24gPSBuZXcgb2wuaW50ZXJhY3Rpb24uVHJhbnNsYXRlKHtcbiAgICBmZWF0dXJlczogdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKVxuICB9KTtcbiAgdGhpcy5hZGRJbnRlcmFjdGlvbih0aGlzLl90cmFuc2xhdGVJbnRlcmFjdGlvbik7XG4gIFxuICB0aGlzLl90cmFuc2xhdGVJbnRlcmFjdGlvbi5vbigndHJhbnNsYXRlc3RhcnQnLGZ1bmN0aW9uKGUpe1xuICAgIHZhciBmZWF0dXJlID0gZS5mZWF0dXJlcy5nZXRBcnJheSgpWzBdO1xuICAgIHNlbGYuX29yaWdHZW9tZXRyeSA9IGZlYXR1cmUuZ2V0R2VvbWV0cnkoKS5jbG9uZSgpO1xuICAgIHNlbGYuZWRpdG9yLmVtaXQoJ21vdmVzdGFydCcsZmVhdHVyZSk7XG4gIH0pO1xuICBcbiAgdGhpcy5fdHJhbnNsYXRlSW50ZXJhY3Rpb24ub24oJ3RyYW5zbGF0ZWVuZCcsZnVuY3Rpb24oZSl7XG4gICAgdmFyIGZlYXR1cmUgPSBlLmZlYXR1cmVzLmdldEFycmF5KClbMF07XG4gICAgLy90cnkge1xuICAgICAgaWYgKCFzZWxmLl9idXN5KXtcbiAgICAgICAgc2VsZi5fYnVzeSA9IHRydWU7XG4gICAgICAgIHNlbGYucGF1c2UoKTtcbiAgICAgICAgc2VsZi5tb3ZlRmVhdHVyZShmZWF0dXJlKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICAgIHNlbGYucGF1c2UoZmFsc2UpO1xuICAgICAgICB9KVxuICAgICAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgICAgIGZlYXR1cmUuc2V0R2VvbWV0cnkoc2VsZi5fb3JpZ0dlb21ldHJ5KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgLy99XG4gICAgLypjYXRjaCAoZXJyb3Ipe1xuICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgZmVhdHVyZS5zZXRHZW9tZXRyeShzZWxmLl9vcmlnR2VvbWV0cnkpO1xuICAgIH0qL1xuICB9KTtcblxufTtcblxucHJvdG8ucGF1c2UgPSBmdW5jdGlvbihwYXVzZSl7XG4gIGlmIChfLmlzVW5kZWZpbmVkKHBhdXNlKSB8fCBwYXVzZSl7XG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB0aGlzLl90cmFuc2xhdGVJbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICB9XG4gIGVsc2Uge1xuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbiAgICB0aGlzLl90cmFuc2xhdGVJbnRlcmFjdGlvbi5zZXRBY3RpdmUodHJ1ZSk7XG4gIH1cbn07XG5cbnByb3RvLnN0b3AgPSBmdW5jdGlvbigpe1xuICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLmNsZWFyKCk7XG4gIHRoaXMucmVtb3ZlSW50ZXJhY3Rpb24odGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24pO1xuICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbiA9IG51bGw7XG4gIHRoaXMucmVtb3ZlSW50ZXJhY3Rpb24odGhpcy5fdHJhbnNsYXRlSW50ZXJhY3Rpb24pO1xuICB0aGlzLl90cmFuc2xhdGVJbnRlcmFjdGlvbiA9IG51bGw7XG4gIHJldHVybiB0cnVlO1xufTtcblxucHJvdG8uX21vdmVGZWF0dXJlID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gIHRoaXMuZWRpdG9yLmVtaXQoJ21vdmVlbmQnLGZlYXR1cmUpO1xuICB0aGlzLmVkaXRvci51cGRhdGVGZWF0dXJlKGZlYXR1cmUpO1xuICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLmNsZWFyKCk7XG4gIHRoaXMuX2J1c3kgPSBmYWxzZTtcbiAgdGhpcy5wYXVzZShmYWxzZSk7XG4gIHJldHVybiB0cnVlO1xufTtcblxucHJvdG8uX2ZhbGxCYWNrID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gIHRoaXMuX2J1c3kgPSBmYWxzZTtcbiAgdGhpcy5wYXVzZShmYWxzZSk7XG59O1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgbm9vcCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5ub29wO1xudmFyIFBpY2tGZWF0dXJlSW50ZXJhY3Rpb24gPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9pbnRlcmFjdGlvbnMvcGlja2ZlYXR1cmVpbnRlcmFjdGlvbicpO1xuXG52YXIgRWRpdGluZ1Rvb2wgPSByZXF1aXJlKCcuL2VkaXRpbmd0b29sJyk7XG5cbmZ1bmN0aW9uIFBpY2tGZWF0dXJlVG9vbChlZGl0b3Ipe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuaXNQYXVzYWJsZSA9IHRydWU7XG4gIHRoaXMucGlja0ZlYXR1cmVJbnRlcmFjdGlvbiA9IG51bGw7XG4gIHRoaXMuX3J1bm5pbmcgPSBmYWxzZTtcbiAgdGhpcy5fYnVzeSA9IGZhbHNlO1xuICBcbiAgLy8gcXVpIHNpIGRlZmluaXNjb25vIGkgbWV0b2RpIGNoZSB2b2dsaWFtbyBwb3RlciBpbnRlcmNldHRhcmUsIGVkIGV2ZW50dWFsbWVudGUgYmxvY2NhcmUgKHZlZGkgQVBJIEczV09iamVjdClcbiAgdGhpcy5zZXR0ZXJzID0ge1xuICAgIHBpY2tGZWF0dXJlOiBub29wLFxuICB9O1xuICBcbiAgYmFzZSh0aGlzLGVkaXRvcik7XG59XG5pbmhlcml0KFBpY2tGZWF0dXJlVG9vbCxFZGl0aW5nVG9vbCk7XG5tb2R1bGUuZXhwb3J0cyA9IFBpY2tGZWF0dXJlVG9vbDtcblxudmFyIHByb3RvID0gUGlja0ZlYXR1cmVUb29sLnByb3RvdHlwZTtcblxuLy8gbWV0b2RvIGVzZWd1aXRvIGFsbCdhdnZpbyBkZWwgdG9vbFxucHJvdG8ucnVuID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICAvL3ZhciBtYXAgPSBNYXBTZXJ2aWNlLnZpZXdlci5tYXA7XG4gIHZhciBsYXllcnMgPSBbdGhpcy5lZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKS5nZXRNYXBMYXllcigpLHRoaXMuZWRpdG9yLmdldEVkaXRWZWN0b3JMYXllcigpLmdldE1hcExheWVyKCldO1xuICBcbiAgdGhpcy5waWNrRmVhdHVyZUludGVyYWN0aW9uID0gbmV3IFBpY2tGZWF0dXJlSW50ZXJhY3Rpb24oe1xuICAgIGxheWVyczogbGF5ZXJzXG4gIH0pO1xuICBcbiAgdGhpcy5waWNrRmVhdHVyZUludGVyYWN0aW9uLm9uKCdwaWNrZWQnLGZ1bmN0aW9uKGUpe1xuICAgIGlmICghc2VsZi5fYnVzeSl7XG4gICAgICBzZWxmLl9idXN5ID0gdHJ1ZTtcbiAgICAgIHNlbGYucGF1c2UodHJ1ZSk7XG4gICAgICBzZWxmLnBpY2tGZWF0dXJlKGUuZmVhdHVyZSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHNlbGYuX2J1c3kgPSBmYWxzZTtcbiAgICAgICAgc2VsZi5wYXVzZShmYWxzZSk7XG4gICAgICB9KVxuICAgIH1cbiAgfSk7XG4gIFxuICB0aGlzLmFkZEludGVyYWN0aW9uKHRoaXMucGlja0ZlYXR1cmVJbnRlcmFjdGlvbik7XG59O1xuXG5wcm90by5wYXVzZSA9IGZ1bmN0aW9uKHBhdXNlKXtcbiAgaWYgKF8uaXNVbmRlZmluZWQocGF1c2UpIHx8IHBhdXNlKXtcbiAgICB0aGlzLnBpY2tGZWF0dXJlSW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgfVxuICBlbHNlIHtcbiAgICB0aGlzLnBpY2tGZWF0dXJlSW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICB9XG59O1xuXG4vLyBtZXRvZG8gZXNlZ3VpdG8gYWxsYSBkaXNhdHRpdmF6aW9uZSBkZWwgdG9vbFxucHJvdG8uc3RvcCA9IGZ1bmN0aW9uKCl7XG4gIHRoaXMucmVtb3ZlSW50ZXJhY3Rpb24odGhpcy5waWNrRmVhdHVyZUludGVyYWN0aW9uKTtcbiAgdGhpcy5waWNrRmVhdHVyZUludGVyYWN0aW9uID0gbnVsbDtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5wcm90by5fZmFsbEJhY2sgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgdGhpcy5fYnVzeSA9IGZhbHNlO1xuICB0aGlzLnBhdXNlKGZhbHNlKTtcbn07XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIG5vb3AgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykubm9vcDtcblxuLyoqXG4gKiBVbiBvZ2dldHRvIGJhc2UgaW4gZ3JhZG8gZGkgZ2VzdGlyZSBldmVudHVhbGkgc2V0dGVyIGUgcmVsYXRpdmEgY2F0ZW5hIGRpIGxpc3RlbmVycy5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgRzNXT2JqZWN0ID0gZnVuY3Rpb24oKXtcbiAgaWYgKHRoaXMuc2V0dGVycyl7XG4gICAgdGhpcy5fc2V0dXBMaXN0ZW5lcnNDaGFpbih0aGlzLnNldHRlcnMpO1xuICB9XG59O1xuaW5oZXJpdChHM1dPYmplY3QsRXZlbnRFbWl0dGVyKTtcblxudmFyIHByb3RvID0gRzNXT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqXG4gKiBJbnNlcmlzY2UgdW4gbGlzdGVuZXIgZG9wbyBjaGUgw6ggc3RhdG8gZXNlZ3VpdG8gaWwgc2V0dGVyXG4gKiBAcGFyYW0ge3N0cmluZ30gc2V0dGVyIC0gSWwgbm9tZSBkZWwgbWV0b2RvIHN1IGN1aSBzaSBjdW9sZSByZWdpc3RyYXJlIHVuYSBmdW56aW9uZSBsaXN0ZW5lclxuICogQHBhcmFtIHtmdW5jdGlvbn0gbGlzdGVuZXIgLSBVbmEgZnVuemlvbmUgbGlzdGVuZXIgKHNvbG8gc2luY3JvbmEpXG4gKi9cbnByb3RvLm9uYWZ0ZXIgPSBmdW5jdGlvbihzZXR0ZXIsbGlzdGVuZXIpe1xuICByZXR1cm4gdGhpcy5fb25zZXR0ZXIoJ2FmdGVyJyxzZXR0ZXIsbGlzdGVuZXIsZmFsc2UpO1xufTtcblxuLy8gdW4gbGlzdGVuZXIgcHXDsiByZWdpc3RyYXJzaSBpbiBtb2RvIGRhIGVzc2VyZSBlc2VndWl0byBQUklNQSBkZWxsJ2VzZWN1emlvbmUgZGVsIG1ldG9kbyBzZXR0ZXIuIFB1w7Igcml0b3JuYXJlIHRydWUvZmFsc2UgcGVyXG4vLyB2b3RhcmUgYSBmYXZvcmUgbyBtZW5vIGRlbGwnZXNlY3V6aW9uZSBkZWwgc2V0dGVyLiBTZSBub24gcml0b3JuYSBudWxsYSBvIHVuZGVmaW5lZCwgbm9uIHZpZW5lIGNvbnNpZGVyYXRvIHZvdGFudGVcbi8qKlxuICogSW5zZXJpc2NlIHVuIGxpc3RlbmVyIHByaW1hIGNoZSB2ZW5nYSBlc2VndWl0byBpbCBzZXR0ZXIuIFNlIHJpdG9ybmEgZmFsc2UgaWwgc2V0dGVyIG5vbiB2aWVuZSBlc2VndWl0b1xuICogQHBhcmFtIHtzdHJpbmd9IHNldHRlciAtIElsIG5vbWUgZGVsIG1ldG9kbyBzdSBjdWkgc2kgY3VvbGUgcmVnaXN0cmFyZSB1bmEgZnVuemlvbmUgbGlzdGVuZXJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGxpc3RlbmVyIC0gVW5hIGZ1bnppb25lIGxpc3RlbmVyLCBhIGN1aSB2aWVuZSBwYXNzYXRvIHVuYSBmdW56aW9uZSBcIm5leHRcIiBjb21lIHVsdGltbyBwYXJhbWV0cm8sIGRhIHVzYXJlIG5lbCBjYXNvIGRpIGxpc3RlbmVyIGFzaW5jcm9uaVxuICovXG5wcm90by5vbmJlZm9yZSA9IGZ1bmN0aW9uKHNldHRlcixsaXN0ZW5lcil7XG4gIHJldHVybiB0aGlzLl9vbnNldHRlcignYmVmb3JlJyxzZXR0ZXIsbGlzdGVuZXIsZmFsc2UpO1xufTtcblxuLyoqXG4gKiBJbnNlcmlzY2UgdW4gbGlzdGVuZXIgcHJpbWEgY2hlIHZlbmdhIGVzZWd1aXRvIGlsIHNldHRlci4gQWwgbGlzdGVuZXIgdmllbmUgcGFzc2F0byB1bmEgZnVuemlvbmUgXCJuZXh0XCIgY29tZSB1bHRpbW8gcGFyYW1ldHJvLCBkYSBjaGlhbWFyZSBjb24gcGFyYW1ldHJvIHRydWUvZmFsc2UgcGVyIGZhciBwcm9zZWd1aXJlIG8gbWVubyBpbCBzZXR0ZXJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzZXR0ZXIgLSBJbCBub21lIGRlbCBtZXRvZG8gc3UgY3VpIHNpIGN1b2xlIHJlZ2lzdHJhcmUgdW5hIGZ1bnppb25lIGxpc3RlbmVyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBsaXN0ZW5lciAtIFVuYSBmdW56aW9uZSBsaXN0ZW5lciwgYSBjdWkgXG4gKi9cbnByb3RvLm9uYmVmb3JlYXN5bmMgPSBmdW5jdGlvbihzZXR0ZXIsbGlzdGVuZXIpe1xuICByZXR1cm4gdGhpcy5fb25zZXR0ZXIoJ2JlZm9yZScsc2V0dGVyLGxpc3RlbmVyLHRydWUpO1xufTtcblxucHJvdG8udW4gPSBmdW5jdGlvbihzZXR0ZXIsa2V5KXtcbiAgXy5mb3JFYWNoKHRoaXMuc2V0dGVyc0xpc3RlbmVycyxmdW5jdGlvbihzZXR0ZXJzTGlzdGVuZXJzLHdoZW4pe1xuICAgIF8uZm9yRWFjaChzZXR0ZXJzTGlzdGVuZXJzW3NldHRlcl0sZnVuY3Rpb24oc2V0dGVyTGlzdGVuZXIpe1xuICAgICAgaWYoc2V0dGVyTGlzdGVuZXIua2V5ID09IGtleSl7XG4gICAgICAgIGRlbGV0ZSBzZXR0ZXJMaXN0ZW5lcjtcbiAgICAgIH1cbiAgICB9KVxuICB9KVxufTtcblxucHJvdG8uX29uc2V0dGVyID0gZnVuY3Rpb24od2hlbixzZXR0ZXIsbGlzdGVuZXIsYXN5bmMpeyAvKndoZW49YmVmb3JlfGFmdGVyLCB0eXBlPXN5bmN8YXN5bmMqL1xuICB2YXIgc2V0dGVyc0xpc3RlbmVycyA9IHRoaXMuc2V0dGVyc0xpc3RlbmVyc1t3aGVuXTtcbiAgdmFyIGxpc3RlbmVyS2V5ID0gXCJcIitNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqMTAwMDAwMCkrXCJcIitEYXRlLm5vdygpO1xuICAvKmlmICgod2hlbiA9PSAnYmVmb3JlJykgJiYgIWFzeW5jKXtcbiAgICBsaXN0ZW5lciA9IHRoaXMuX21ha2VDaGFpbmFibGUobGlzdGVuZXIpO1xuICB9Ki9cbiAgc2V0dGVyc0xpc3RlbmVyc1tzZXR0ZXJdLnB1c2goe1xuICAgIGtleTogbGlzdGVuZXJLZXksXG4gICAgZm5jOiBsaXN0ZW5lcixcbiAgICBhc3luYzogYXN5bmNcbiAgfSk7XG4gIHJldHVybiBsaXN0ZW5lcktleTtcbiAgLy9yZXR1cm4gdGhpcy5nZW5lcmF0ZVVuTGlzdGVuZXIoc2V0dGVyLGxpc3RlbmVyS2V5KTtcbn07XG5cbi8vIHRyYXNmb3JtbyB1biBsaXN0ZW5lciBzaW5jcm9ubyBpbiBtb2RvIGRhIHBvdGVyIGVzc2VyZSB1c2F0byBuZWxsYSBjYXRlbmEgZGkgbGlzdGVuZXJzIChyaWNoaWFtYW5kbyBuZXh0IGNvbCB2YWxvcmUgZGkgcml0b3JubyBkZWwgbGlzdGVuZXIpXG4vKnByb3RvLl9tYWtlQ2hhaW5hYmxlID0gZnVuY3Rpb24obGlzdGVuZXIpe1xuICB2YXIgc2VsZiA9IHRoaXNcbiAgcmV0dXJuIGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIC8vIHJpbXVvdm8gbmV4dCBkYWkgcGFyYW1ldHJpIHByaW1hIGRpIGNoaWFtYXJlIGlsIGxpc3RlbmVyXG4gICAgdmFyIG5leHQgPSBhcmdzLnBvcCgpO1xuICAgIHZhciBjYW5TZXQgPSBsaXN0ZW5lci5hcHBseShzZWxmLGFyZ3VtZW50cyk7XG4gICAgdmFyIF9jYW5TZXQgPSB0cnVlO1xuICAgIGlmIChfLmlzQm9vbGVhbihjYW5TZXQpKXtcbiAgICAgIF9jYW5TZXQgPSBjYW5TZXQ7XG4gICAgfVxuICAgIG5leHQoY2FuU2V0KTtcbiAgfVxufTsqL1xuXG5wcm90by5fc2V0dXBMaXN0ZW5lcnNDaGFpbiA9IGZ1bmN0aW9uKHNldHRlcnMpe1xuICAvLyBpbml6aWFsaXp6YSB0dXR0aSBpIG1ldG9kaSBkZWZpbml0aSBuZWxsJ29nZ2V0dG8gXCJzZXR0ZXJzXCIgZGVsbGEgY2xhc3NlIGZpZ2xpYS5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnNldHRlcnNMaXN0ZW5lcnMgPSB7XG4gICAgYWZ0ZXI6e30sXG4gICAgYmVmb3JlOnt9XG4gIH07XG4gIC8vIHBlciBvZ25pIHNldHRlciB2aWVuZSBkZWZpbml0byBsJ2FycmF5IGRlaSBsaXN0ZW5lcnMgZSBmaWVuZSBzb3N0aXR1aXRvIGlsIG1ldG9kbyBvcmlnaW5hbGUgY29uIGxhIGZ1bnppb25pIGNoZSBnZXN0aXNjZSBsYSBjb2RhIGRpIGxpc3RlbmVyc1xuICBfLmZvckVhY2goc2V0dGVycyxmdW5jdGlvbihzZXR0ZXJPcHRpb24sc2V0dGVyKXtcbiAgICB2YXIgc2V0dGVyRm5jID0gbm9vcDtcbiAgICB2YXIgc2V0dGVyRmFsbGJhY2sgPSBub29wO1xuICAgIGlmIChfLmlzRnVuY3Rpb24oc2V0dGVyT3B0aW9uKSl7XG4gICAgICBzZXR0ZXJGbmMgPSBzZXR0ZXJPcHRpb25cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBzZXR0ZXJGbmMgPSBzZXR0ZXJPcHRpb24uZm5jO1xuICAgICAgc2V0dGVyRmFsbGJhY2sgPSBzZXR0ZXJPcHRpb24uZmFsbGJhY2sgfHwgbm9vcDtcbiAgICB9XG4gICAgc2VsZi5zZXR0ZXJzTGlzdGVuZXJzLmFmdGVyW3NldHRlcl0gPSBbXTtcbiAgICBzZWxmLnNldHRlcnNMaXN0ZW5lcnMuYmVmb3JlW3NldHRlcl0gPSBbXTtcbiAgICAvLyBzZXR0ZXIgc29zdGl0dWl0b1xuICAgIHNlbGZbc2V0dGVyXSA9IGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIC8vIGVzZWd1byBpIGxpc3RlbmVyIHJlZ2lzdHJhdGkgcGVyIGlsIGJlZm9yZVxuICAgICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgICAgdmFyIHJldHVyblZhbCA9IG51bGw7XG4gICAgICB2YXIgY291bnRlciA9IDA7XG4gICAgICB2YXIgY2FuU2V0ID0gdHJ1ZTtcbiAgICAgIFxuICAgICAgLy8gcmljaGlhbWF0YSBhbGxhIGZpbmUgZGVsbGEgY2F0ZW5hIGRpIGxpc3RlbmVyc1xuICAgICAgZnVuY3Rpb24gZG9uZSgpe1xuICAgICAgICBpZihjYW5TZXQpe1xuICAgICAgICAgIC8vIGVzZWd1byBsYSBmdW56aW9uZVxuICAgICAgICAgIHJldHVyblZhbCA9IHNldHRlckZuYy5hcHBseShzZWxmLGFyZ3MpO1xuICAgICAgICAgIC8vIGUgcmlzb2x2byBsYSBwcm9tZXNzYSAoZXZlbnR1YWxtZW50ZSB1dGlsaXp6YXRhIGRhIGNoaSBoYSBpbnZvY2F0byBpbCBzZXR0ZXJcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJldHVyblZhbCk7XG4gICAgICAgICAgXG4gICAgICAgICAgdmFyIGFmdGVyTGlzdGVuZXJzID0gc2VsZi5zZXR0ZXJzTGlzdGVuZXJzLmFmdGVyW3NldHRlcl07XG4gICAgICAgICAgXy5mb3JFYWNoKGFmdGVyTGlzdGVuZXJzLGZ1bmN0aW9uKGxpc3RlbmVyLCBrZXkpe1xuICAgICAgICAgICAgbGlzdGVuZXIuZm5jLmFwcGx5KHNlbGYsYXJncyk7XG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAvLyBzZSBub24gcG9zc28gcHJvc2VndWlyZSBcbiAgICAgICAgICAvLyBjaGlhbW8gbCdldmVudHVhbGUgZnVuemlvbmUgZGkgZmFsbGJhY2tcbiAgICAgICAgICBzZXR0ZXJGYWxsYmFjay5hcHBseShzZWxmLGFyZ3MpO1xuICAgICAgICAgIC8vIGUgcmlnZXR0byBsYSBwcm9tZXNzYVxuICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgXG4gICAgICBmdW5jdGlvbiBjb21wbGV0ZSgpe1xuICAgICAgICAvLyBlc2VndW8gbGEgZnVuemlvbmVcbiAgICAgICAgcmV0dXJuVmFsID0gc2V0dGVyRm5jLmFwcGx5KHNlbGYsYXJncyk7XG4gICAgICAgIC8vIGUgcmlzb2x2byBsYSBwcm9tZXNzYSAoZXZlbnR1YWxtZW50ZSB1dGlsaXp6YXRhIGRhIGNoaSBoYSBpbnZvY2F0byBpbCBzZXR0ZXJcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXR1cm5WYWwpO1xuICAgICAgICBcbiAgICAgICAgdmFyIGFmdGVyTGlzdGVuZXJzID0gc2VsZi5zZXR0ZXJzTGlzdGVuZXJzLmFmdGVyW3NldHRlcl07XG4gICAgICAgIF8uZm9yRWFjaChhZnRlckxpc3RlbmVycyxmdW5jdGlvbihsaXN0ZW5lciwga2V5KXtcbiAgICAgICAgICBsaXN0ZW5lci5mbmMuYXBwbHkoc2VsZixhcmdzKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gYWJvcnQoKXtcbiAgICAgICAgICAvLyBzZSBub24gcG9zc28gcHJvc2VndWlyZSAuLi5cbiAgICAgICAgICAvLyBjaGlhbW8gbCdldmVudHVhbGUgZnVuemlvbmUgZGkgZmFsbGJhY2tcbiAgICAgICAgICBzZXR0ZXJGYWxsYmFjay5hcHBseShzZWxmLGFyZ3MpO1xuICAgICAgICAgIC8vIGUgcmlnZXR0byBsYSBwcm9tZXNzYVxuICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgfVxuICAgICAgXG4gICAgICB2YXIgYmVmb3JlTGlzdGVuZXJzID0gdGhpcy5zZXR0ZXJzTGlzdGVuZXJzWydiZWZvcmUnXVtzZXR0ZXJdO1xuICAgICAgLy8gY29udGF0b3JlIGRlaSBsaXN0ZW5lciBjaGUgdmVycsOgIGRlY3JlbWVudGF0byBhZCBvZ25pIGNoaWFtYXRhIGEgbmV4dCgpXG4gICAgICBjb3VudGVyID0gMDtcbiAgICAgIFxuICAgICAgLy8gZnVuemlvbmUgcGFzc2F0YSBjb21lIHVsdGltbyBwYXJhbWV0cm8gYWkgbGlzdGVuZXJzLCBjaGUgKioqU0UgU09OTyBTVEFUSSBBR0dJVU5USSBDT01FIEFTSU5DUk9OSSBsYSBERVZPTk8qKiogcmljaGlhbWFyZSBwZXIgcG90ZXIgcHJvc2VndWlyZSBsYSBjYXRlbmFcbiAgICAgIGZ1bmN0aW9uIG5leHQoYm9vbCl7XG4gICAgICAgIHZhciBjb250ID0gdHJ1ZTtcbiAgICAgICAgaWYgKF8uaXNCb29sZWFuKGJvb2wpKXtcbiAgICAgICAgICBjb250ID0gYm9vbDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgX2FyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmdzKTtcbiAgICAgICAgLy8gc2UgbGEgY2F0ZW5hIMOoIHN0YXRhIGJsb2NjYXRhIG8gc2Ugc2lhbW8gYXJyaXZhdGkgYWxsYSBmaW5lIGRlaSBiZWZvcmVsaXN0ZW5lcnNcbiAgICAgICAgaWYgKGNvbnQgPT09IGZhbHNlIHx8IChjb3VudGVyID09IGJlZm9yZUxpc3RlbmVycy5sZW5ndGgpKXtcbiAgICAgICAgICBpZihjb250ID09PSBmYWxzZSlcbiAgICAgICAgICAgIGFib3J0LmFwcGx5KHNlbGYsYXJncyk7XG4gICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIGNvbXBsZXRlZCA9IGNvbXBsZXRlLmFwcGx5KHNlbGYsYXJncyk7XG4gICAgICAgICAgICBpZihfLmlzVW5kZWZpbmVkKGNvbXBsZXRlZCkgfHwgY29tcGxldGVkID09PSB0cnVlKXtcbiAgICAgICAgICAgICAgc2VsZi5lbWl0RXZlbnQoJ3NldDonK3NldHRlcixhcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYgKGNvbnQpe1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVyRm5jID0gYmVmb3JlTGlzdGVuZXJzW2NvdW50ZXJdLmZuYztcbiAgICAgICAgICAgIGlmIChiZWZvcmVMaXN0ZW5lcnNbY291bnRlcl0uYXN5bmMpe1xuICAgICAgICAgICAgICAvLyBhZ2dpdW5nbyBuZXh0IGNvbWUgdWxpdG1vIHBhcmFtZXRyb1xuICAgICAgICAgICAgICBfYXJncy5wdXNoKG5leHQpO1xuICAgICAgICAgICAgICBjb3VudGVyICs9IDE7XG4gICAgICAgICAgICAgIGxpc3RlbmVyRm5jLmFwcGx5KHNlbGYsX2FyZ3MpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIF9jb250ID0gbGlzdGVuZXJGbmMuYXBwbHkoc2VsZixfYXJncyk7XG4gICAgICAgICAgICAgIGNvdW50ZXIgKz0gMTtcbiAgICAgICAgICAgICAgbmV4dChfY29udCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIG5leHQoKTtcbiAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gICAgfVxuICB9KVxufTtcblxucHJvdG8udW4gPSBmdW5jdGlvbihsaXN0ZW5lcktleSkge1xuICBfLmZvckVhY2godGhpcy5zZXR0ZXJzTGlzdGVuZXJzLGZ1bmN0aW9uKHNldHRlckxpc3RlbmVycyxzZXR0ZXIpe1xuICAgICAgXy5mb3JFYWNoKHNldHRlckxpc3RlbmVycyxmdW5jdGlvbihsaXN0ZW5lcixpZHgpe1xuICAgICAgICBpZiAobGlzdGVuZXIua2V5ID09IGxpc3RlbmVyS2V5KSB7XG4gICAgICAgICAgc2V0dGVyTGlzdGVuZXJzLnNwbGljZShpZHgsMSk7XG4gICAgICAgICAgZGVsZXRlIGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgICB9KVxuICB9KVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBHM1dPYmplY3Q7XG4iLCJ2YXIgZ2VvbSA9IHtcbiAgZGlzdGFuY2U6IGZ1bmN0aW9uKGMxLGMyKXtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KGdlb20uc3F1YXJlZERpc3RhbmNlKGMxLGMyKSk7XG4gIH0sXG4gIHNxdWFyZWREaXN0YW5jZTogZnVuY3Rpb24oYzEsYzIpe1xuICAgIHZhciB4MSA9IGMxWzBdO1xuICAgIHZhciB5MSA9IGMxWzFdO1xuICAgIHZhciB4MiA9IGMyWzBdO1xuICAgIHZhciB5MiA9IGMyWzFdO1xuICAgIHZhciBkeCA9IHgyIC0geDE7XG4gICAgdmFyIGR5ID0geTIgLSB5MTtcbiAgICByZXR1cm4gZHggKiBkeCArIGR5ICogZHk7XG4gIH0sXG4gIGNsb3Nlc3RPblNlZ21lbnQ6IGZ1bmN0aW9uKGNvb3JkaW5hdGUsIHNlZ21lbnQpIHtcbiAgICB2YXIgeDAgPSBjb29yZGluYXRlWzBdO1xuICAgIHZhciB5MCA9IGNvb3JkaW5hdGVbMV07XG4gICAgdmFyIHN0YXJ0ID0gc2VnbWVudFswXTtcbiAgICB2YXIgZW5kID0gc2VnbWVudFsxXTtcbiAgICB2YXIgeDEgPSBzdGFydFswXTtcbiAgICB2YXIgeTEgPSBzdGFydFsxXTtcbiAgICB2YXIgeDIgPSBlbmRbMF07XG4gICAgdmFyIHkyID0gZW5kWzFdO1xuICAgIHZhciBkeCA9IHgyIC0geDE7XG4gICAgdmFyIGR5ID0geTIgLSB5MTtcbiAgICB2YXIgYWxvbmcgPSAoZHggPT09IDAgJiYgZHkgPT09IDApID8gMCA6XG4gICAgICAgICgoZHggKiAoeDAgLSB4MSkpICsgKGR5ICogKHkwIC0geTEpKSkgLyAoKGR4ICogZHggKyBkeSAqIGR5KSB8fCAwKTtcbiAgICB2YXIgeCwgeTtcbiAgICBpZiAoYWxvbmcgPD0gMCkge1xuICAgICAgeCA9IHgxO1xuICAgICAgeSA9IHkxO1xuICAgIH0gZWxzZSBpZiAoYWxvbmcgPj0gMSkge1xuICAgICAgeCA9IHgyO1xuICAgICAgeSA9IHkyO1xuICAgIH0gZWxzZSB7XG4gICAgICB4ID0geDEgKyBhbG9uZyAqIGR4O1xuICAgICAgeSA9IHkxICsgYWxvbmcgKiBkeTtcbiAgICB9XG4gICAgcmV0dXJuIFt4LCB5XTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdlb207XG4iLCJ2YXIgR2VvbWV0cnkgPSB7fTtcblxuR2VvbWV0cnkuR2VvbWV0cnlUeXBlcyA9IHtcbiAgUE9JTlQ6IFwiUG9pbnRcIixcbiAgTVVMVElQT0lOVDogXCJNdWx0aVBvaW50XCIsXG4gIExJTkVTVFJJTkc6IFwiTGluZVwiLCAvLyBwZXIgc2VndWlyZSBsYSBkZWZpbml6aW9uZSBkaSBRR2lzLkdlb21ldHJ5VHlwZSwgY2hlIGRlZmluaXNjZSBMaW5lIGludmVjZSBkaSBMaW5lc3RyaW5nLlxuICBNVUxUSUxJTkVTVFJJTkc6IFwiTXVsdGlMaW5lXCIsXG4gIFBPTFlHT046IFwiUG9seWdvblwiLFxuICBNVUxUSVBPTFlHT046IFwiTXVsdGlQb2x5Z29uXCIsXG4gIEdFT01FVFJZQ09MTEVDVElPTjogXCJHZW9tZXRyeUNvbGxlY3Rpb25cIlxufTtcblxuR2VvbWV0cnkuU3VwcG9ydGVkR2VvbWV0cnlUeXBlcyA9IFtcbiAgR2VvbWV0cnkuR2VvbWV0cnlUeXBlcy5QT0lOVCxcbiAgR2VvbWV0cnkuR2VvbWV0cnlUeXBlcy5NVUxUSVBPSU5ULFxuICBHZW9tZXRyeS5HZW9tZXRyeVR5cGVzLkxJTkVTVFJJTkcsXG4gIEdlb21ldHJ5Lkdlb21ldHJ5VHlwZXMuTVVMVElMSU5FU1RSSU5HLFxuICBHZW9tZXRyeS5HZW9tZXRyeVR5cGVzLlBPTFlHT04sXG4gIEdlb21ldHJ5Lkdlb21ldHJ5VHlwZXMuTVVMVElQT0xZR09OXG5dXG5cbm1vZHVsZS5leHBvcnRzID0gR2VvbWV0cnk7XG4iLCJmdW5jdGlvbiBpbml0KGNvbmZpZykge1xuICBpMThuZXh0XG4gIC51c2UoaTE4bmV4dFhIUkJhY2tlbmQpXG4gIC5pbml0KHsgXG4gICAgICBsbmc6ICdpdCcsXG4gICAgICBuczogJ2FwcCcsXG4gICAgICBmYWxsYmFja0xuZzogJ2l0JyxcbiAgICAgIHJlc291cmNlczogY29uZmlnLnJlc291cmNlc1xuICB9KTtcbiAgXG4gIGpxdWVyeUkxOG5leHQuaW5pdChpMThuZXh0LCAkLCB7XG4gICAgdE5hbWU6ICd0JywgLy8gLS0+IGFwcGVuZHMgJC50ID0gaTE4bmV4dC50XG4gICAgaTE4bk5hbWU6ICdpMThuJywgLy8gLS0+IGFwcGVuZHMgJC5pMThuID0gaTE4bmV4dFxuICAgIGhhbmRsZU5hbWU6ICdsb2NhbGl6ZScsIC8vIC0tPiBhcHBlbmRzICQoc2VsZWN0b3IpLmxvY2FsaXplKG9wdHMpO1xuICAgIHNlbGVjdG9yQXR0cjogJ2RhdGEtaTE4bicsIC8vIHNlbGVjdG9yIGZvciB0cmFuc2xhdGluZyBlbGVtZW50c1xuICAgIHRhcmdldEF0dHI6ICdkYXRhLWkxOG4tdGFyZ2V0JywgLy8gZWxlbWVudCBhdHRyaWJ1dGUgdG8gZ3JhYiB0YXJnZXQgZWxlbWVudCB0byB0cmFuc2xhdGUgKGlmIGRpZmZyZW50IHRoZW4gaXRzZWxmKVxuICAgIG9wdGlvbnNBdHRyOiAnZGF0YS1pMThuLW9wdGlvbnMnLCAvLyBlbGVtZW50IGF0dHJpYnV0ZSB0aGF0IGNvbnRhaW5zIG9wdGlvbnMsIHdpbGwgbG9hZC9zZXQgaWYgdXNlT3B0aW9uc0F0dHIgPSB0cnVlXG4gICAgdXNlT3B0aW9uc0F0dHI6IGZhbHNlLCAvLyBzZWUgb3B0aW9uc0F0dHJcbiAgICBwYXJzZURlZmF1bHRWYWx1ZUZyb21Db250ZW50OiB0cnVlIC8vIHBhcnNlcyBkZWZhdWx0IHZhbHVlcyBmcm9tIGNvbnRlbnQgZWxlLnZhbCBvciBlbGUudGV4dFxuICB9KTtcbn1cbiAgICBcbnZhciB0ID0gZnVuY3Rpb24odGV4dCl7XG4gICAgdmFyIHRyYWQgPSBpMThuZXh0LnQodGV4dCk7XG4gICAgcmV0dXJuIHRyYWQ7XG59O1xuICAgIFxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGluaXQ6IGluaXQsXG4gIHQ6IHRcbn1cbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG5cbmZ1bmN0aW9uIExvYWRlckxheWVyU2VydmljZSgpIHtcbiAgICB0aGlzLl9sYXllcnMgPSB7fTtcbiAgICB0aGlzLl90eXBlID0gJ3RpcG8gZGkgbGF5ZXJzJztcbiAgICBiYXNlKHRoaXMpO1xufVxuXG5pbmhlcml0KExvYWRlckxheWVyU2VydmljZSwgRzNXT2JqZWN0KTtcblxudmFyIHByb3RvID0gTG9hZGVyTGF5ZXJTZXJ2aWNlLnByb3RvdHlwZTtcblxucHJvdG8uZ2V0TGF5ZXJzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLl9sYXllcnM7XG59O1xuXG5wcm90by5nZXRMYXllciA9IGZ1bmN0aW9uKGxheWVyTmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9sYXllcnNbbGF5ZXJOYW1lXTtcbn07XG5cbnByb3RvLmxvYWRMYXllciA9IGZ1bmN0aW9uKHVybCwgb3B0aW9ucykge1xuICAvL2NvZGljZSBxdWlcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTG9hZGVyTGF5ZXJTZXJ2aWNlO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBWZWN0b3JMYXllciA9IHJlcXVpcmUoJ2NvcmUvbWFwL2xheWVyL3ZlY3RvcmxheWVyJyk7XG52YXIgTG9hZGVyTGF5ZXJTZXJ2aWNlID0gcmVxdWlyZSgnLi9sb2FkZXJsYXllcnNlcnZpY2UnKTtcblxuZnVuY3Rpb24gVmVjdG9yTG9hZGVyTGF5ZXIoKSB7XG4gICAgdGhpcy5fbGF5ZXIgPSB7fTtcbiAgICB0aGlzLl90eXBlID0gJ3ZlY3Rvcic7XG4gICAgYmFzZSh0aGlzKTtcbiAgICB0aGlzLmluaXQgPSBmdW5jdGlvbihsYXllcnMpIHtcbiAgICAgICAgdGhpcy5fbGF5ZXJzID0gbGF5ZXJzO1xuICAgICAgICAvL3ZhZG8gYSBmYXJlIGlsIHNldHVwIGUgYSBjYXJpY2FyZSB0dXR0aSBpIGRhdGkgZGVpIGxheWVyc1xuICAgICAgICB0aGlzLnNldHVwQW5kTG9hZEFsbExheWVyc0RhdGEoKTtcbiAgICB9XG59XG5cbmluaGVyaXQoVmVjdG9yTG9hZGVyTGF5ZXIsIExvYWRlckxheWVyU2VydmljZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFZlY3RvckxvYWRlckxheWVyO1xuXG52YXIgcHJvdG8gPSBWZWN0b3JMb2FkZXJMYXllci5wcm90b3R5cGU7XG5cbnByb3RvLnNldHVwQW5kTG9hZEFsbExheWVyc0RhdGEgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIGxheWVyc1JlYWR5ID0gXy5yZWR1Y2UodGhpcy5fbGF5ZXJzLCBmdW5jdGlvbihyZWFkeSxsYXllckNvZGUpe1xuICAgICAgICByZXR1cm4gIV8uaXNOdWxsKHNlbGYuX2xheWVyc1tsYXllckNvZGVdLnZlY3Rvcik7XG4gICAgfSk7XG5cbiAgICBzZWxmLnN0YXRlLnJldHJpZXZpbmdEYXRhID0gdHJ1ZTtcbiAgICAvL25lbCBjYXNvIGluIGN1aSBuZXNzdW4gdmVjdG9yIGxheWVyIMOoIHN0YXRvIGNhcmljYXRvXG4gICAgLy8gcXVpbmRpIGxhIHByb3ByaWV0w6AgdmVjdG9yIMOoIG51bGxcbiAgICBpZiAoIWxheWVyc1JlYWR5KXtcbiAgICAgICAgLy8gZXNlZ3VvIGxlIHJpY2hpZXN0ZSBkZWxsZSBjb25maWd1cmF6aW9uaSBlIG1pIHRlbmdvIGxlIHByb21lc3NlXG4gICAgICAgIHZhciB2ZWN0b3JMYXllcnNTZXR1cCA9IF8ubWFwKGxheWVyQ29kZXMsZnVuY3Rpb24obGF5ZXJDb2RlKXtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLnNldHVwVmVjdG9yTGF5ZXIoc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0pO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gYXNwZXR0byB0dXR0ZSBsZSBwcm9tZXNzZVxuICAgICAgICAkLndoZW4uYXBwbHkodGhpcyx2ZWN0b3JMYXllcnNTZXR1cClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgdmFyIHZlY3RvckxheWVycyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgdmFyIGxheWVyQ29kZXMgPSBzZWxmLmdldExheWVyQ29kZXMoKTtcbiAgICAgICAgICAgICAgICB2YXIgdmVjdG9yTGF5ZXJzRm9ySXRlcm5ldENvZGUgPSBfLnppcE9iamVjdChsYXllckNvZGVzLHZlY3RvckxheWVycyk7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKHZlY3RvckxheWVyc0Zvckl0ZXJuZXRDb2RlLGZ1bmN0aW9uKHZlY3RvckxheWVyLGxheWVyQ29kZSl7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX2xheWVyc1tsYXllckNvZGVdLnZlY3RvciA9IHZlY3RvckxheWVyO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZWRpdG9yID0gbmV3IHNlbGYuX2VkaXRvckNsYXNzZXNbbGF5ZXJDb2RlXShzZWxmLl9tYXBTZXJ2aWNlKTtcbiAgICAgICAgICAgICAgICAgICAgZWRpdG9yLnNldFZlY3RvckxheWVyKHZlY3RvckxheWVyKTtcbiAgICAgICAgICAgICAgICAgICAgZWRpdG9yLm9uKFwiZGlydHlcIixmdW5jdGlvbihkaXJ0eSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnN0YXRlLmhhc0VkaXRzID0gZGlydHk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX2xheWVyc1tsYXllckNvZGVdLmVkaXRvciA9IGVkaXRvcjtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHNlbGYubG9hZEFsbFZlY3RvcnNEYXRhKClcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuYWx3YXlzKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnN0YXRlLnJldHJpZXZpbmdEYXRhID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgICAgIH0pXG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIHRoaXMuX2xvYWRBbGxWZWN0b3JzRGF0YSgpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hbHdheXMoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLnN0YXRlLnJldHJpZXZpbmdEYXRhID0gZmFsc2U7XG4gICAgICAgICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xufTtcblxucHJvdG8ubG9hZEFsbFZlY3RvcnNEYXRhID0gZnVuY3Rpb24odmVjdG9yTGF5ZXJzKXtcblxuICAgIC8vIHZlcmlmaWNvIGNoZSBpbCBCQk9YIGF0dHVhbGUgbm9uIHNpYSBzdGF0byBnacODICBjYXJpY2F0b1xuICAgIHZhciBiYm94ID0gdGhpcy5fbWFwU2VydmljZS5zdGF0ZS5iYm94O1xuICAgIHZhciBsb2FkZWRFeHRlbnQgPSB0aGlzLl9sb2FkZWRFeHRlbnQ7XG4gICAgaWYgKGxvYWRlZEV4dGVudCAmJiBvbC5leHRlbnQuY29udGFpbnNFeHRlbnQobG9hZGVkRXh0ZW50LGJib3gpKXtcbiAgICAgICAgcmV0dXJuIHJlc29sdmVkVmFsdWUoKTtcbiAgICB9XG4gICAgaWYgKCFsb2FkZWRFeHRlbnQpe1xuICAgICAgICB0aGlzLl9sb2FkZWRFeHRlbnQgPSBiYm94O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fbG9hZGVkRXh0ZW50ID0gb2wuZXh0ZW50LmV4dGVuZChsb2FkZWRFeHRlbnQsYmJveCk7XG4gICAgfVxuXG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdmVjdG9yRGF0YVJlcXVlc3RzID0gXy5tYXAoc2VsZi5fbGF5ZXJzLGZ1bmN0aW9uKGl0ZXJuZXRMYXllcil7XG4gICAgICAgIHJldHVybiBzZWxmLmxvYWRWZWN0b3JEYXRhKGl0ZXJuZXRMYXllci52ZWN0b3IsYmJveCk7XG4gICAgfSk7XG5cbiAgICAkLndoZW4uYXBwbHkodGhpcyx2ZWN0b3JEYXRhUmVxdWVzdHMpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgdmVjdG9yc0RhdGFSZXNwb25zZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgbGF5ZXJDb2RlcyA9IHNlbGYuZ2V0TGF5ZXJDb2RlcygpO1xuICAgICAgICAgICAgdmFyIHZlY3RvckRhdGFSZXNwb25zZUZvckl0ZXJuZXRDb2RlID0gXy56aXBPYmplY3QobGF5ZXJDb2Rlcyx2ZWN0b3JzRGF0YVJlc3BvbnNlKTtcbiAgICAgICAgICAgIF8uZm9yRWFjaCh2ZWN0b3JEYXRhUmVzcG9uc2VGb3JJdGVybmV0Q29kZSxmdW5jdGlvbih2ZWN0b3JEYXRhUmVzcG9uc2UsbGF5ZXJDb2RlKXtcbiAgICAgICAgICAgICAgICBpZiAodmVjdG9yRGF0YVJlc3BvbnNlLmZlYXR1cmVsb2Nrcyl7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX2xheWVyc1tsYXllckNvZGVdLmVkaXRvci5zZXRGZWF0dXJlTG9ja3ModmVjdG9yRGF0YVJlc3BvbnNlLmZlYXR1cmVsb2Nrcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgfSk7XG5cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xufTtcblxucHJvdG8uc2V0dXBWZWN0b3JMYXllciA9IGZ1bmN0aW9uKGxheWVyQ29uZmlnKSB7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIC8vIGVzZWd1byBsZSByaWNoaWVzdGUgZGVsbGUgY29uZmlndXJhemlvbmkgZSBtaSB0ZW5nbyBsZSBwcm9tZXNzZVxuICAgIHNlbGYuZ2V0VmVjdG9yTGF5ZXJDb25maWcobGF5ZXJDb25maWcubmFtZSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24odmVjdG9yQ29uZmlnUmVzcG9uc2Upe1xuICAgICAgICAgICAgLy8gaW5zdGFuemlvIGlsIFZlY3RvckxheWVyXG4gICAgICAgICAgICB2YXIgdmVjdG9yQ29uZmlnID0gdmVjdG9yQ29uZmlnUmVzcG9uc2UudmVjdG9yO1xuICAgICAgICAgICAgdmFyIHZlY3RvckxheWVyID0gc2VsZi5jcmVhdGVWZWN0b3JMYXllcih7XG4gICAgICAgICAgICAgICAgZ2VvbWV0cnl0eXBlOiB2ZWN0b3JDb25maWcuZ2VvbWV0cnl0eXBlLFxuICAgICAgICAgICAgICAgIGZvcm1hdDogdmVjdG9yQ29uZmlnLmZvcm1hdCxcbiAgICAgICAgICAgICAgICBjcnM6IFwiRVBTRzozMDAzXCIsXG4gICAgICAgICAgICAgICAgaWQ6IGxheWVyQ29uZmlnLmlkLFxuICAgICAgICAgICAgICAgIG5hbWU6IGxheWVyQ29uZmlnLm5hbWUsXG4gICAgICAgICAgICAgICAgcGs6IHZlY3RvckNvbmZpZy5wa1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyBvdHRlbmdvIGxhIGRlZmluaXppb25lIGRlaSBjYW1waVxuICAgICAgICAgICAgdmVjdG9yTGF5ZXIuc2V0RmllbGRzKHZlY3RvckNvbmZpZy5maWVsZHMpO1xuXG4gICAgICAgICAgICB2YXIgcmVsYXRpb25zID0gdmVjdG9yQ29uZmlnLnJlbGF0aW9ucztcblxuICAgICAgICAgICAgaWYocmVsYXRpb25zKXtcbiAgICAgICAgICAgICAgICAvLyBwZXIgZGlyZSBhIHZlY3RvckxheWVyIGNoZSBpIGRhdGkgZGVsbGUgcmVsYXppb25pIHZlcnJhbm5vIGNhcmljYXRpIHNvbG8gcXVhbmRvIHJpY2hpZXN0aSAoZXMuIGFwZXJ0dXJlIGZvcm0gZGkgZWRpdGluZylcbiAgICAgICAgICAgICAgICB2ZWN0b3JMYXllci5sYXp5UmVsYXRpb25zID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2ZWN0b3JMYXllci5zZXRSZWxhdGlvbnMocmVsYXRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHNldHRvIGxvIHN0aWxlIGRlbCBsYXllciBPTFxuICAgICAgICAgICAgaWYgKGxheWVyQ29uZmlnLnN0eWxlKSB7XG4gICAgICAgICAgICAgICAgdmVjdG9yTGF5ZXIuc2V0U3R5bGUobGF5ZXJDb25maWcuc3R5bGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh2ZWN0b3JMYXllcik7XG4gICAgICAgIH0pXG4gICAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgfSlcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xufTtcblxucHJvdG8ubG9hZFZlY3RvckRhdGEgPSBmdW5jdGlvbih2ZWN0b3JMYXllciwgYmJveCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIGVzZWd1byBsZSByaWNoaWVzdGUgZGUgZGF0aSBlIG1pIHRlbmdvIGxlIHByb21lc3NlXG4gICAgcmV0dXJuIHNlbGYuZ2V0VmVjdG9yTGF5ZXJEYXRhKHZlY3RvckxheWVyLGJib3gpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHZlY3RvckRhdGFSZXNwb25zZSl7XG4gICAgICAgICAgICB2ZWN0b3JMYXllci5zZXREYXRhKHZlY3RvckRhdGFSZXNwb25zZS52ZWN0b3IuZGF0YSk7XG4gICAgICAgICAgICByZXR1cm4gdmVjdG9yRGF0YVJlc3BvbnNlO1xuICAgICAgICB9KTtcbn07XG5cbi8vIG90dGllbmUgbGEgY29uZmlndXJhemlvbmUgZGVsIHZldHRvcmlhbGUgKHF1aSByaWNoaWVzdG8gc29sbyBwZXIgbGEgZGVmaW5pemlvbmUgZGVnbGkgaW5wdXQpXG5wcm90by5nZXRWZWN0b3JMYXllckNvbmZpZyA9IGZ1bmN0aW9uKGxheWVyTmFtZSl7XG4gICAgdmFyIGQgPSAkLkRlZmVycmVkKCk7XG4gICAgJC5nZXQodGhpcy5jb25maWcuYmFzZXVybCtsYXllck5hbWUrXCIvP2NvbmZpZ1wiKVxuICAgICAgICAuZG9uZShmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIGQucmVzb2x2ZShkYXRhKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGQucmVqZWN0KCk7XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBkLnByb21pc2UoKTtcbn07XG5cbi8vIG90dGllbmUgaWwgdmV0dG9yaWFsZSBpbiBtb2RhbGl0w4MgIGVkaXRpbmdcbnByb3RvLmdldFZlY3RvckxheWVyRGF0YSA9IGZ1bmN0aW9uKHZlY3RvckxheWVyLCBiYm94KSB7XG4gICAgdmFyIGQgPSAkLkRlZmVycmVkKCk7XG4gICAgJC5nZXQodGhpcy5jb25maWcuYmFzZXVybCt2ZWN0b3JMYXllci5uYW1lK1wiLz9lZGl0aW5nJmluX2Jib3g9XCIrYmJveFswXStcIixcIitiYm94WzFdK1wiLFwiK2Jib3hbMl0rXCIsXCIrYmJveFszXSlcbiAgICAgICAgLmRvbmUoZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICBkLnJlc29sdmUoZGF0YSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBkLnJlamVjdCgpO1xuICAgICAgICB9KVxuICAgIHJldHVybiBkLnByb21pc2UoKTtcbn07XG5cbnByb3RvLmNyZWF0ZVZlY3RvckxheWVyID0gZnVuY3Rpb24ob3B0aW9ucywgZGF0YSl7XG4gICAgdmFyIHZlY3RvciA9IG5ldyBWZWN0b3JMYXllcihvcHRpb25zKTtcbiAgICByZXR1cm4gdmVjdG9yO1xufTsiLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xuXG5cbmZ1bmN0aW9uIE1hcExheWVyKGNvbmZpZyl7XG4gIHRoaXMuY29uZmlnID0gY29uZmlnIHx8IHt9O1xuICB0aGlzLmlkID0gY29uZmlnLmlkO1xuICBcbiAgdGhpcy5fb2xMYXllciA9IG51bGw7XG4gIFxuICBiYXNlKHRoaXMpO1xufVxuaW5oZXJpdChNYXBMYXllcixHM1dPYmplY3QpO1xuXG52YXIgcHJvdG8gPSBNYXBMYXllci5wcm90b3R5cGU7XG5cbnByb3RvLmdldElkID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuaWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcExheWVyO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciB0cnVlZm5jID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnRydWVmbmM7XG52YXIgcmVzb2x2ZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZXNvbHZlO1xudmFyIHJlamVjdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZWplY3Q7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcblxuZnVuY3Rpb24gVmVjdG9yTGF5ZXIoY29uZmlnKXtcbiAgdmFyIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcbiAgdGhpcy5nZW9tZXRyeXR5cGUgPSBjb25maWcuZ2VvbWV0cnl0eXBlIHx8IG51bGw7XG4gIHRoaXMuZm9ybWF0ID0gY29uZmlnLmZvcm1hdCB8fCBudWxsO1xuICB0aGlzLmNycyA9IGNvbmZpZy5jcnMgIHx8IG51bGw7XG4gIHRoaXMuaWQgPSBjb25maWcuaWQgfHwgbnVsbDtcbiAgdGhpcy5uYW1lID0gY29uZmlnLm5hbWUgfHwgXCJcIjtcbiAgdGhpcy5wayA9IGNvbmZpZy5wayB8fCBcImlkXCI7IC8vIFRPRE86IGlsIEdlb0pTT04gc2V0dGEgbCdpZCBkZWxsYSBmZWF0dXJlIGRhIHPDqSwgZSBuYXNjb25kZSBpbCBjYW1wbyBQSyBkYWxsZSBwcm9wZXJ0aWVzLiBJbiBhbHRyaSBmb3JtYXRpIHZhIHZlcmlmaWNhdG8sIGUgY2Fzb21haSB1c2FyZSBmZWF0dXJlLnNldElkKClcbiAgXG4gIHRoaXMuX29sU291cmNlID0gbmV3IG9sLnNvdXJjZS5WZWN0b3Ioe1xuICAgIGZlYXR1cmVzOiBuZXcgb2wuQ29sbGVjdGlvbigpXG4gIH0pO1xuICB0aGlzLl9vbExheWVyID0gbmV3IG9sLmxheWVyLlZlY3Rvcih7XG4gICAgbmFtZTogdGhpcy5uYW1lLFxuICAgIHNvdXJjZTogdGhpcy5fb2xTb3VyY2VcbiAgfSk7XG4gIFxuICAvKlxuICAgKiBBcnJheSBkaSBvZ2dldHRpOlxuICAgKiB7XG4gICAqICBuYW1lOiBOb21lIGRlbGwnYXR0cmlidXRvLFxuICAgKiAgdHlwZTogaW50ZWdlciB8IGZsb2F0IHwgc3RyaW5nIHwgYm9vbGVhbiB8IGRhdGUgfCB0aW1lIHwgZGF0ZXRpbWUsXG4gICAqICBpbnB1dDoge1xuICAgKiAgICBsYWJlbDogTm9tZSBkZWwgY2FtcG8gZGkgaW5wdXQsXG4gICAqICAgIHR5cGU6IHNlbGVjdCB8IGNoZWNrIHwgcmFkaW8gfCBjb29yZHNwaWNrZXIgfCBib3hwaWNrZXIgfCBsYXllcnBpY2tlciB8IGZpZWxkZGVwZW5kLFxuICAgKiAgICBvcHRpb25zOiB7XG4gICAqICAgICAgTGUgb3B6aW9uaSBwZXIgbG8gc3BjaWZpY28gdGlwbyBkaSBpbnB1dCAoZXMuIFwidmFsdWVzXCIgcGVyIGxhIGxpc3RhIGRpIHZhbG9yaSBkaSBzZWxlY3QsIGNoZWNrIGUgcmFkaW8pXG4gICAqICAgIH1cbiAgICogIH1cbiAgICogfVxuICAqL1xuICB0aGlzLl9QS2luQXR0cmlidXRlcyA9IGZhbHNlO1xuICB0aGlzLl9mZWF0dXJlc0ZpbHRlciA9IG51bGw7XG4gIHRoaXMuX2ZpZWxkcyA9IG51bGxcbiAgdGhpcy5sYXp5UmVsYXRpb25zID0gdHJ1ZTtcbiAgdGhpcy5fcmVsYXRpb25zID0gbnVsbDtcbn1cbmluaGVyaXQoVmVjdG9yTGF5ZXIsRzNXT2JqZWN0KTtcbm1vZHVsZS5leHBvcnRzID0gVmVjdG9yTGF5ZXI7XG5cbnZhciBwcm90byA9IFZlY3RvckxheWVyLnByb3RvdHlwZTtcblxucHJvdG8uc2V0RGF0YSA9IGZ1bmN0aW9uKGZlYXR1cmVzRGF0YSl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGZlYXR1cmVzO1xuICBpZiAodGhpcy5mb3JtYXQpIHtcbiAgICBzd2l0Y2ggKHRoaXMuZm9ybWF0KXtcbiAgICAgIGNhc2UgXCJHZW9KU09OXCI6XG4gICAgICAgIHZhciBnZW9qc29uID0gbmV3IG9sLmZvcm1hdC5HZW9KU09OKHtcbiAgICAgICAgICBkZWZhdWx0RGF0YVByb2plY3Rpb246IHRoaXMuY3JzLFxuICAgICAgICAgIGdlb21ldHJ5TmFtZTogXCJnZW9tZXRyeVwiXG4gICAgICAgIH0pO1xuICAgICAgICBmZWF0dXJlcyA9IGdlb2pzb24ucmVhZEZlYXR1cmVzKGZlYXR1cmVzRGF0YSk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBcbiAgICBpZiAoZmVhdHVyZXMgJiYgZmVhdHVyZXMubGVuZ3RoKSB7XG4gICAgICBpZiAoIV8uaXNOdWxsKHRoaXMuX2ZlYXR1cmVzRmlsdGVyKSl7XG4gICAgICAgIHZhciBmZWF0dXJlcyA9IF8ubWFwKGZlYXR1cmVzLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgICAgIHJldHVybiBzZWxmLl9mZWF0dXJlc0ZpbHRlcihmZWF0dXJlKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHZhciBhbHJlYWR5TG9hZGVkSWRzID0gdGhpcy5nZXRGZWF0dXJlSWRzKCk7XG4gICAgICB2YXIgZmVhdHVyZXNUb0xvYWQgPSBfLmZpbHRlcihmZWF0dXJlcyxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgICAgcmV0dXJuICFfLmluY2x1ZGVzKGFscmVhZHlMb2FkZWRJZHMsZmVhdHVyZS5nZXRJZCgpKTtcbiAgICAgIH0pXG4gICAgICBcbiAgICAgIHRoaXMuX29sU291cmNlLmFkZEZlYXR1cmVzKGZlYXR1cmVzVG9Mb2FkKTtcbiAgICAgIFxuICAgICAgLy8gdmVyaWZpY28sIHByZW5kZW5kbyBsYSBwcmltYSBmZWF0dXJlLCBzZSBsYSBQSyDDqCBwcmVzZW50ZSBvIG1lbm8gdHJhIGdsaSBhdHRyaWJ1dGlcbiAgICAgIHZhciBhdHRyaWJ1dGVzID0gdGhpcy5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlcygpWzBdLmdldFByb3BlcnRpZXMoKTtcbiAgICAgIHRoaXMuX1BLaW5BdHRyaWJ1dGVzID0gXy5nZXQoYXR0cmlidXRlcyx0aGlzLnBrKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgZWxzZSB7XG4gICAgY29uc29sZS5sb2coXCJWZWN0b3JMYXllciBmb3JtYXQgbm90IGRlZmluZWRcIik7XG4gIH1cbn07XG5cbnByb3RvLnNldEZlYXR1cmVEYXRhID0gZnVuY3Rpb24ob2xkZmlkLGZpZCxnZW9tZXRyeSxhdHRyaWJ1dGVzKXtcbiAgdmFyIGZlYXR1cmUgPSB0aGlzLmdldEZlYXR1cmVCeUlkKG9sZGZpZCk7XG4gIGlmIChmaWQpe1xuICAgIGZlYXR1cmUuc2V0SWQoZmlkKTtcbiAgfVxuICBcbiAgaWYgKGdlb21ldHJ5KXtcbiAgICBmZWF0dXJlLnNldEdlb21ldHJ5KGdlb21ldHJ5KTtcbiAgfVxuICBcbiAgaWYgKGF0dHJpYnV0ZXMpe1xuICAgIHZhciBvbGRBdHRyaWJ1dGVzID0gZmVhdHVyZS5nZXRQcm9wZXJ0aWVzKCk7XG4gICAgdmFyIG5ld0F0dHJpYnV0ZXMgPV8uYXNzaWduKG9sZEF0dHJpYnV0ZXMsYXR0cmlidXRlcyk7XG4gICAgZmVhdHVyZS5zZXRQcm9wZXJ0aWVzKG5ld0F0dHJpYnV0ZXMpO1xuICB9XG4gIFxuICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnByb3RvLmFkZEZlYXR1cmVzID0gZnVuY3Rpb24oZmVhdHVyZXMpe1xuICB0aGlzLmdldFNvdXJjZSgpLmFkZEZlYXR1cmVzKGZlYXR1cmVzKTtcbn07XG5cbnByb3RvLnNldEZlYXR1cmVzRmlsdGVyID0gZnVuY3Rpb24oZmVhdHVyZXNGaWx0ZXIpe1xuICB0aGlzLl9mZWF0dXJlc0ZpbHRlciA9IGZlYXR1cmVzRmlsdGVyO1xufTtcblxucHJvdG8uc2V0RmllbGRzID0gZnVuY3Rpb24oZmllbGRzKXtcbiAgdGhpcy5fZmllbGRzID0gZmllbGRzO1xufTtcblxucHJvdG8uc2V0UGtGaWVsZCA9IGZ1bmN0aW9uKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHBrZmllbGRTZXQgPSBmYWxzZTtcbiAgXy5mb3JFYWNoKHRoaXMuX2ZpZWxkcyxmdW5jdGlvbihmaWVsZCl7XG4gICAgaWYgKGZpZWxkLm5hbWUgPT0gc2VsZi5wayApe1xuICAgICAgcGtmaWVsZFNldCA9IHRydWU7XG4gICAgfVxuICB9KTtcbiAgXG4gIGlmICghcGtmaWVsZFNldCl7XG4gICAgdGhpcy5fZmllbGRzXG4gIH1cbn07XG5cbnByb3RvLmdldEZlYXR1cmVzID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZXMoKTtcbn07XG5cbnByb3RvLmdldEZlYXR1cmVJZHMgPSBmdW5jdGlvbigpe1xuICB2YXIgZmVhdHVyZUlkcyA9IF8ubWFwKHRoaXMuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZXMoKSxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICByZXR1cm4gZmVhdHVyZS5nZXRJZCgpO1xuICB9KVxuICByZXR1cm4gZmVhdHVyZUlkc1xufTtcblxucHJvdG8uZ2V0RmllbGRzID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIF8uY2xvbmVEZWVwKHRoaXMuX2ZpZWxkcyk7XG59O1xuXG5wcm90by5nZXRGaWVsZHNOYW1lcyA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiBfLm1hcCh0aGlzLl9maWVsZHMsZnVuY3Rpb24oZmllbGQpe1xuICAgIHJldHVybiBmaWVsZC5uYW1lO1xuICB9KTtcbn07XG5cbnByb3RvLmdldEZpZWxkc1dpdGhWYWx1ZXMgPSBmdW5jdGlvbihvYmope1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIC8qdmFyIGZpZWxkcyA9IF8uY2xvbmVEZWVwKF8uZmlsdGVyKHRoaXMuX2ZpZWxkcyxmdW5jdGlvbihmaWVsZCl7XG4gICAgcmV0dXJuICgoZmllbGQubmFtZSAhPSBzZWxmLnBrKSAmJiBmaWVsZC5lZGl0YWJsZSk7XG4gIH0pKTsqL1xuICB2YXIgZmllbGRzID0gXy5jbG9uZURlZXAodGhpcy5fZmllbGRzKTtcbiAgXG4gIHZhciBmZWF0dXJlLCBhdHRyaWJ1dGVzO1xuICBcbiAgLy8gaWwgbWV0b2RvIGFjY2V0dGEgc2lhIGZlYXR1cmUgY2hlIGZpZFxuICBpZiAob2JqIGluc3RhbmNlb2Ygb2wuRmVhdHVyZSl7XG4gICAgZmVhdHVyZSA9IG9iajtcbiAgfVxuICBlbHNlIGlmIChvYmope1xuICAgIGZlYXR1cmUgPSB0aGlzLmdldEZlYXR1cmVCeUlkKG9iaik7XG4gIH1cbiAgaWYgKGZlYXR1cmUpe1xuICAgIGF0dHJpYnV0ZXMgPSBmZWF0dXJlLmdldFByb3BlcnRpZXMoKTtcbiAgfVxuICBcbiAgXy5mb3JFYWNoKGZpZWxkcyxmdW5jdGlvbihmaWVsZCl7XG4gICAgaWYgKGZlYXR1cmUpe1xuICAgICAgaWYgKCF0aGlzLl9QS2luQXR0cmlidXRlcyAmJiBmaWVsZC5uYW1lID09IHNlbGYucGspe1xuICAgICAgICBmaWVsZC52YWx1ZSA9IGZlYXR1cmUuZ2V0SWQoKTtcbiAgICAgIH1cbiAgICAgIGVsc2V7XG4gICAgICAgIGZpZWxkLnZhbHVlID0gYXR0cmlidXRlc1tmaWVsZC5uYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIGZpZWxkLnZhbHVlID0gbnVsbDtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZmllbGRzO1xufTtcblxucHJvdG8uc2V0UmVsYXRpb25zID0gZnVuY3Rpb24ocmVsYXRpb25zKXtcbiAgdGhpcy5fcmVsYXRpb25zID0gcmVsYXRpb25zO1xuICBfLmZvckVhY2gocmVsYXRpb25zLGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgICBfLmZvckVhY2gocmVsYXRpb24uZmllbGRzLGZ1bmN0aW9uKGZpZWxkLGlkeCl7XG4gICAgICBpZiAoZmllbGQubmFtZSA9PSByZWxhdGlvbi5waykge1xuICAgICAgICByZWxhdGlvbi5wa0ZpZWxkSW5kZXggPSBpZHhcbiAgICAgIH1cbiAgICB9KVxuICB9KVxufTtcblxucHJvdG8uZ2V0UmVsYXRpb25zID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuX3JlbGF0aW9ucztcbn07XG5cbnByb3RvLmdldFJlbGF0aW9uID0gZnVuY3Rpb24ocmVsYXRpb25OYW1lKSB7XG4gIHZhciByZWxhdGlvbjtcbiAgXy5mb3JFYWNoKHRoaXMuX3JlbGF0aW9ucyxmdW5jdGlvbihfcmVsYXRpb24pe1xuICAgIGlmIChfcmVsYXRpb24ubmFtZSA9PSByZWxhdGlvbk5hbWUpIHtcbiAgICAgIHJlbGF0aW9uID0gX3JlbGF0aW9uO1xuICAgIH1cbiAgfSlcbiAgcmV0dXJuIHJlbGF0aW9uO1xufTtcblxucHJvdG8uaGFzUmVsYXRpb25zID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuICFfLmlzTnVsbCh0aGlzLl9yZWxhdGlvbnMpO1xufTtcblxucHJvdG8uZ2V0UmVsYXRpb25Qa0ZpZWxkSW5kZXggPSBmdW5jdGlvbihyZWxhdGlvbikge1xuICB2YXIgcGtGaWVsZEluZGV4O1xuICBfLmZvckVhY2gocmVsYXRpb24uZmllbGRzLGZ1bmN0aW9uKGZpZWxkLGlkeCl7XG4gICAgaWYgKGZpZWxkLm5hbWUgPT0gcmVsYXRpb24ucGspIHtcbiAgICAgIHBrRmllbGRJbmRleCA9IGlkeDtcbiAgICB9XG4gIH0pXG4gIHJldHVybiBwa0ZpZWxkSW5kZXg7XG59O1xuXG5wcm90by5nZXRSZWxhdGlvbkVsZW1lbnRQa1ZhbHVlID0gZnVuY3Rpb24ocmVsYXRpb24sZWxlbWVudCkge1xuICB2YXIgcGtGaWVsZEluZGV4ID0gdGhpcy5nZXRSZWxhdGlvblBrRmllbGRJbmRleChyZWxhdGlvbik7XG4gIHJldHVybiBlbGVtZW50LmZpZWxkc1twa0ZpZWxkSW5kZXhdLnZhbHVlO1xufTtcblxucHJvdG8uZ2V0UmVsYXRpb25zRmtzS2V5cyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBma3MgPSBbXTtcbiAgXy5mb3JFYWNoKHRoaXMuX3JlbGF0aW9ucyxmdW5jdGlvbihyZWxhdGlvbil7XG4gICAgZmtzLnB1c2gocmVsYXRpb24uZmspO1xuICB9KVxuICByZXR1cm4gZmtzO1xufTtcblxucHJvdG8uZ2V0UmVsYXRpb25GaWVsZHMgPSBmdW5jdGlvbihyZWxhdGlvbikge1xuICByZXR1cm4gcmVsYXRpb24uZmllbGRzO1xufTtcblxucHJvdG8uZ2V0UmVsYXRpb25GaWVsZHNOYW1lcyA9IGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgcmV0dXJuIF8ubWFwKHJlbGF0aW9uRmllbGRzLGZ1bmN0aW9uKGZpZWxkKXtcbiAgICByZXR1cm4gZmllbGQubmFtZTtcbiAgfSk7XG59O1xuXG4vLyBvdHRlbmdvIGxlIHJlbGF6aW9uaSBhIHBhcnRpcmUgZGFsIGZpZCBkaSB1bmEgZmVhdHVyZSBlc2lzdGVudGVcbnByb3RvLmdldFJlbGF0aW9uc1dpdGhWYWx1ZXMgPSBmdW5jdGlvbihmaWQpe1xuICBpZiAoIXRoaXMuX3JlbGF0aW9ucykge1xuICAgIHJlc29sdmUoW10pO1xuICB9XG4gIHZhciByZWxhdGlvbnMgPSBfLmNsb25lRGVlcCh0aGlzLl9yZWxhdGlvbnMpO1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghZmlkIHx8ICF0aGlzLmdldEZlYXR1cmVCeUlkKGZpZCkpe1xuICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsZnVuY3Rpb24ocmVsYXRpb24pe1xuICAgICAgcmVsYXRpb24uZWxlbWVudHMgPSBbXTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzb2x2ZShyZWxhdGlvbnMpO1xuICB9XG4gIGVsc2Uge1xuICAgIGlmICh0aGlzLmxhenlSZWxhdGlvbnMpe1xuICAgICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgICAgdmFyIGF0dHJpYnV0ZXMgPSB0aGlzLmdldEZlYXR1cmVCeUlkKGZpZCkuZ2V0UHJvcGVydGllcygpO1xuICAgICAgdmFyIGZrcyA9IHt9O1xuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9ucyxmdW5jdGlvbihyZWxhdGlvbil7XG4gICAgICAgIHZhciBrZXlWYWxzID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxhdGlvbi5mayxmdW5jdGlvbihma0tleSl7XG4gICAgICAgICAgZmtzW2ZrS2V5XSA9IGF0dHJpYnV0ZXNbZmtLZXldO1xuICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgICBcbiAgICAgIHRoaXMuZ2V0UmVsYXRpb25zV2l0aFZhbHVlc0Zyb21Ga3MoZmtzKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVsYXRpb25zUmVzcG9uc2Upe1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlbGF0aW9uc1Jlc3BvbnNlKTtcbiAgICAgIH0pXG4gICAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIG90dGVuZ28gbGUgcmVsYXppb25pIHZhbG9yaXp6YXRlIGEgcGFydGlyZSBkYSB1biBvZ2dldHRvIGNvbiBsZSBjaGlhdmkgRksgY29tZSBrZXlzIGUgaSBsb3JvIHZhbG9yaSBjb21lIHZhbHVlc1xucHJvdG8uZ2V0UmVsYXRpb25zV2l0aFZhbHVlc0Zyb21Ga3MgPSBmdW5jdGlvbihma3Mpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciByZWxhdGlvbnMgPSBfLmNsb25lRGVlcCh0aGlzLl9yZWxhdGlvbnMpO1xuICB2YXIgcmVsYXRpb25zUmVxdWVzdHMgPSBbXTtcblxuICBfLmZvckVhY2gocmVsYXRpb25zLGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgICByZWxhdGlvbi5lbGVtZW50cyA9IFtdOyAvLyBjcmVvIGxhIHByb3ByaWV0w6AgY2hlIGFjY29nbGllcsOgIGdsaSBlbGVtZW50aSBkZWxsYSByZWxhemlvbmVcbiAgICB2YXIgdXJsID0gcmVsYXRpb24udXJsO1xuICAgIHZhciBrZXlWYWxzID0gW107XG4gICAgXy5mb3JFYWNoKHJlbGF0aW9uLmZrLGZ1bmN0aW9uKGZrS2V5KXtcbiAgICAgIHZhciBma1ZhbHVlID0gZmtzW2ZrS2V5XTtcbiAgICAgIGtleVZhbHMucHVzaChma0tleStcIj1cIitma1ZhbHVlKTtcbiAgICB9KTtcbiAgICB2YXIgZmtQYXJhbXMgPSBfLmpvaW4oa2V5VmFscyxcIiZcIik7XG4gICAgdXJsICs9IFwiP1wiK2ZrUGFyYW1zO1xuICAgIHJlbGF0aW9uc1JlcXVlc3RzLnB1c2goJC5nZXQodXJsKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVsYXRpb25zRWxlbWVudHMpe1xuICAgICAgICBpZiAocmVsYXRpb25zRWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHJlbGF0aW9uc0VsZW1lbnRzLGZ1bmN0aW9uKHJlbGF0aW9uRWxlbWVudCl7XG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IHt9O1xuICAgICAgICAgICAgZWxlbWVudC5maWVsZHMgPSBfLmNsb25lRGVlcChyZWxhdGlvbi5maWVsZHMpO1xuICAgICAgICAgICAgXy5mb3JFYWNoKGVsZW1lbnQuZmllbGRzLGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgICAgZmllbGQudmFsdWUgPSByZWxhdGlvbkVsZW1lbnRbZmllbGQubmFtZV07XG4gICAgICAgICAgICAgIGlmIChmaWVsZC5uYW1lID09IHJlbGF0aW9uLnBrKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5pZCA9IGZpZWxkLnZhbHVlIC8vIGFnZ2l1bmdvIGVsZW1lbnQuaWQgZGFuZG9nbGkgaWwgdmFsb3JlIGRlbGxhIGNoaWF2ZSBwcmltYXJpYSBkZWxsYSByZWxhemlvbmVcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJlbGF0aW9uLmVsZW1lbnRzLnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApXG4gIH0pXG4gIFxuICByZXR1cm4gJC53aGVuLmFwcGx5KHRoaXMscmVsYXRpb25zUmVxdWVzdHMpXG4gIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHJlbGF0aW9ucztcbiAgfSk7XG59XG5cbnByb3RvLnNldFN0eWxlID0gZnVuY3Rpb24oc3R5bGUpe1xuICB0aGlzLl9vbExheWVyLnNldFN0eWxlKHN0eWxlKTtcbn07XG5cbnByb3RvLmdldE1hcExheWVyID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuX29sTGF5ZXI7XG59O1xuXG5wcm90by5nZXRTb3VyY2UgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5fb2xMYXllci5nZXRTb3VyY2UoKTtcbn07XG5cbnByb3RvLmdldEZlYXR1cmVCeUlkID0gZnVuY3Rpb24oaWQpe1xuICByZXR1cm4gdGhpcy5fb2xMYXllci5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlQnlJZChpZCk7XG59O1xuXG5wcm90by5jbGVhciA9IGZ1bmN0aW9uKCl7XG4gIHRoaXMuZ2V0U291cmNlKCkuY2xlYXIoKTtcbn07XG5cbnByb3RvLmFkZFRvTWFwID0gZnVuY3Rpb24obWFwKXtcbiAgbWFwLmFkZExheWVyKHRoaXMuX29sTGF5ZXIpO1xufTtcblxuLy8gZGF0YSB1bmEgZmVhdHVyZSB2ZXJpZmljbyBzZSBoYSB0cmEgZ2xpIGF0dHJpYnV0aSBpIHZhbG9yaSBkZWxsZSBGSyBkZWxsZSAoZXZlbnR1YWxpKSByZWxhemlvbmlcbnByb3RvLmZlYXR1cmVIYXNSZWxhdGlvbnNGa3NXaXRoVmFsdWVzID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gIHZhciBhdHRyaWJ1dGVzID0gZmVhdHVyZS5nZXRQcm9wZXJ0aWVzKCk7XG4gIHZhciBma3NLZXlzID0gdGhpcy5nZXRSZWxhdGlvbnNGa3NLZXlzKCk7XG4gIHJldHVybiBfLmV2ZXJ5KGZrc0tleXMsZnVuY3Rpb24oZmtLZXkpe1xuICAgIHZhciB2YWx1ZSA9IGF0dHJpYnV0ZXNbZmtLZXldO1xuICAgIHJldHVybiAoIV8uaXNOaWwodmFsdWUpICYmIHZhbHVlICE9ICcnKTtcbiAgfSlcbn07XG5cbi8vIGRhdGEgdW5hIGZlYXR1cmUgcG9wb2xvIHVuIG9nZ2V0dG8gY29uIGNoaWF2aS92YWxvcmkgZGVsbGUgRksgZGVsbGUgKGV2ZW50dWFsaSkgcmVsYXppb25lXG5wcm90by5nZXRSZWxhdGlvbnNGa3NXaXRoVmFsdWVzRm9yRmVhdHVyZSA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICB2YXIgYXR0cmlidXRlcyA9IGZlYXR1cmUuZ2V0UHJvcGVydGllcygpO1xuICB2YXIgZmtzID0ge307XG4gIHZhciBma3NLZXlzID0gdGhpcy5nZXRSZWxhdGlvbnNGa3NLZXlzKCk7XG4gIF8uZm9yRWFjaChma3NLZXlzLGZ1bmN0aW9uKGZrS2V5KXtcbiAgICBma3NbZmtLZXldID0gYXR0cmlidXRlc1tma0tleV07XG4gIH0pXG4gIHJldHVybiBma3M7XG59O1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgZ2VvID0gcmVxdWlyZSgnY29yZS91dGlscy9nZW8nKTtcbnZhciBNYXBMYXllciA9IHJlcXVpcmUoJ2NvcmUvbWFwL2xheWVyL21hcGxheWVyJyk7XG52YXIgUmFzdGVyTGF5ZXJzID0gcmVxdWlyZSgnZzN3LW9sMy9zcmMvbGF5ZXJzL3Jhc3RlcnMnKTtcblxuZnVuY3Rpb24gV01TTGF5ZXIob3B0aW9ucyxleHRyYVBhcmFtcyl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5MQVlFUlRZUEUgPSB7XG4gICAgTEFZRVI6ICdsYXllcicsXG4gICAgTVVMVElMQVlFUjogJ211bHRpbGF5ZXInXG4gIH07XG5cbiAgdGhpcy5leHRyYVBhcmFtcyA9IGV4dHJhUGFyYW1zXG4gIHRoaXMubGF5ZXJzID0gW107XG4gIFxuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG59XG5pbmhlcml0KFdNU0xheWVyLE1hcExheWVyKVxudmFyIHByb3RvID0gV01TTGF5ZXIucHJvdG90eXBlO1xuXG5wcm90by5nZXRPTExheWVyID0gZnVuY3Rpb24od2l0aExheWVycyl7XG4gIHZhciBvbExheWVyID0gdGhpcy5fb2xMYXllcjtcbiAgaWYgKCFvbExheWVyKXtcbiAgICBvbExheWVyID0gdGhpcy5fb2xMYXllciA9IHRoaXMuX21ha2VPbExheWVyKHdpdGhMYXllcnMpO1xuICB9XG4gIHJldHVybiBvbExheWVyO1xufTtcblxucHJvdG8uZ2V0U291cmNlID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuZ2V0T0xMYXllcigpLmdldFNvdXJjZSgpO1xufTtcblxucHJvdG8uZ2V0SW5mb0Zvcm1hdCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJ2FwcGxpY2F0aW9uL3ZuZC5vZ2MuZ21sJztcbn07XG5cbnByb3RvLmdldEdldEZlYXR1cmVJbmZvVXJsID0gZnVuY3Rpb24oY29vcmRpbmF0ZSxyZXNvbHV0aW9uLGVwc2cscGFyYW1zKXtcbiAgcmV0dXJuIHRoaXMuZ2V0T0xMYXllcigpLmdldFNvdXJjZSgpLmdldEdldEZlYXR1cmVJbmZvVXJsKGNvb3JkaW5hdGUscmVzb2x1dGlvbixlcHNnLHBhcmFtcyk7XG59O1xuXG5wcm90by5nZXRMYXllckNvbmZpZ3MgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5sYXllcnM7XG59O1xuXG5wcm90by5hZGRMYXllciA9IGZ1bmN0aW9uKGxheWVyKXtcbiAgdGhpcy5sYXllcnMucHVzaChsYXllcik7XG59O1xuXG5wcm90by50b2dnbGVMYXllciA9IGZ1bmN0aW9uKGxheWVyKXtcbiAgXy5mb3JFYWNoKHRoaXMubGF5ZXJzLGZ1bmN0aW9uKF9sYXllcil7XG4gICAgaWYgKF9sYXllci5pZCA9PSBsYXllci5pZCl7XG4gICAgICBfbGF5ZXIudmlzaWJsZSA9IGxheWVyLnZpc2libGU7XG4gICAgfVxuICB9KTtcbiAgdGhpcy5fdXBkYXRlTGF5ZXJzKCk7XG59O1xuICBcbnByb3RvLnVwZGF0ZSA9IGZ1bmN0aW9uKG1hcFN0YXRlLGV4dHJhUGFyYW1zKXtcbiAgdGhpcy5fdXBkYXRlTGF5ZXJzKG1hcFN0YXRlLGV4dHJhUGFyYW1zKTtcbn07XG5cbnByb3RvLmlzVmlzaWJsZSA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLl9nZXRWaXNpYmxlTGF5ZXJzKCkubGVuZ3RoID4gMDtcbn07XG5cbnByb3RvLmdldFF1ZXJ5VXJsID0gZnVuY3Rpb24oKXtcbiAgdmFyIGxheWVyID0gdGhpcy5sYXllcnNbMF07XG4gIGlmIChsYXllci5pbmZvdXJsICYmIGxheWVyLmluZm91cmwgIT0gJycpIHtcbiAgICByZXR1cm4gbGF5ZXIuaW5mb3VybDtcbiAgfVxuICByZXR1cm4gdGhpcy5jb25maWcudXJsO1xufTtcblxucHJvdG8uZ2V0UXVlcnlhYmxlTGF5ZXJzID0gZnVuY3Rpb24oKXsgXG4gIHJldHVybiBfLmZpbHRlcih0aGlzLmxheWVycyxmdW5jdGlvbihsYXllcil7XG4gICAgcmV0dXJuIGxheWVyLmlzUXVlcnlhYmxlKCk7XG4gIH0pO1xufTtcblxucHJvdG8uX2dldFZpc2libGVMYXllcnMgPSBmdW5jdGlvbihtYXBTdGF0ZSl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHZpc2libGVMYXllcnMgPSBbXTtcbiAgXy5mb3JFYWNoKHRoaXMubGF5ZXJzLGZ1bmN0aW9uKGxheWVyKXtcbiAgICB2YXIgcmVzb2x1dGlvbkJhc2VkVmlzaWJpbGl0eSA9IGxheWVyLnN0YXRlLm1heHJlc29sdXRpb24gPyAobGF5ZXIuc3RhdGUubWF4cmVzb2x1dGlvbiAmJiBsYXllci5zdGF0ZS5tYXhyZXNvbHV0aW9uID4gbWFwU3RhdGUucmVzb2x1dGlvbikgOiB0cnVlO1xuICAgIGlmIChsYXllci5zdGF0ZS52aXNpYmxlICYmIHJlc29sdXRpb25CYXNlZFZpc2liaWxpdHkpIHtcbiAgICAgIHZpc2libGVMYXllcnMucHVzaChsYXllcik7XG4gICAgfSAgICBcbiAgfSlcbiAgcmV0dXJuIHZpc2libGVMYXllcnM7XG59O1xuXG5wcm90by5fbWFrZU9sTGF5ZXIgPSBmdW5jdGlvbih3aXRoTGF5ZXJzKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgd21zQ29uZmlnID0ge1xuICAgIHVybDogdGhpcy5jb25maWcudXJsLFxuICAgIGlkOiB0aGlzLmNvbmZpZy5pZFxuICB9O1xuICBcbiAgaWYgKHdpdGhMYXllcnMpIHtcbiAgICB3bXNDb25maWcubGF5ZXJzID0gXy5tYXAodGhpcy5sYXllcnMsZnVuY3Rpb24obGF5ZXIpe1xuICAgICAgcmV0dXJuIGxheWVyLmdldFdNU0xheWVyTmFtZSgpO1xuICAgIH0pO1xuICB9XG4gIFxuICB2YXIgcmVwcmVzZW50YXRpdmVMYXllciA9IHRoaXMubGF5ZXJzWzBdOyAvL0JSVVRUTywgREVWTyBQUkVOREVSRSBVTiBMQVlFUiBBIENBU08gKElMIFBSSU1PKSBQRVIgVkVERVJFIFNFIFBVTlRBIEFEIFVOIFNPVVJDRSBESVZFUlNPIChkb3ZyZWJiZSBhY2NhZGVyZSBzb2xvIHBlciBpIGxheWVyIHNpbmdvbGksIFdNUyBlc3Rlcm5pKVxuICBcbiAgaWYgKHJlcHJlc2VudGF0aXZlTGF5ZXIuc3RhdGUuc291cmNlICYmIHJlcHJlc2VudGF0aXZlTGF5ZXIuc3RhdGUuc291cmNlLnR5cGUgPT0gJ3dtcycgJiYgcmVwcmVzZW50YXRpdmVMYXllci5zdGF0ZS5zb3VyY2UudXJsKXtcbiAgICB3bXNDb25maWcudXJsID0gcmVwcmVzZW50YXRpdmVMYXllci5zdGF0ZS5zb3VyY2UudXJsO1xuICB9O1xuICBcbiAgdmFyIG9sTGF5ZXIgPSBuZXcgUmFzdGVyTGF5ZXJzLldNU0xheWVyKHdtc0NvbmZpZyx0aGlzLmV4dHJhUGFyYW1zKTtcbiAgXG4gIG9sTGF5ZXIuZ2V0U291cmNlKCkub24oJ2ltYWdlbG9hZHN0YXJ0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYuZW1pdChcImxvYWRzdGFydFwiKTtcbiAgICAgIH0pO1xuICBvbExheWVyLmdldFNvdXJjZSgpLm9uKCdpbWFnZWxvYWRlbmQnLCBmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZW1pdChcImxvYWRlbmRcIik7XG4gIH0pO1xuICBcbiAgcmV0dXJuIG9sTGF5ZXJcbn07XG5cbnByb3RvLmNoZWNrTGF5ZXJEaXNhYmxlZCA9IGZ1bmN0aW9uKGxheWVyLHJlc29sdXRpb24pIHtcbiAgdmFyIHNjYWxlID0gZ2VvLnJlc1RvU2NhbGUocmVzb2x1dGlvbik7XG4gIHZhciBlbmFibGVkID0gdHJ1ZTtcbiAgaWYgKGxheWVyLnN0YXRlLm1heHJlc29sdXRpb24pe1xuICAgIGVuYWJsZWQgPSBlbmFibGVkICYmIChsYXllci5zdGF0ZS5tYXhyZXNvbHV0aW9uID4gcmVzb2x1dGlvbik7XG4gIH1cbiAgaWYgKGxheWVyLnN0YXRlLm1pbnJlc29sdXRpb24pe1xuICAgIGVuYWJsZWQgPSBlbmFibGVkICYmIChsYXllci5zdGF0ZS5taW5yZXNvbHV0aW9uIDwgcmVzb2x1dGlvbik7XG4gIH1cbiAgaWYgKGxheWVyLnN0YXRlLm1pbnNjYWxlKSB7XG4gICAgZW5hYmxlZCA9IGVuYWJsZWQgJiYgKGxheWVyLnN0YXRlLm1pbnNjYWxlID4gc2NhbGUpO1xuICB9XG4gIGlmIChsYXllci5zdGF0ZS5tYXhzY2FsZSkge1xuICAgIGVuYWJsZWQgPSBlbmFibGVkICYmIChsYXllci5zdGF0ZS5tYXhzY2FsZSA8IHNjYWxlKTtcbiAgfVxuICBsYXllci5zdGF0ZS5kaXNhYmxlZCA9ICFlbmFibGVkO1xufTtcblxucHJvdG8uY2hlY2tMYXllcnNEaXNhYmxlZCA9IGZ1bmN0aW9uKHJlc29sdXRpb24pe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIF8uZm9yRWFjaCh0aGlzLmxheWVycyxmdW5jdGlvbihsYXllcil7XG4gICAgc2VsZi5jaGVja0xheWVyRGlzYWJsZWQobGF5ZXIscmVzb2x1dGlvbik7XG4gIH0pO1xufTtcblxucHJvdG8uX3VwZGF0ZUxheWVycyA9IGZ1bmN0aW9uKG1hcFN0YXRlLGV4dHJhUGFyYW1zKXtcbiAgdGhpcy5jaGVja0xheWVyc0Rpc2FibGVkKG1hcFN0YXRlLnJlc29sdXRpb24pO1xuICB2YXIgdmlzaWJsZUxheWVycyA9IHRoaXMuX2dldFZpc2libGVMYXllcnMobWFwU3RhdGUpO1xuICBpZiAodmlzaWJsZUxheWVycy5sZW5ndGggPiAwKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIExBWUVSUzogXy5qb2luKF8ubWFwKHZpc2libGVMYXllcnMsZnVuY3Rpb24obGF5ZXIpe1xuICAgICAgICByZXR1cm4gbGF5ZXIuZ2V0V01TTGF5ZXJOYW1lKCk7XG4gICAgICB9KSwnLCcpXG4gICAgfTtcbiAgICBpZiAoZXh0cmFQYXJhbXMpIHtcbiAgICAgIHBhcmFtcyA9IF8uYXNzaWduKHBhcmFtcyxleHRyYVBhcmFtcyk7XG4gICAgfVxuICAgIHRoaXMuX29sTGF5ZXIuc2V0VmlzaWJsZSh0cnVlKTtcbiAgICB0aGlzLl9vbExheWVyLmdldFNvdXJjZSgpLnVwZGF0ZVBhcmFtcyhwYXJhbXMpO1xuICB9XG4gIGVsc2Uge1xuICAgIHRoaXMuX29sTGF5ZXIuc2V0VmlzaWJsZShmYWxzZSk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gV01TTGF5ZXI7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xuXG5mdW5jdGlvbiBNYXBzUmVnaXN0cnkoKSB7XG4gIGJhc2UodGhpcyk7XG4gIFxuICB0aGlzLl9tYXBzU2VydmljZXMgPSB7XG4gIH07XG4gIFxuICB0aGlzLmFkZE1hcCA9IGZ1bmN0aW9uKG1hcFNlcnZpY2UpIHtcbiAgICB0aGlzLl9yZWdpc3Rlck1hcFNlcnZpY2UobWFwU2VydmljZSk7XG4gIH07XG4gIFxuICB0aGlzLl9yZWdpc3Rlck1hcFNlcnZpY2UgPSBmdW5jdGlvbihtYXBTZXJ2aWNlKSB7XG4gICAgdmFyIG1hcFNlcnZpY2UgPSB0aGlzLl9tYXBzU2VydmljZXNbbWFwU2VydmljZS5pZF1cbiAgICBpZiAoXy5pc1VuZGVmaW5lZChtYXBTZXJ2aWNlKSkge1xuICAgICAgdGhpcy5fbWFwc1NlcnZpY2VzW21hcFNlcnZpY2UuaWRdID0gbWFwU2VydmljZTtcbiAgICB9XG4gIH07XG59IFxuaW5oZXJpdChNYXBzUmVnaXN0cnksRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBNYXBzUmVnaXN0cnk7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNyZWdpc3RyeScpO1xudmFyIFBsdWdpbnNSZWdpc3RyeSA9IHJlcXVpcmUoJy4vcGx1Z2luc3JlZ2lzdHJ5Jyk7XG5cbnZhciBQbHVnaW4gPSBmdW5jdGlvbigpIHtcblxuICB0aGlzLm5hbWUgPSAnKG5vIG5hbWUpJztcbiAgdGhpcy5jb25maWcgPSBudWxsO1xuICBiYXNlKHRoaXMpO1xuXG59O1xuXG5pbmhlcml0KFBsdWdpbixHM1dPYmplY3QpO1xuXG52YXIgcHJvdG8gPSBQbHVnaW4ucHJvdG90eXBlO1xuXG4vL3JlY3VwZXJhcmUgaWwgc2Vydml6aW8gYXNzb2NpYXRvIGFsIHBsdWdpblxucHJvdG8uZ2V0UGx1Z2luU2VydmljZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5zZXJ2aWNlXG59O1xuXG4vL3NldHRhcmUgdW4gc2Vydml6aW9cbnByb3RvLnNldFBsdWdpblNlcnZpY2UgPSBmdW5jdGlvbihTZXJ2aWNlKSB7XG4gIHRoaXMuc2VydmljZSA9IFNlcnZpY2U7XG59O1xuXG4vL3JlY3VwZXJvIGlsIG5vbWVcbnByb3RvLmdldE5hbWUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMubmFtZTtcbn07XG5cbi8vc2V0dG8gaWwgbm9tZVxucHJvdG8uc2V0TmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdGhpcy5uYW1lID0gbmFtZTtcbn07XG5cbi8vcmVjdXBlcm8gbGEgY29uZmlndXJhemlvbmUgZGVsIHBsdWdpbiBkYWwgcmVnaXN0cm8gZGVpIHBsdWdpbnNcbnByb3RvLmdldFBsdWdpbkNvbmZpZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gUGx1Z2luc1JlZ2lzdHJ5LmdldFBsdWdpbkNvbmZpZyh0aGlzLm5hbWUpO1xufTtcblxuLy92ZXJpZmljYSBsYSBjb21wYXRpYmlsacOgIGNvbiBpbCBwcm9nZXR0byBjb3JyZW50ZVxucHJvdG8uaXNDdXJyZW50UHJvamVjdENvbXBhdGlibGUgPSBmdW5jdGlvbihwcm9qZWN0SWQpIHtcbiAgdmFyIHByb2plY3QgPSBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRQcm9qZWN0KCk7XG4gIHJldHVybiBwcm9qZWN0SWQgPT0gcHJvamVjdC5nZXRHaWQoKTtcbn07XG5cbi8vcmVnaXN0cmF6aW9uZSBwbHVnaW4gc2UgY29tcGF0aWJpbGUgY29uIGlsIHByb2dldHRvIGNvcnJlbnRlXG5wcm90by5yZWdpc3RlclBsdWdpbiA9IGZ1bmN0aW9uKHByb2plY3RJZCkge1xuICBpZiAodGhpcy5pc0N1cnJlbnRQcm9qZWN0Q29tcGF0aWJsZShwcm9qZWN0SWQpKSB7XG4gICAgUGx1Z2luc1JlZ2lzdHJ5LnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8vIHNldHVwIGRlbGwnaW50ZXJmYWNjaWFcbnByb3RvLnNldHVwR3VpID0gZnVuY3Rpb24oKSB7XG4gIC8vYWwgbW9tZW50byBuaWVudGUgbm9uIHNvIHNlIHZlcnLDoCB1c2F0YVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQbHVnaW47XG4iLCJ2YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xudmFyIEFwcGxpY2F0aW9uU2VydmljZSA9IHJlcXVpcmUoJ2NvcmUvYXBwbGljYXRpb25zZXJ2aWNlJyk7XG5cbi8vdmFyIFBsdWdpbiA9IHJlcXVpcmUoJy4vcGx1Z2luJyk7XG4vL3ZhciBUb29sc1NlcnZpY2UgPSByZXF1aXJlKCdjb3JlL3BsdWdpbi90b29sc3NlcnZpY2UnKTtcblxuZnVuY3Rpb24gUGx1Z2luc1JlZ2lzdHJ5KCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5jb25maWcgPSBudWxsO1xuICAvLyB1biBkb21hbmkgcXVlc3RvIHNhcsOgIGRpbmFtaWNvXG4gIHRoaXMuX3BsdWdpbnMgPSB7fTtcblxuICB0aGlzLnNldHRlcnMgPSB7XG4gICAgcmVnaXN0ZXJQbHVnaW46IGZ1bmN0aW9uKHBsdWdpbil7XG4gICAgICBpZiAoIXNlbGYuX3BsdWdpbnNbcGx1Z2luLm5hbWVdKSB7XG4gICAgICAgIHNlbGYuX3BsdWdpbnNbcGx1Z2luLm5hbWVdID0gcGx1Z2luO1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlZ2lzdHJhdG8gcGx1Z2luIFwiK3BsdWdpbi5uYW1lKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgXG4gIGJhc2UodGhpcyk7XG4gIFxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihvcHRpb25zKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5wbHVnaW5zQmFzZVVybCA9IG9wdGlvbnMucGx1c2luZ0Jhc2VVcmxcbiAgICB0aGlzLnBsdWdpbnNDb25maWdzID0gb3B0aW9ucy5wbHVnaW5zQ29uZmlncztcbiAgICBfLmZvckVhY2godGhpcy5wbHVnaW5zQ29uZmlncyxmdW5jdGlvbihwbHVnaW5Db25maWcsbmFtZSl7XG4gICAgICBzZWxmLl9zZXR1cChuYW1lLHBsdWdpbkNvbmZpZyk7XG4gICAgfSlcbiAgfTtcbiAgXG4gIHRoaXMuX3NldHVwID0gZnVuY3Rpb24obmFtZSxwbHVnaW5Db25maWcpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHBsdWdpbkNvbmZpZyl7XG4gICAgICB2YXIgdXJsID0gdGhpcy5wbHVnaW5zQmFzZVVybCsncGx1Z2lucy8nK25hbWUrJy9wbHVnaW4uanMnO1xuICAgICAgJHNjcmlwdCh1cmwpO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuZ2V0UGx1Z2luQ29uZmlnID0gZnVuY3Rpb24ocGx1Z2luTmFtZSkge1xuICAgIHJldHVybiB0aGlzLnBsdWdpbnNDb25maWdzW3BsdWdpbk5hbWVdO1xuICB9O1xuICBcbiAgLyp0aGlzLmFjdGl2YXRlID0gZnVuY3Rpb24ocGx1Z2luKSB7XG4gICAgdmFyIHRvb2xzID0gcGx1Z2luLmdldFRvb2xzKCk7XG4gICAgaWYgKHRvb2xzLmxlbmd0aCkge1xuICAgICAgVG9vbHNTZXJ2aWNlLnJlZ2lzdGVyVG9vbHNQcm92aWRlcihwbHVnaW4pO1xuICAgIH1cbiAgfTsqL1xufTtcblxuaW5oZXJpdChQbHVnaW5zUmVnaXN0cnksRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgUGx1Z2luc1JlZ2lzdHJ5XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzLy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBBcHBsaWNhdGlvblNlcnZpY2UgPSByZXF1aXJlKCdjb3JlL2FwcGxpY2F0aW9uc2VydmljZScpO1xuXG52YXIgUHJvamVjdExheWVyID0gcmVxdWlyZSgnLi9wcm9qZWN0bGF5ZXInKTtcblxuZnVuY3Rpb24gUHJvamVjdChwcm9qZWN0Q29uZmlnKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgXG4gIC8qIHN0cnV0dHVyYSBvZ2dldHRvICdwcm9qZWN0J1xuICB7XG4gICAgaWQsXG4gICAgdHlwZSxcbiAgICBnaWQsXG4gICAgbmFtZSxcbiAgICBjcnMsXG4gICAgZXh0ZW50LFxuICAgIGxheWVyc3RyZWUsXG4gICAgb3ZlcnZpZXdwcm9qZWN0Z2lkXG4gIH1cbiAgKi9cbiAgdGhpcy5zdGF0ZSA9IHByb2plY3RDb25maWc7XG4gIFxuICB0aGlzLl9sYXllcnMgPSB7fTtcbiAgZnVuY3Rpb24gdHJhdmVyc2Uob2JqKXtcbiAgICBfLmZvckluKG9iaiwgZnVuY3Rpb24gKGxheWVyQ29uZmlnLCBrZXkpIHtcbiAgICAgICAgLy92ZXJpZmljYSBjaGUgaWwgdmFsb3JlIGRlbGwnaWQgbm9uIHNpYSBudWxsb1xuICAgICAgICBpZiAoIV8uaXNOaWwobGF5ZXJDb25maWcuaWQpKSB7XG4gICAgICAgICAgICB2YXIgbGF5ZXIgPSBzZWxmLmJ1aWxkUHJvamVjdExheWVyKGxheWVyQ29uZmlnKTtcbiAgICAgICAgICAgIHNlbGYuX2xheWVyc1tsYXllci5nZXRJZCgpXSA9IGxheWVyO1xuICAgICAgICB9XG4gICAgICAgIGlmICghXy5pc05pbChsYXllckNvbmZpZy5ub2RlcykpIHtcbiAgICAgICAgICAgIHRyYXZlcnNlKGxheWVyQ29uZmlnLm5vZGVzKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICB9XG4gIHRyYXZlcnNlKHByb2plY3RDb25maWcubGF5ZXJzdHJlZSk7XG4gIFxuICAvKnZhciBldmVudFR5cGUgPSAncHJvamVjdHNldCc7XG4gIGlmIChkb3N3aXRjaCAmJiBkb3N3aXRjaCA9PT0gdHJ1ZSkge1xuICAgIGV2ZW50VHlwZSA9ICdwcm9qZWN0c3dpdGNoJztcbiAgfVxuICB0aGlzLmVtaXQoZXZlbnRUeXBlKTsqL1xuICBcbiAgdGhpcy5zZXR0ZXJzID0ge1xuICAgIHNldExheWVyc1Zpc2libGU6IGZ1bmN0aW9uKGxheWVyc0lkcyx2aXNpYmxlKXtcbiAgICAgIF8uZm9yRWFjaChsYXllcnNJZHMsZnVuY3Rpb24obGF5ZXJJZCl7XG4gICAgICAgIHNlbGYuZ2V0TGF5ZXJCeUlkKGxheWVySWQpLnN0YXRlLnZpc2libGUgPSB2aXNpYmxlO1xuICAgICAgfSlcbiAgICB9LFxuICAgIHNldEJhc2VMYXllcjogZnVuY3Rpb24oaWQpe1xuICAgICAgXy5mb3JFYWNoKHNlbGYuc3RhdGUuYmFzZUxheWVycyxmdW5jdGlvbihiYXNlTGF5ZXIpe1xuICAgICAgICBiYXNlTGF5ZXIudmlzaWJsZSA9IChiYXNlTGF5ZXIuaWQgPT0gaWQpO1xuICAgICAgfSlcbiAgICB9LFxuICAgIHNldExheWVyU2VsZWN0ZWQ6IGZ1bmN0aW9uKGxheWVySWQsc2VsZWN0ZWQpe1xuICAgICAgXy5mb3JFYWNoKHRoaXMuX2xheWVycyxmdW5jdGlvbihsYXllcil7XG4gICAgICAgIGxheWVyLnN0YXRlLnNlbGVjdGVkID0gKChsYXllcklkID09IGxheWVyLnN0YXRlLmlkKSAmJiBzZWxlY3RlZCkgfHwgZmFsc2U7XG4gICAgICB9KVxuICAgIH1cbiAgfTtcblxuICBiYXNlKHRoaXMpO1xufVxuaW5oZXJpdChQcm9qZWN0LEczV09iamVjdCk7XG5cbnZhciBwcm90byA9IFByb2plY3QucHJvdG90eXBlO1xuXG5wcm90by5idWlsZFByb2plY3RMYXllciA9IGZ1bmN0aW9uKGxheWVyQ29uZmlnKSB7XG4gIHZhciBsYXllciA9IG5ldyBQcm9qZWN0TGF5ZXIobGF5ZXJDb25maWcpO1xuICBsYXllci5zZXRQcm9qZWN0KHRoaXMpO1xuICBcbiAgLy8gYWdnaXVuZ28gcHJvcHJpZXTDoCBub24gb3R0ZW51dGUgZGFsbGEgY29uc2ZpZ3VyYXppb25lXG4gIGxheWVyLnN0YXRlLnNlbGVjdGVkID0gZmFsc2U7XG4gIGxheWVyLnN0YXRlLmRpc2FibGVkID0gZmFsc2U7XG4gIFxuICByZXR1cm4gbGF5ZXI7XG59O1xuXG5wcm90by5nZXRHaWQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuc3RhdGUuZ2lkO1xufTtcblxucHJvdG8uZ2V0T3ZlcnZpZXdQcm9qZWN0R2lkID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnN0YXRlLm92ZXJ2aWV3cHJvamVjdGdpZC5naWQ7XG59O1xuXG5wcm90by5nZXRMYXllcnNEaWN0ID0gZnVuY3Rpb24ob3B0aW9ucyl7XG4gIHZhciBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgZmlsdGVyUXVlcnlhYmxlID0gb3B0aW9ucy5RVUVSWUFCTEU7XG4gIFxuICB2YXIgZmlsdGVyVmlzaWJsZSA9IG9wdGlvbnMuVklTSUJMRTtcbiAgXG4gIHZhciBmaWx0ZXJTZWxlY3RlZCA9IG9wdGlvbnMuU0VMRUNURUQ7XG4gIHZhciBmaWx0ZXJTZWxlY3RlZE9yQWxsID0gb3B0aW9ucy5TRUxFQ1RFRE9SQUxMO1xuICBcbiAgaWYgKGZpbHRlclNlbGVjdGVkT3JBbGwpIHtcbiAgICBmaWx0ZXJTZWxlY3RlZCA9IG51bGw7XG4gIH1cbiAgXG4gIGlmIChfLmlzVW5kZWZpbmVkKGZpbHRlclF1ZXJ5YWJsZSkgJiYgXy5pc1VuZGVmaW5lZChmaWx0ZXJWaXNpYmxlKSAmJiBfLmlzVW5kZWZpbmVkKGZpbHRlclNlbGVjdGVkKSAmJiBfLmlzVW5kZWZpbmVkKGZpbHRlclNlbGVjdGVkT3JBbGwpKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xheWVycztcbiAgfVxuICBcbiAgdmFyIGxheWVycyA9IHRoaXMuX2xheWVycztcbiAgXG4gIGlmIChmaWx0ZXJRdWVyeWFibGUpIHtcbiAgICBsYXllcnMgPSBfLmZpbHRlcihsYXllcnMsZnVuY3Rpb24obGF5ZXIpe1xuICAgICAgcmV0dXJuIGZpbHRlclF1ZXJ5YWJsZSAmJiBsYXllci5pc1F1ZXJ5YWJsZSgpO1xuICAgIH0pO1xuICB9XG4gIFxuICBpZiAoZmlsdGVyVmlzaWJsZSkge1xuICAgIGxheWVycyA9IF8uZmlsdGVyKGxheWVycyxmdW5jdGlvbihsYXllcil7XG4gICAgICByZXR1cm4gZmlsdGVyVmlzaWJsZSAmJiBsYXllci5pc1Zpc2libGUoKTtcbiAgICB9KTtcbiAgfVxuICBcbiAgaWYgKGZpbHRlclNlbGVjdGVkKSB7XG4gICAgbGF5ZXJzID0gXy5maWx0ZXIobGF5ZXJzLGZ1bmN0aW9uKGxheWVyKXtcbiAgICAgIHJldHVybiBmaWx0ZXJTZWxlY3RlZCAmJiBsYXllci5pc1NlbGVjdGVkKCk7XG4gICAgfSk7XG4gIH1cbiAgXG4gIGlmIChmaWx0ZXJTZWxlY3RlZE9yQWxsKSB7XG4gICAgdmFyIF9sYXllcnMgPSBsYXllcnM7XG4gICAgbGF5ZXJzID0gXy5maWx0ZXIobGF5ZXJzLGZ1bmN0aW9uKGxheWVyKXtcbiAgICAgIHJldHVybiBsYXllci5pc1NlbGVjdGVkKCk7XG4gICAgfSk7XG4gICAgbGF5ZXJzID0gbGF5ZXJzLmxlbmd0aCA/IGxheWVycyA6IF9sYXllcnM7XG4gIH1cbiAgXG4gIHJldHVybiBsYXllcnM7XG59O1xuXG4vLyByaXRvcm5hIGwnYXJyYXkgZGVpIGxheWVycyAoY29uIG9wemlvbmkgZGkgcmljZXJjYSlcbnByb3RvLmdldExheWVycyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgdmFyIGxheWVycyA9IHRoaXMuZ2V0TGF5ZXJzRGljdChvcHRpb25zKTtcbiAgcmV0dXJuIF8udmFsdWVzKGxheWVycyk7XG59XG5cbnByb3RvLmdldExheWVyQnlJZCA9IGZ1bmN0aW9uKGxheWVySWQpIHtcbiAgcmV0dXJuIHRoaXMuZ2V0TGF5ZXJzRGljdCgpW2xheWVySWRdO1xufTtcblxucHJvdG8uZ2V0TGF5ZXJCeU5hbWUgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciBsYXllciA9IG51bGw7XG4gIF8uZm9yRWFjaCh0aGlzLmdldExheWVycygpLGZ1bmN0aW9uKGxheWVyKXtcbiAgICBpZiAobGF5ZXIuZ2V0TmFtZSgpID09IG5hbWUpe1xuICAgICAgbGF5ZXIgPSBfbGF5ZXI7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGxheWVyO1xufTtcblxucHJvdG8uZ2V0TGF5ZXJBdHRyaWJ1dGVzID0gZnVuY3Rpb24obGF5ZXJJZCl7XG4gIHJldHVybiB0aGlzLmdldExheWVyQnlJZChsYXllcklkKS5nZXRBdHRyaWJ1dGVzKCk7XG59O1xuXG5wcm90by5nZXRMYXllckF0dHJpYnV0ZUxhYmVsID0gZnVuY3Rpb24obGF5ZXJJZCxuYW1lKXtcbiAgcmV0dXJuIHRoaXMuZ2V0TGF5ZXJCeUlkKGxheWVySWQpLmdldEF0dHJpYnV0ZUxhYmVsKG5hbWUpO1xufTtcblxucHJvdG8udG9nZ2xlTGF5ZXIgPSBmdW5jdGlvbihsYXllcklkLHZpc2libGUpe1xuICB2YXIgbGF5ZXIgPSB0aGlzLmdldExheWVyQnlJZChsYXllcklkKTtcbiAgdmFyIHZpc2libGUgPSB2aXNpYmxlIHx8ICFsYXllci5zdGF0ZS52aXNpYmxlO1xuICB0aGlzLnNldExheWVyc1Zpc2libGUoW2xheWVySWRdLHZpc2libGUpO1xufTtcblxucHJvdG8udG9nZ2xlTGF5ZXJzID0gZnVuY3Rpb24obGF5ZXJzSWRzLHZpc2libGUpe1xuICB0aGlzLnNldExheWVyc1Zpc2libGUobGF5ZXJzSWRzLHZpc2libGUpO1xufTtcblxucHJvdG8uc2VsZWN0TGF5ZXIgPSBmdW5jdGlvbihsYXllcklkKXtcbiAgdGhpcy5zZXRMYXllclNlbGVjdGVkKGxheWVySWQsdHJ1ZSk7XG59O1xuXG5wcm90by51bnNlbGVjdExheWVyID0gZnVuY3Rpb24obGF5ZXJJZCkge1xuICB0aGlzLnNldExheWVyU2VsZWN0ZWQobGF5ZXJJZCxmYWxzZSk7XG59O1xuXG5wcm90by5nZXRDcnMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuc3RhdGUuY3JzO1xufVxuXG5wcm90by5nZXRJbmZvRm9ybWF0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAnYXBwbGljYXRpb24vdm5kLm9nYy5nbWwnO1xufTtcblxucHJvdG8uZ2V0V21zVXJsID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuc3RhdGUuV01TVXJsO1xufTtcblxucHJvdG8uZ2V0TGVnZW5kVXJsID0gZnVuY3Rpb24obGF5ZXIpe1xuICB2YXIgdXJsID0gdGhpcy5nZXRXbXNVcmwoKTtcbiAgc2VwID0gKHVybC5pbmRleE9mKCc/JykgPiAtMSkgPyAnJicgOiAnPyc7XG4gIHJldHVybiB0aGlzLmdldFdtc1VybCgpK3NlcCsnU0VSVklDRT1XTVMmVkVSU0lPTj0xLjMuMCZSRVFVRVNUPUdldExlZ2VuZEdyYXBoaWMmU0xEX1ZFUlNJT049MS4xLjAmRk9STUFUPWltYWdlL3BuZyZUUkFOU1BBUkVOVD10cnVlJklURU1GT05UQ09MT1I9d2hpdGUmTEFZRVJUSVRMRT1GYWxzZSZJVEVNRk9OVFNJWkU9MTAmTEFZRVI9JytsYXllci5uYW1lO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcm9qZWN0O1xuIiwidmFyIEdlb21ldHJ5VHlwZXMgPSByZXF1aXJlKCdjb3JlL2dlb21ldHJ5L2dlb21ldHJ5JykuR2VvbWV0cnlUeXBlcztcblxudmFyIENBUEFCSUxJVElFUyA9IHtcbiAgUVVFUlk6IDEsXG4gIEVESVQ6IDJcbn07XG5cbnZhciBFRElUT1BTID0ge1xuICBJTlNFUlQ6IDEsXG4gIFVQREFURTogMixcbiAgREVMRVRFOiA0XG59O1xuXG5mdW5jdGlvbiBQcm9qZWN0TGF5ZXIoc3RhdGUpIHtcbiAgLyp0aGlzLnN0YXRlID0ge1xuICAgIGZpZWxkczogb3B0aW9ucy5maWVsZHMsXG4gICAgYmJveDogb3B0aW9ucy5iYm94LFxuICAgIGNhcGFiaWxpdGllczogb3B0aW9ucy5jYXBhYmlsaXRpZXMsXG4gICAgY3JzOiBvcHRpb25zLmNycyxcbiAgICBkaXNhYmxlZDogb3B0aW9ucy5kaXNhYmxlZCxcbiAgICBlZGl0b3BzOiBvcHRpb25zLmVkaXRvcHMsXG4gICAgZ2VvbWV0cnl0eXBlOiBvcHRpb25zLmdlb21ldHJ5dHlwZSxcbiAgICBpZDogb3B0aW9ucy5pZCxcbiAgICBpbmZvZm9ybWF0OiBvcHRpb25zLmluZm9mb3JtYXQsXG4gICAgaW5mb3VybDogb3B0aW9ucy5pbmZvdXJsLFxuICAgIG1heHNjYWxlOiBvcHRpb25zLm1heHNjYWxlLFxuICAgIG1pbnNjYWxlOiBvcHRpb25zLm1pbnNjYWxlLFxuICAgIG11bHRpbGF5ZXI6IG9wdGlvbnMubXVsdGlsYXllcixcbiAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgb3JpZ25hbWU6IG9wdGlvbnMub3JpZ25hbWUsXG4gICAgcmVsYXRpb25zOiBvcHRpb25zLnJlbGF0aW9ucyxcbiAgICBzY2FsZWJhc2VkdmlzaWJpbGl0eTogb3B0aW9ucy5zY2FsZWJhc2VkdmlzaWJpbGl0eSxcbiAgICBzZWxlY3RlZDogb3B0aW9ucy5zZWxlY3RlZCxcbiAgICBzZXJ2ZXJ0eXBlOiBvcHRpb25zLnNlcnZlcnR5cGUsXG4gICAgc291cmNlOiBvcHRpb25zLnNvdXJjZSxcbiAgICB0aXRsZTogb3B0aW9ucy50aXRsZSxcbiAgICB2aXNpYmxlOiBvcHRpb25zLnZpc2libGUsXG4gICAgc2VsZWN0ZWQ6IG9wdGlvbnMuc2VsZWN0ZWQgfCBmYWxzZSxcbiAgICBkaXNhYmxlZDogb3B0aW9ucy5kaXNhYmxlZCB8IGZhbHNlXG4gIH0qL1xuICBcbiAgLy8gbG8gc3RhdG8gw6ggc2luY3Jvbml6emF0byBjb24gcXVlbGxvIGRlbCBsYXllcnN0cmVlXG4gIHRoaXMuc3RhdGUgPSBzdGF0ZTtcbiAgXG4gIHRoaXMuX3Byb2plY3QgPSBudWxsO1xufTtcblxudmFyIHByb3RvID0gUHJvamVjdExheWVyLnByb3RvdHlwZTtcblxucHJvdG8uZ2V0UHJvamVjdCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5fcHJvamVjdDtcbn07XG5cbnByb3RvLnNldFByb2plY3QgPSBmdW5jdGlvbihwcm9qZWN0KSB7XG4gIHRoaXMuX3Byb2plY3QgPSBwcm9qZWN0XG59O1xuXG5wcm90by5nZXRJZCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5zdGF0ZS5pZDtcbn07XG5cbnByb3RvLmdldE5hbWUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuc3RhdGUubmFtZTtcbn07XG5cbnByb3RvLmdldE9yaWdOYW1lID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnN0YXRlLm9yaWduYW1lO1xufTtcblxucHJvdG8uZ2V0R2VvbWV0cnlUeXBlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnN0YXRlLmdlb21ldHJ5dHlwZTtcbn07XG5cbnByb3RvLmdldEF0dHJpYnV0ZXMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuc3RhdGUuZmllbGRzO1xufTtcblxucHJvdG8uZ2V0QXR0cmlidXRlTGFiZWwgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciBsYWJlbDtcbiAgXy5mb3JFYWNoKHRoaXMuZ2V0QXR0cmlidXRlcygpLGZ1bmN0aW9uKGZpZWxkKXtcbiAgICBpZiAoZmllbGQubmFtZSA9PSBuYW1lKXtcbiAgICAgIGxhYmVsID0gZmllbGQubGFiZWw7XG4gICAgfVxuICB9KVxuICByZXR1cm4gbGFiZWw7XG59O1xuXG5wcm90by5pc1NlbGVjdGVkID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnN0YXRlLnNlbGVjdGVkO1xufTtcblxucHJvdG8uaXNEaXNhYmxlZCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5zdGF0ZS5kaXNhYmxlZDtcbn07XG5cbnByb3RvLmlzUXVlcnlhYmxlID0gZnVuY3Rpb24oKXtcbiAgdmFyIHF1ZXJ5RW5hYmxlZCA9IGZhbHNlO1xuICB2YXIgcXVlcnlhYmxlRm9yQ2FiYWJpbGl0aWVzID0gKHRoaXMuc3RhdGUuY2FwYWJpbGl0aWVzICYmICh0aGlzLnN0YXRlLmNhcGFiaWxpdGllcyAmJiBDQVBBQklMSVRJRVMuUVVFUlkpKSA/IHRydWUgOiBmYWxzZTtcbiAgaWYgKHF1ZXJ5YWJsZUZvckNhYmFiaWxpdGllcykge1xuICAgIC8vIMOoIGludGVycm9nYWJpbGUgc2UgdmlzaWJpbGUgZSBub24gZGlzYWJpbGl0YXRvIChwZXIgc2NhbGEpIG9wcHVyZSBzZSBpbnRlcnJvZ2FiaWxlIGNvbXVucXVlIChmb3J6YXRvIGRhbGxhIHByb3ByaWV0w6AgaW5mb3doZW5ub3R2aXNpYmxlKVxuICAgIHF1ZXJ5RW5hYmxlZCA9ICh0aGlzLnN0YXRlLnZpc2libGUgJiYgIXRoaXMuc3RhdGUuZGlzYWJsZWQpO1xuICAgIGlmICghXy5pc1VuZGVmaW5lZCh0aGlzLnN0YXRlLmluZm93aGVubm90dmlzaWJsZSkgJiYgKHRoaXMuc3RhdGUuaW5mb3doZW5ub3R2aXNpYmxlID09PSB0cnVlKSkge1xuICAgICAgcXVlcnlFbmFibGVkID0gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHF1ZXJ5RW5hYmxlZDtcbn07XG5cbnByb3RvLmlzVmlzaWJsZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5zdGF0ZS52aXNpYmxlO1xufVxuXG5wcm90by5nZXRRdWVyeUxheWVyTmFtZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcXVlcnlMYXllck5hbWU7XG4gIGlmICh0aGlzLnN0YXRlLmluZm9sYXllciAmJiB0aGlzLnN0YXRlLmluZm9sYXllciAhPSAnJykge1xuICAgIHF1ZXJ5TGF5ZXJOYW1lID0gdGhpcy5zdGF0ZS5pbmZvbGF5ZXI7XG4gIH1cbiAgZWxzZSB7XG4gICAgcXVlcnlMYXllck5hbWUgPSB0aGlzLnN0YXRlLm5hbWU7XG4gIH1cbiAgcmV0dXJuIHF1ZXJ5TGF5ZXJOYW1lO1xufTtcblxucHJvdG8uZ2V0U2VydmVyVHlwZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5zdGF0ZS5zZXJ2ZXJ0eXBlICYmIHRoaXMuc3RhdGUuc2VydmVydHlwZSAhPSAnJykge1xuICAgIHJldHVybiB0aGlzLnN0YXRlLnNlcnZlcnR5cGU7XG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIFByb2plY3RMYXllci5TZXJ2ZXJUeXBlcy5RR0lTO1xuICB9XG59O1xuXG5wcm90by5nZXRDcnMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZ2V0UHJvamVjdCgpLmdldENycygpO1xufVxuXG5wcm90by5pc0V4dGVybmFsV01TID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAodGhpcy5zdGF0ZS5zb3VyY2UgJiYgdGhpcy5zdGF0ZS5zb3VyY2UudXJsKTtcbn07XG5cbnByb3RvLmdldFdNU0xheWVyTmFtZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbGF5ZXJOYW1lID0gdGhpcy5zdGF0ZS5uYW1lO1xuICBpZiAodGhpcy5zdGF0ZS5zb3VyY2UgJiYgdGhpcy5zdGF0ZS5zb3VyY2UubGF5ZXJzKXtcbiAgICBsYXllck5hbWUgPSB0aGlzLnN0YXRlLnNvdXJjZS5sYXllcnM7XG4gIH07XG4gIHJldHVybiBsYXllck5hbWU7XG59O1xuXG5wcm90by5nZXRRdWVyeVVybCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5zdGF0ZS5pbmZvdXJsICYmIHRoaXMuc3RhdGUuaW5mb3VybCAhPSAnJykge1xuICAgIHJldHVybiB0aGlzLnN0YXRlLmluZm91cmw7XG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0UHJvamVjdCgpLmdldFdtc1VybCgpO1xuICB9XG59O1xuXG5wcm90by5zZXRRdWVyeVVybCA9IGZ1bmN0aW9uKHF1ZXJ5VXJsKSB7XG4gIHRoaXMuc3RhdGUuaW5mb3J1cmwgPSBxdWVyeVVybDtcbn07XG5cbnByb3RvLmdldEluZm9Gb3JtYXQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuc3RhdGUuaW5mb2Zvcm1hdCAmJiB0aGlzLnN0YXRlLmluZm9mb3JtYXQgIT0gJycpIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZS5pbmZvZm9ybWF0O1xuICB9XG4gIGVsc2Uge1xuICAgIHJldHVybiB0aGlzLmdldFByb2plY3QoKS5nZXRJbmZvRm9ybWF0KCk7XG4gIH1cbn07XG5cbnByb3RvLnNldEluZm9Gb3JtYXQgPSBmdW5jdGlvbihpbmZvRm9ybWF0KSB7XG4gIHRoaXMuc3RhdGUuaW5mb2Zvcm1hdCA9IGluZm9Gb3JtYXQ7XG59O1xuXG5wcm90by5nZXRXbXNVcmwgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHVybDtcbiAgaWYgKHRoaXMuc3RhdGUuc291cmNlICYmIHRoaXMuc3RhdGUuc291cmNlLnR5cGUgPT0gJ3dtcycgJiYgdGhpcy5zdGF0ZS5zb3VyY2UudXJsKXtcbiAgICB1cmwgPSB0aGlzLnN0YXRlLnNvdXJjZS51cmxcbiAgfVxuICBlbHNlIHtcbiAgICB1cmwgPSB0aGlzLmdldFByb2plY3QoKS5nZXRXbXNVcmwoKTtcbiAgfVxuICByZXR1cm4gdXJsO1xufTtcblxucHJvdG8uZ2V0TGVnZW5kVXJsID0gZnVuY3Rpb24oKSB7XG4gIHZhciB1cmwgPSB0aGlzLmdldFdtc1VybCgpO1xuICBzZXAgPSAodXJsLmluZGV4T2YoJz8nKSA+IC0xKSA/ICcmJyA6ICc/JztcbiAgcmV0dXJuIHRoaXMuZ2V0V21zVXJsKCkrc2VwKydTRVJWSUNFPVdNUyZWRVJTSU9OPTEuMy4wJlJFUVVFU1Q9R2V0TGVnZW5kR3JhcGhpYyZTTERfVkVSU0lPTj0xLjEuMCZGT1JNQVQ9aW1hZ2UvcG5nJlRSQU5TUEFSRU5UPXRydWUmSVRFTUZPTlRDT0xPUj13aGl0ZSZMQVlFUlRJVExFPUZhbHNlJklURU1GT05UU0laRT0xMCZMQVlFUj0nK3RoaXMuZ2V0V01TTGF5ZXJOYW1lKCk7XG59O1xuXG5Qcm9qZWN0TGF5ZXIuU2VydmVyVHlwZXMgPSB7XG4gIE9HQzogXCJPR0NcIixcbiAgUUdJUzogXCJRR0lTXCIsXG4gIE1hcHNlcnZlcjogXCJNYXBzZXJ2ZXJcIixcbiAgR2Vvc2VydmVyOiBcIkdlb3NlcnZlclwiLFxuICBBcmNHSVM6IFwiQXJjR0lTXCJcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJvamVjdExheWVyO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgcmVzb2x2ZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZXNvbHZlO1xudmFyIHJlamVjdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZWplY3Q7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBQcm9qZWN0ID0gcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3QnKTtcblxuXG4vKiBzZXJ2aWNlXG5GdW56aW9uZSBjb3N0cnV0dG9yZSBjb250ZW50ZW50ZSB0cmUgcHJvcHJpZXRhJzpcbiAgICBzZXR1cDogbWV0b2RvIGRpIGluaXppYWxpenphemlvbmVcbiAgICBnZXRMYXllcnNTdGF0ZTogcml0b3JuYSBsJ29nZ2V0dG8gTGF5ZXJzU3RhdGVcbiAgICBnZXRMYXllcnNUcmVlOiByaXRvcm5hIGwnYXJyYXkgbGF5ZXJzVHJlZSBkYWxsJ29nZ2V0dG8gTGF5ZXJzU3RhdGVcbiovXG5cbi8vIFB1YmxpYyBpbnRlcmZhY2VcbmZ1bmN0aW9uIFByb2plY3RzUmVnaXN0cnkoKSB7XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmNvbmZpZyA9IG51bGw7XG4gIHRoaXMuaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgLy90aXBvIGRpIHByb2dldHRvXG4gIHRoaXMucHJvamVjdFR5cGUgPSBudWxsO1xuICBcbiAgdGhpcy5zZXR0ZXJzID0ge1xuICAgIHNldEN1cnJlbnRQcm9qZWN0OiBmdW5jdGlvbihwcm9qZWN0KXtcbiAgICAgIHNlbGYuc3RhdGUuY3VycmVudFByb2plY3QgPSBwcm9qZWN0O1xuICAgIH1cbiAgfTtcbiAgLy9zdGF0byBkZWwgcmVnaXN0cm8gcHJvZ2V0dGlcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICBiYXNlTGF5ZXJzOiB7fSxcbiAgICBtaW5TY2FsZTogbnVsbCxcbiAgICBtYXhzY2FsZTogbnVsbCxcbiAgICBjdXJyZW50UHJvamVjdDogbnVsbFxuICB9O1xuICBcbiAgLy8gdHV0dGUgbGUgY29uZmlndXJhemlvbmkgZGkgYmFzZSBkZWkgcHJvZ2V0dGksIG1hIGRpIGN1aSBub24gw6ggZGV0dG8gY2hlXG4gIC8vIHNpYSBhbmNvcmEgZGlzcG9uaWJpbGUgbCdpc3RhbnphIChsYXp5IGxvYWRpbmcpXG4gIHRoaXMuX3BlbmRpbmdQcm9qZWN0cyA9IFtdO1xuICB0aGlzLl9wcm9qZWN0cyA9IHt9O1xuICBcbiAgYmFzZSh0aGlzKTtcbn1cbmluaGVyaXQoUHJvamVjdHNSZWdpc3RyeSwgRzNXT2JqZWN0KTtcblxudmFyIHByb3RvID0gUHJvamVjdHNSZWdpc3RyeS5wcm90b3R5cGU7XG5cbnByb3RvLmluaXQgPSBmdW5jdGlvbihjb25maWcpIHtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIC8vdmVyaWZpY28gc2Ugw6ggZ2nDoCBzdGF0byBpbml6aWxpenphdG9cbiAgaWYgKCF0aGlzLmluaXRpYWxpemVkKXtcbiAgICB0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAvL3NhbHZhIGxhIGNvbmZpZ3VyYXppb25lXG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgLy9zZXR0YSBsbyBzdGF0ZVxuICAgIHRoaXMuc2V0dXBTdGF0ZSgpO1xuICAgIHJldHVybiB0aGlzLmdldFByb2plY3QoY29uZmlnLmluaXRwcm9qZWN0KVxuICAgIC50aGVuKGZ1bmN0aW9uKHByb2plY3QpIHtcbiAgICAgIHNlbGYuc2V0Q3VycmVudFByb2plY3QocHJvamVjdCk7XG4gICAgICAvL2FnZ2l1bnRvIHRpcG8gcHJvZ2V0dG9cbiAgICAgIHNlbGYuc2V0UHJvamVjdFR5cGUocHJvamVjdC5zdGF0ZS50eXBlKTtcbiAgICB9KTtcbiAgfVxufTtcblxucHJvdG8uc2V0UHJvamVjdFR5cGUgPSBmdW5jdGlvbihwcm9qZWN0VHlwZSkge1xuICAgdGhpcy5wcm9qZWN0VHlwZSA9IHByb2plY3RUeXBlO1xufTtcblxucHJvdG8uc2V0dXBTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgXG4gIHNlbGYuc3RhdGUuYmFzZUxheWVycyA9IHNlbGYuY29uZmlnLmJhc2VsYXllcnM7XG4gIHNlbGYuc3RhdGUubWluU2NhbGUgPSBzZWxmLmNvbmZpZy5taW5zY2FsZTtcbiAgc2VsZi5zdGF0ZS5tYXhTY2FsZSA9IHNlbGYuY29uZmlnLm1heHNjYWxlO1xuICBzZWxmLnN0YXRlLmNycyA9IHNlbGYuY29uZmlnLmNycztcbiAgc2VsZi5zdGF0ZS5wcm9qNCA9IHNlbGYuY29uZmlnLnByb2o0O1xuXG4gIC8vIHNldHRvICBxdWFsZSBwcm9nZXR0byBkZXZlIGVzc2VyZSBpbXBvc3RhdG8gY29tZSBvdmVydmlld1xuICAvL3F1ZXN0byDDqCBzZXR0YXRvIGRhIGRqYW5nby1hZG1pblxuICB2YXIgb3ZlclZpZXdQcm9qZWN0ID0gKHNlbGYuY29uZmlnLm92ZXJ2aWV3cHJvamVjdCAmJiBzZWxmLmNvbmZpZy5vdmVydmlld3Byb2plY3QuZ2lkKSA/IHNlbGYuY29uZmlnLm92ZXJ2aWV3cHJvamVjdCA6IG51bGw7XG4gIC8vcGVyIG9nbmkgcHJvZ2V0dG8gY2ljbG8gZSBzZXR0byB0dXR0aSBnbGkgYXR0cmlidXRpIGNvbXVuaVxuICAvLyBjb21lIGkgYmFzZSBsYXllcnMgZXRjIC4uXG4gIHNlbGYuY29uZmlnLnByb2plY3RzLmZvckVhY2goZnVuY3Rpb24ocHJvamVjdCl7XG4gICAgcHJvamVjdC5iYXNlbGF5ZXJzID0gc2VsZi5jb25maWcuYmFzZWxheWVycztcbiAgICBwcm9qZWN0Lm1pbnNjYWxlID0gc2VsZi5jb25maWcubWluc2NhbGU7XG4gICAgcHJvamVjdC5tYXhzY2FsZSA9IHNlbGYuY29uZmlnLm1heHNjYWxlO1xuICAgIHByb2plY3QuY3JzID0gc2VsZi5jb25maWcuY3JzO1xuICAgIHByb2plY3QucHJvajQgPSBzZWxmLmNvbmZpZy5wcm9qNDtcbiAgICBwcm9qZWN0Lm92ZXJ2aWV3cHJvamVjdGdpZCA9IG92ZXJWaWV3UHJvamVjdDtcbiAgICAvL2FnZ2l1bmdvIHR1dHRpIGkgcHJvZ2V0dGkgYWkgcGVuZGluZyBwcm9qZWN0XG4gICAgc2VsZi5fcGVuZGluZ1Byb2plY3RzLnB1c2gocHJvamVjdCk7XG4gIH0pO1xufTtcblxucHJvdG8uZ2V0UHJvamVjdFR5cGUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMucHJvamVjdFR5cGU7XG59O1xuXG5wcm90by5nZXRQZW5kaW5nUHJvamVjdHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQcm9qZWN0cztcbn07XG5cbnByb3RvLmdldEN1cnJlbnRQcm9qZWN0ID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuc3RhdGUuY3VycmVudFByb2plY3Q7XG59O1xuXG4vLyBvdHRlbmdvIGlsIHByb2dldHRvIGRhbCBzdW8gZ2lkO1xuLy8gcml0b3JuYSB1bmEgcHJvbWlzZSBuZWwgY2FzbyBub24gZm9zc2Ugc3RhdG8gYW5jb3JhIHNjYXJpY2F0b1xuLy8gaWwgY29uZmlnIGNvbXBsZXRvIChlIHF1aW5kaSBub24gc2lhIGFuY29yYSBpc3RhbnppYXRvIFByb2plY3QpXG5wcm90by5nZXRQcm9qZWN0ID0gZnVuY3Rpb24ocHJvamVjdEdpZCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBkID0gJC5EZWZlcnJlZCgpO1xuICB2YXIgcGVuZGluZ1Byb2plY3QgPSBmYWxzZTtcbiAgdmFyIHByb2plY3QgPSBudWxsO1xuICAvLyBzY29ycm8gYXRyYXZlcnNvIGkgcGVuZGluZyBwcm9qZWN0IGNoZSBjb250ZW5nb25vIG9nZ2V0dGlcbiAgLy8gZGkgY29uZmlndXJhemlvbmUgZGVpIHByb2dldHRpIGRlbCBncnVwcG9cbiAgdGhpcy5fcGVuZGluZ1Byb2plY3RzLmZvckVhY2goZnVuY3Rpb24oX3BlbmRpbmdQcm9qZWN0KSB7XG4gICAgaWYgKF9wZW5kaW5nUHJvamVjdC5naWQgPT0gcHJvamVjdEdpZCkge1xuICAgICAgcGVuZGluZ1Byb2plY3QgPSBfcGVuZGluZ1Byb2plY3Q7XG4gICAgICBwcm9qZWN0ID0gc2VsZi5fcHJvamVjdHNbcHJvamVjdEdpZF07XG4gICAgfVxuICB9KTtcbiAgaWYgKCFwZW5kaW5nUHJvamVjdCkge1xuICAgIHJldHVybiByZWplY3QoXCJQcm9qZWN0IGRvZXNuJ3QgZXhpc3RcIik7XG4gIH1cblxuICBpZiAocHJvamVjdCkge1xuICAgIHJldHVybiBkLnJlc29sdmUocHJvamVjdCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuX2dldFByb2plY3RGdWxsQ29uZmlnKHBlbmRpbmdQcm9qZWN0KVxuICAgIC50aGVuKGZ1bmN0aW9uKHByb2plY3RGdWxsQ29uZmlnKXtcbiAgICAgIHZhciBwcm9qZWN0Q29uZmlnID0gXy5tZXJnZShwZW5kaW5nUHJvamVjdCxwcm9qZWN0RnVsbENvbmZpZyk7XG4gICAgICBzZWxmLl9idWlsZFByb2plY3RUcmVlKHByb2plY3RDb25maWcpO1xuICAgICAgcHJvamVjdENvbmZpZy5XTVNVcmwgPSBzZWxmLmNvbmZpZy5nZXRXbXNVcmwocHJvamVjdENvbmZpZyk7XG4gICAgICB2YXIgcHJvamVjdCA9IG5ldyBQcm9qZWN0KHByb2plY3RDb25maWcpO1xuICAgICAgc2VsZi5fcHJvamVjdHNbcHJvamVjdENvbmZpZy5naWRdID0gcHJvamVjdDtcbiAgICAgIHJldHVybiBkLnJlc29sdmUocHJvamVjdCk7XG4gICAgfSk7XG4gIH1cbiAgXG4gIHJldHVybiBkLnByb21pc2UoKTtcbn07XG4gIFxuLy9yaXRvcm5hIHVuYSBwcm9taXNlc1xucHJvdG8uX2dldFByb2plY3RGdWxsQ29uZmlnID0gZnVuY3Rpb24ocHJvamVjdEJhc2VDb25maWcpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gIHZhciB1cmwgPSB0aGlzLmNvbmZpZy5nZXRQcm9qZWN0Q29uZmlnVXJsKHByb2plY3RCYXNlQ29uZmlnKTtcbiAgJC5nZXQodXJsKS5kb25lKGZ1bmN0aW9uKHByb2plY3RGdWxsQ29uZmlnKSB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKHByb2plY3RGdWxsQ29uZmlnKTtcbiAgfSk7XG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG59O1xuXG5wcm90by5fYnVpbGRQcm9qZWN0VHJlZSA9IGZ1bmN0aW9uKHByb2plY3Qpe1xuICB2YXIgbGF5ZXJzID0gXy5rZXlCeShwcm9qZWN0LmxheWVycywnaWQnKTtcbiAgdmFyIGxheWVyc1RyZWUgPSBfLmNsb25lRGVlcChwcm9qZWN0LmxheWVyc3RyZWUpO1xuICBcbiAgZnVuY3Rpb24gdHJhdmVyc2Uob2JqKXtcbiAgICBfLmZvckluKG9iaiwgZnVuY3Rpb24gKGxheWVyLCBrZXkpIHtcbiAgICAgIC8vdmVyaWZpY2EgY2hlIGlsIG5vZG8gc2lhIHVuIGxheWVyIGUgbm9uIHVuIGZvbGRlclxuICAgICAgaWYgKCFfLmlzTmlsKGxheWVyLmlkKSkge1xuICAgICAgICAgIHZhciBmdWxsbGF5ZXIgPSBfLm1lcmdlKGxheWVyLGxheWVyc1tsYXllci5pZF0pO1xuICAgICAgICAgIG9ialtwYXJzZUludChrZXkpXSA9IGZ1bGxsYXllcjtcbiAgICAgIH1cbiAgICAgIGlmICghXy5pc05pbChsYXllci5ub2Rlcykpe1xuICAgICAgICAvLyBhZ2dpdW5nbyBwcm9wcmlldMOgIHRpdGxlIHBlciBsJ2FsYmVyb1xuICAgICAgICBsYXllci50aXRsZSA9IGxheWVyLm5hbWU7XG4gICAgICAgIHRyYXZlcnNlKGxheWVyLm5vZGVzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICB0cmF2ZXJzZShsYXllcnNUcmVlKTtcbiAgcHJvamVjdC5sYXllcnN0cmVlID0gbGF5ZXJzVHJlZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFByb2plY3RzUmVnaXN0cnkoKTtcbiIsInZhciBQcm9qZWN0VHlwZXMgPSB7XG4gIFFESkFOR086ICdxZGphbmdvJyxcbiAgT0dSOiAnb2dyJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcm9qZWN0VHlwZXM7IiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciByZXNvbHZlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlc29sdmU7XG52YXIgUHJvamVjdHNSZWdpc3RyeSA9IHJlcXVpcmUoJ2NvcmUvcHJvamVjdC9wcm9qZWN0c3JlZ2lzdHJ5Jyk7XG5cbi8vIEZJTFRSSVxudmFyIEZpbHRlcnMgPSB7XG4gIGVxOiAnPScsXG4gIGd0OiAnPicsXG4gIGd0ZTogJz49JyxcbiAgbHQ6ICc8JyxcbiAgbHRlOiAnPTwnLFxuICBMSUtFOiAnTElLRScsXG4gIElMSUtFOiAnSUxJS0UnLFxuICBBTkQ6ICdBTkQnLFxuICBPUjogJ09SJyxcbiAgTk9UOiAnIT0nXG59O1xuXG5mdW5jdGlvbiBRdWVyeVFHSVNXTVNQcm92aWRlcigpIHtcblxuICBzZWxmID0gdGhpcztcbiAgLy9mdW56aW9uZSBjaGUgZmEgbGEgcmljaGllc3RhIHZlcmEgZSBwcm9wcmlhIGFsIHNlcnZlciBxZ2lzXG4gIHRoaXMuc3VibWl0R2V0RmVhdHVyZUluZm8gPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdmFyIHVybCA9IG9wdGlvbnMudXJsIHx8ICcnO1xuICAgIHZhciBxdWVyeWxheWVybmFtZSA9IG9wdGlvbnMucXVlcnlsYXllcm5hbWUgfHwgbnVsbDtcbiAgICB2YXIgZmlsdGVyID0gb3B0aW9ucy5maWx0ZXIgfHwgbnVsbDtcbiAgICB2YXIgYmJveCA9IG9wdGlvbnMuYmJveCB8fCBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRQcm9qZWN0KCkuc3RhdGUuZXh0ZW50LmpvaW4oJywnKTtcbiAgICB2YXIgc2ltcGxlV21zU2VhcmNoTWF4UmVzdWx0cyA9IG51bGw7XG4gICAgdmFyIGNycyA9IG9wdGlvbnMuY3JzIHx8ICc0MzI2OydcbiAgICByZXR1cm4gJC5nZXQoIHVybCwge1xuICAgICAgICAnU0VSVklDRSc6ICdXTVMnLFxuICAgICAgICAnVkVSU0lPTic6ICcxLjMuMCcsXG4gICAgICAgICdSRVFVRVNUJzogJ0dldEZlYXR1cmVJbmZvJyxcbiAgICAgICAgJ0xBWUVSUyc6IHF1ZXJ5bGF5ZXJuYW1lLFxuICAgICAgICAnUVVFUllfTEFZRVJTJzogcXVlcnlsYXllcm5hbWUsXG4gICAgICAgICdGRUFUVVJFX0NPVU5UJzogc2ltcGxlV21zU2VhcmNoTWF4UmVzdWx0cyB8fCAgNTAsXG4gICAgICAgICdJTkZPX0ZPUk1BVCc6ICdhcHBsaWNhdGlvbi92bmQub2djLmdtbCcsXG4gICAgICAgICdDUlMnOiAnRVBTRzonKyBjcnMsXG4gICAgICAgICdGSUxURVInOiBmaWx0ZXIsXG4gICAgICAgIC8vIFRlbXBvcmFyeSBmaXggZm9yIGh0dHBzOi8vaHViLnFnaXMub3JnL2lzc3Vlcy84NjU2IChmaXhlZCBpbiBRR0lTIG1hc3RlcilcbiAgICAgICAgJ0JCT1gnOiBiYm94IC8vIFFVSSBDSSBWQSBJTCBCQk9YIERFTExBIE1BUFBBXG4gICAgICB9XG4gICAgKTtcbiAgIH07XG5cbiAgLy9mdW56aW9uZSBjaGUgZmEgbGEgcmljZXJjYVxuICB0aGlzLmRvU2VhcmNoID0gZnVuY3Rpb24ocXVlcnlGaWx0ZXJPYmplY3QpIHtcbiAgICB2YXIgcXVlcnlsYXllciA9IHF1ZXJ5RmlsdGVyT2JqZWN0LnF1ZXJ5TGF5ZXI7XG4gICAgdmFyIHVybCA9IHF1ZXJ5bGF5ZXIuZ2V0UXVlcnlVcmwoKTtcbiAgICB2YXIgY3JzID0gcXVlcnlsYXllci5nZXRDcnMoKTtcbiAgICB2YXIgZmlsdGVyT2JqZWN0ID0gcXVlcnlGaWx0ZXJPYmplY3QuZmlsdGVyT2JqZWN0O1xuICAgIC8vY3JlbyBpbCBmaWx0cm9cbiAgICB2YXIgZmlsdGVyID0gdGhpcy5jcmVhdGVGaWx0ZXIoZmlsdGVyT2JqZWN0LCBxdWVyeWxheWVyLmdldFF1ZXJ5TGF5ZXJOYW1lKCkpO1xuICAgIC8vZXNlZ3VvIGxhIHJpY2hpZXN0YSBlIHJlc3RpdHVpc2NvIGNvbWUgcmlzcG9zdGEgbGEgcHJvbWlzZSBkZWwgJC5nZXRcbiAgICB2YXIgcmVzcG9uc2UgPSB0aGlzLnN1Ym1pdEdldEZlYXR1cmVJbmZvKHtcbiAgICAgIHVybDogdXJsLFxuICAgICAgY3JzOiBjcnMsXG4gICAgICBmaWx0ZXI6IGZpbHRlcixcbiAgICAgIHF1ZXJ5bGF5ZXJuYW1lOiBxdWVyeWxheWVyLmdldFF1ZXJ5TGF5ZXJOYW1lKClcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzcG9uc2U7XG4gIH07XG5cbiAgdGhpcy5jcmVhdGVGaWx0ZXIgPSBmdW5jdGlvbihmaWx0ZXJPYmplY3QsIHF1ZXJ5bGF5ZXJuYW1lKSB7XG5cbiAgICAvLy8vL2luc2VyaXNjbyBpbCBub21lIGRlbCBsYXllciAodHlwZW5hbWUpIC8vL1xuICAgIHZhciBmaWx0ZXIgPSBbXTtcbiAgICBmdW5jdGlvbiBjcmVhdGVTaW5nbGVGaWx0ZXIoYm9vbGVhbk9iamVjdCkge1xuICAgICAgdmFyIGZpbHRlckVsZW1lbnRzID0gW107XG4gICAgICB2YXIgZmlsdGVyRWxlbWVudCA9ICcnO1xuICAgICAgdmFyIHZhbHVlRXh0cmEgPSBcIlwiO1xuICAgICAgdmFyIHZhbHVlUXVvdGVzID0gXCJcIjtcbiAgICAgIHZhciByb290RmlsdGVyO1xuICAgICAgXy5mb3JFYWNoKGJvb2xlYW5PYmplY3QsIGZ1bmN0aW9uKHYsIGssIG9iaikge1xuICAgICAgICAvL2NyZW8gaWwgZmlsdHJvIHJvb3QgY2hlIHNhcsOgIEFORCBPUlxuICAgICAgICByb290RmlsdGVyID0gRmlsdGVyc1trXTtcbiAgICAgICAgLy9xdWkgYyfDqCBhcnJheSBkZWdsaSBlbGVtZW50aSBkaSB1biBib29sZWFub1xuICAgICAgICBfLmZvckVhY2godiwgZnVuY3Rpb24oaW5wdXQpe1xuICAgICAgICAgIC8vc2NvcnJvIHN1IG9nZ2V0dG9cbiAgICAgICAgICBfLmZvckVhY2goaW5wdXQsIGZ1bmN0aW9uKHYsIGssIG9iaikge1xuICAgICAgICAgIC8vdmVyaWZpY28gc2UgaWwgdmFsb3JlIGRlbGwnb2dnZXR0byDDqCBhcnJheSBlIHF1aW5kaSDDqCBhbHRybyBvZ2dldHRvIHBhZHJlIGJvb2xlYW5vXG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KHYpKSB7XG4gICAgICAgICAgICAgIGZpbHRlckVsZW1lbnQgPSBjcmVhdGVTaW5nbGVGaWx0ZXIob2JqKTtcbiAgICAgICAgICAgIH0gZWxzZSB7IC8vIMOoIHVuIG9nZ2V0dG8gb3BlcmF0b3JlXG4gICAgICAgICAgICAgIGlmIChrID09ICdMSUtFJyB8fCBrID09ICdJTElLRScpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZUV4dHJhID0gXCIlXCI7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGZpbHRlck9wID0gRmlsdGVyc1trXTtcbiAgICAgICAgICAgICAgXy5mb3JFYWNoKGlucHV0LCBmdW5jdGlvbih2LCBrLCBvYmopIHtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2godiwgZnVuY3Rpb24odiwgaywgb2JqKSB7XG4gICAgICAgICAgICAgICAgICAvL3ZlcmlmaWNvIHNlIGlsIHZhbG9yZSBub24gw6ggdW4gbnVtZXJvIGUgcXVpbmRpIGFnZ2l1bmdvIHNpbmdvbG8gYXBpY2VcbiAgICAgICAgICAgICAgICAgIGlmKGlzTmFOKHYpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlUXVvdGVzID0gXCInXCI7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZVF1b3RlcyA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgZmlsdGVyRWxlbWVudCA9IFwiXFxcIlwiICsgayArIFwiXFxcIiBcIisgZmlsdGVyT3AgK1wiIFwiICsgdmFsdWVRdW90ZXMgKyB2YWx1ZUV4dHJhICsgdiArIHZhbHVlRXh0cmEgKyB2YWx1ZVF1b3RlcztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZmlsdGVyRWxlbWVudHMucHVzaChmaWx0ZXJFbGVtZW50KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJvb3RGaWx0ZXIgPSBmaWx0ZXJFbGVtZW50cy5qb2luKFwiIFwiKyByb290RmlsdGVyICsgXCIgXCIpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcm9vdEZpbHRlcjtcbiAgICB9O1xuICAgIC8vYXNzZWdubyBpbCBmaWx0cm8gY3JlYXRvXG4gICAgZmlsdGVyID0gcXVlcnlsYXllcm5hbWUgKyBcIjpcIiArIGNyZWF0ZVNpbmdsZUZpbHRlcihmaWx0ZXJPYmplY3QpO1xuICAgIHJldHVybiBmaWx0ZXI7XG4gIH07XG5cbn07XG5cbmluaGVyaXQoUXVlcnlRR0lTV01TUHJvdmlkZXIsIEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gIG5ldyBRdWVyeVFHSVNXTVNQcm92aWRlcigpO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciByZXNvbHZlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlc29sdmU7XG4vL2RlZmluaXNjbyBpbCBmaWx0cm8gb2wzXG52YXIgb2wzT0dDRmlsdGVyID0gb2wuZm9ybWF0Lm9nYy5maWx0ZXI7XG5cbi8vb2dnZXR0byBjaGUgdmllbmUgcGFzc2F0byBwZXIgZWZmZXR0dXJhcmUgaWwgbGEgc2VhcmNoXG52YXIgb2wzR2V0RmVhdHVyZVJlcXVlc3RPYmplY3QgPSB7XG4gIHNyc05hbWU6ICdFUFNHOicsXG4gIGZlYXR1cmVOUzogJycsXG4gIGZlYXR1cmVQcmVmaXg6ICcnLFxuICBmZWF0dXJlVHlwZXM6IFtdLFxuICBvdXRwdXRGb3JtYXQ6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgZmlsdGVyOiBudWxsIC8vIGVzZW1waW8gZmlsdHJvIGNvbXBvc3RvIG9sM09HQ0ZpbHRlci5hbmQob2wzT0dDRmlsdGVyLmJib3goJ3RoZV9nZW9tJywgWzEsIDIsIDMsIDRdLCAndXJuOm9nYzpkZWY6Y3JzOkVQU0c6OjQzMjYnKSxvbDNPR0NGaWx0ZXIubGlrZSgnbmFtZScsICdOZXcqJykpXG59O1xuXG4vLyBGSUxUUkkgT0wzXG52YXIgb2wzRmlsdGVycyA9IHtcbiAgZXE6IG9sM09HQ0ZpbHRlci5lcXVhbFRvLFxuICBndDogb2wzT0dDRmlsdGVyLmdyZWF0ZXJUaGFuLFxuICBndGU6IG9sM09HQ0ZpbHRlci5ncmVhdGVyVGhhbk9yRXF1YWxUbyxcbiAgbHQ6IG9sM09HQ0ZpbHRlci5sZXNzVGhhbixcbiAgbHRlOiBvbDNPR0NGaWx0ZXIubGVzc1RoYW5PckVxdWFsVG8sXG4gIGxpa2U6IG9sM09HQ0ZpbHRlci5saWtlLFxuICBpbGlrZTogXCJcIixcbiAgYmJveDogb2wzT0dDRmlsdGVyLmJib3gsXG4gIEFORDogb2wzT0dDRmlsdGVyLmFuZCxcbiAgT1I6IG9sM09HQ0ZpbHRlci5vcixcbiAgTk9UOiBvbDNPR0NGaWx0ZXIubm90XG59O1xuXG5cbi8vIENSRUFUTyBVTiBGSUxUUk8gREkgRVNFTVBJTyBQRVIgVkVSSUZJQ0FSRSBMQSBDT1JSRVRURVpaQSBERUxMQSBGVU5aSU9ORSBDUkVBWklPTkUgRklMVFJPXG52YXIgdGVzdEZpbHRlciA9IHtcbiAgJ0FORCc6XG4gICAgW1xuICAgICAge1xuICAgICAgICBlcTpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBnaWQgOiAxMFxuICAgICAgICAgIH1cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgICdPUic6XG4gICAgICAgICAgW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBlcToge1xuICAgICAgICAgICAgICAgIHBpcHBvIDogJ2xhbGxvJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBndDoge1xuICAgICAgICAgICAgICAgIGlkIDogNVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBdXG4gICAgICB9XG4gICBdXG59XG4vLy8vLy8vLy8vLy8vL1xuXG4vLy9GSUxUUkkgQ1VTVE9NXG52YXIgc3RhbmRhcmRGaWx0ZXJUZW1wbGF0ZXMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGNvbW1vbiA9IHtcbiAgICBwcm9wZXJ0eU5hbWU6XG4gICAgICAgICAgXCI8UHJvcGVydHlOYW1lPlwiICtcbiAgICAgICAgICAgIFwiW1BST1BdXCIgK1xuICAgICAgICAgIFwiPC9Qcm9wZXJ0eU5hbWU+XCIsXG4gICAgbGl0ZXJhbDpcbiAgICAgICAgICBcIjxMaXRlcmFsPlwiICtcbiAgICAgICAgICAgIFwiW1ZBTFVFXVwiICtcbiAgICAgICAgICBcIjwvTGl0ZXJhbD5cIlxuICB9O1xuICByZXR1cm4ge1xuICAgIGVxOiBcIjxQcm9wZXJ0eUlzRXF1YWxUbz5cIiArXG4gICAgICAgICAgICBjb21tb24ucHJvcGVydHlOYW1lICtcbiAgICAgICAgICAgIGNvbW1vbi5saXRlcmFsICtcbiAgICAgICAgXCI8L1Byb3BlcnR5SXNFcXVhbFRvPlwiLFxuICAgIGd0OiBcIjxQcm9wZXJ0eUlzR3JlYXRlclRoYW4+XCIgK1xuICAgICAgICAgICAgY29tbW9uLnByb3BlcnR5TmFtZSArXG4gICAgICAgICAgICBjb21tb24ubGl0ZXJhbCArXG4gICAgICAgICBcIjwvUHJvcGVydHlJc0dyZWF0ZXJUaGFuPlwiLFxuICAgIGd0ZTpcIlwiLFxuICAgIGx0OiBcIlwiLFxuICAgIGx0ZTogXCJcIixcbiAgICBsaWtlOiBcIlwiLFxuICAgIGlsaWtlOiBcIlwiLFxuICAgIEFORDogXCI8QW5kPltBTkRdPC9BbmQ+XCIsXG4gICAgT1I6IFwiPE9yPltPUl08L09yPlwiLFxuICB9XG59KCk7XG5cbi8vLy8vXG52YXIgcWdpc0ZpbHRlclRlbXBsYXRlcyA9IHtcbiAgLy8gY29kaWNlIHF1aVxufTtcblxudmFyIG1hcHNlcnZlckZpbHRlclRlbXBsYXRlcyA9IHtcbiAgLy8gY29kaWNlIHF1aVxufTtcblxudmFyIGdlb3NlcnZlckZpbHRlclRlbXBsYXRlcyA9IHtcbiAgLy8gY29kaWNlIHF1aVxufTtcblxuZnVuY3Rpb24gUXVlcnlXRlNQcm92aWRlcigpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBkID0gJC5EZWZlcnJlZCgpO1xuICB2YXIgcmVzdWx0cyA9IHtcbiAgICBoZWFkZXJzOltdLFxuICAgIHZhbHVlczpbXVxuICB9O1xuXG4gIHRoaXMuZG9TZWFyY2ggPSBmdW5jdGlvbihxdWVyeUZpbHRlck9iamVjdCl7XG4gICAgdmFyIHF1ZXJ5bGF5ZXIgPSBxdWVyeUZpbHRlck9iamVjdC5xdWVyeUxheWVyO1xuICAgIHZhciB1cmwgPSBxdWVyeWxheWVyLmdldFF1ZXJ5VXJsKCk7XG4gICAgdmFyIGNycyA9IHF1ZXJ5bGF5ZXIuZ2V0Q3JzKCk7XG4gICAgdmFyIGZpbHRlck9iamVjdCA9IHF1ZXJ5RmlsdGVyT2JqZWN0LmZpbHRlck9iamVjdDtcbiAgICAvL3NldHRvIGlsIHNyc1xuICAgIG9sM0dldEZlYXR1cmVSZXF1ZXN0T2JqZWN0LnNyc05hbWUrPWNycyB8fCAnNDMyNic7XG4gICAgdmFyIHJlc3BvbnNlLCBmaWx0ZXI7XG4gICAgc3dpdGNoIChvZ2NzZXJ2ZXJ0eXBlKSB7XG4gICAgICBjYXNlICdPR0MnOlxuICAgICAgICBmaWx0ZXIgPSB0aGlzLmNyZWF0ZVN0YW5kYXJkRmlsdGVyKGZpbHRlck9iamVjdCwgcXVlcnlsYXllcik7XG4gICAgICAgIHJlc3BvbnNlID0gdGhpcy5zdGFuZGFyZFNlYXJjaCh1cmwsIGZpbHRlcik7XG4gICAgICAgIHJldHVybiByZXNvbHZlKHJlc3BvbnNlKVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3FnaXMnOlxuICAgICAgICBmaWx0ZXIgPSB0aGlzLmNyZWF0ZVFnaXNGaWx0ZXIoZmlsdGVyT2JqZWN0KTtcbiAgICAgICAgcmVzcG9uc2UgPSB0aGlzLnFnaXNTZWFyY2gocXVlcnlsYXllciwgdXJsLCBmaWx0ZXIpO1xuICAgICAgICByZXR1cm4gcmVzb2x2ZShyZXNwb25zZSlcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdtYXBzZXJ2ZXInOlxuICAgICAgICBmaWx0ZXIgPSB0aGlzLmNyZWF0ZU1hcHNlcnZlckZpbHRlcihmaWx0ZXJPYmplY3QpO1xuICAgICAgICByZXNwb25zZSA9IHRoaXMubWFwc2VydmVyU2VhcmNoKHF1ZXJ5bGF5ZXIsIHVybCwgZmlsdGVyKTtcbiAgICAgICAgcmV0dXJuIHJlc29sdmUocmVzcG9uc2UpXG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZ2Vvc2VydmVyJzpcbiAgICAgICAgZmlsdGVyID0gdGhpcy5jcmVhdGVHZW9zZXJ2ZXJGaWx0ZXIoZmlsdGVyT2JqZWN0KTtcbiAgICAgICAgcmVzcG9uc2UgPSB0aGlzLmdlb3NlcnZlclNlYXJjaChxdWVyeWxheWVyLCB1cmwsIGZpbHRlcik7XG4gICAgICAgIHJldHVybiByZXNvbHZlKHJlc3BvbnNlKVxuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfTtcblxuICB0aGlzLnN0YW5kYXJkU2VhcmNoID0gZnVuY3Rpb24odXJsLCBmaWx0ZXIpe1xuICAgIGNvbnNvbGUubG9nKGZpbHRlcilcbiAgfTtcbiAgdGhpcy5jcmVhdGVTdGFuZGFyZEZpbHRlciA9IGZ1bmN0aW9uKGZpbHRlck9iamVjdCwgcXVlcnlsYXllcikge1xuICAgIC8vLy8vaW5zZXJpc2NvIGlsIG5vbWUgZGVsIGxheWVyICh0eXBlbmFtZSkgLy8vXG4gICAgb2wzR2V0RmVhdHVyZVJlcXVlc3RPYmplY3QuZmVhdHVyZVR5cGVzLnB1c2gocXVlcnlsYXllci5nZXRRdWVyeUxheWVyTmFtZSk7XG4gICAgdmFyIGZpbHRlciA9IFtdO1xuICAgIGZ1bmN0aW9uIGNyZWF0ZVNpbmdsZUZpbHRlcihib29sZWFuT2JqZWN0KSB7XG4gICAgICB2YXIgZmlsdGVyRWxlbWVudHMgPSBbXTtcbiAgICAgIHZhciBmaWx0ZXJFbGVtZW50ID0gJyc7XG4gICAgICB2YXIgcm9vdEZpbHRlcjtcbiAgICAgIF8uZm9yRWFjaChib29sZWFuT2JqZWN0LCBmdW5jdGlvbih2LCBrLCBvYmopIHtcbiAgICAgICAgLy9jcmVvIGlsIGZpbHRybyByb290IGNoZSBzYXLDoCBBTkQgT1JcbiAgICAgICAgcm9vdEZpbHRlciA9IG9sM0ZpbHRlcnNba107XG4gICAgICAgIC8vcXVpIGMnw6ggYXJyYXkgZGVnbGkgZWxlbWVudGkgZGkgdW4gYm9vbGVhbm9cbiAgICAgICAgXy5mb3JFYWNoKHYsIGZ1bmN0aW9uKGlucHV0KXtcbiAgICAgICAgICAvL3Njb3JybyBzdSBvZ2dldHRvIG9wZXJhdG9yZVxuICAgICAgICAgIF8uZm9yRWFjaChpbnB1dCwgZnVuY3Rpb24odiwgaywgb2JqKSB7XG4gICAgICAgICAgLy/DqCB1biBhcnJheSBlIHF1aW5kaSDDqCBhbHRybyBvZ2dldHRvIHBhZHJlIGJvb2xlYW5vXG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KHYpKSB7XG4gICAgICAgICAgICAgIGZpbHRlckVsZW1lbnQgPSBjcmVhdGVTaW5nbGVGaWx0ZXIob2JqKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZpbHRlckVsZW1lbnQgPSBvbDNGaWx0ZXJzW2tdO1xuICAgICAgICAgICAgICBfLmZvckVhY2goaW5wdXQsIGZ1bmN0aW9uKHYsIGssIG9iaikge1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh2LCBmdW5jdGlvbih2LCBrLCBvYmopIHtcbiAgICAgICAgICAgICAgICAgIGZpbHRlckVsZW1lbnQgPSBmaWx0ZXJFbGVtZW50KGssIHYpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBmaWx0ZXJFbGVtZW50cy5wdXNoKGZpbHRlckVsZW1lbnQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgLy92ZXJpZmljbyBjaGUgY2kgc2lhbm8gYWxtZW5vIGR1ZSBjb25kaXppb25lIG5lbCBmaWx0cm8gQU5ELiBOZWwgY2FzbyBkaSB1bmEgc29sYSBjb25kaXppb25lIChlc2VtcGlvIDogdW4gc29sbyBpbnB1dClcbiAgICAgICAgLy9lc3RyYWdnbyBzb2xvIGwnZWxlbWVudG8gZmlsdHJvIGFsdHJpbWVudGkgZGEgZXJyb3JlIC0tIERBIFZFUklGSUNBUkUgU0UgQ0FNQklBUkxPXG4gICAgICAgIGlmIChmaWx0ZXJFbGVtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgcm9vdEZpbHRlciA9IHJvb3RGaWx0ZXIuYXBwbHkodGhpcywgZmlsdGVyRWxlbWVudHMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJvb3RGaWx0ZXIgPSBmaWx0ZXJFbGVtZW50c1swXTtcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJvb3RGaWx0ZXI7XG4gICAgfTtcbiAgICAvL2Fzc2Vnbm8gaWwgZmlsdHJvIGNyZWF0b1xuICAgIG9sM0dldEZlYXR1cmVSZXF1ZXN0T2JqZWN0LmZpbHRlciA9IGNyZWF0ZVNpbmdsZUZpbHRlcihmaWx0ZXJPYmplY3QpO1xuICAgIC8vY3JlbyBpbCBmaWx0cm8gdXRpbGl6emFuZG8gb2wzXG4gICAgZmlsdGVyID0gbmV3IG9sLmZvcm1hdC5XRlMoKS53cml0ZUdldEZlYXR1cmUob2wzR2V0RmVhdHVyZVJlcXVlc3RPYmplY3QpO1xuICAgIHJldHVybiBmaWx0ZXI7XG4gIH07XG5cbiAgdGhpcy5xZ2lzU2VhcmNoID0gZnVuY3Rpb24odXJscywgZmlsdGVyKXtcbiAgICAkLmdldChzZWFyY2hVcmwpLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgIHNlbGYuZW1pdChcInNlYXJjaGRvbmVcIixyZXN1bHQpO1xuICAgIH0pO1xuICAgIHJldHVybiBkLnByb21pc2UoKTtcbiAgfTtcbiAgdGhpcy5jcmVhdGVRR2lzRmlsdGVyID0gZnVuY3Rpb24oZmlsdGVyT2JqZWN0KSB7XG4gICAgdmFyIGZpbHRlcjtcbiAgICByZXR1cm4gZmlsdGVyXG4gIH07XG4gIHRoaXMubWFwc2VydmVyU2VhcmNoID0gZnVuY3Rpb24ocXVlcnlsYXllciwgdXJsLCBmaWx0ZXIpe1xuICAgIHJldHVybiBkLnByb21pc2UoKTtcbiAgfTtcbiAgdGhpcy5jcmVhdGVNYXBzZXJ2ZXJGaWx0ZXIgPSBmdW5jdGlvbihmaWx0ZXJPYmplY3QpIHtcbiAgICB2YXIgZmlsdGVyO1xuICAgIHJldHVybiBmaWx0ZXJcbiAgfTtcbiAgdGhpcy5nZW9zZXJ2ZXJTZWFyY2ggPSBmdW5jdGlvbihxdWVyeWxheWVyLCB1cmwsIGZpbHRlcil7XG4gICAgcmV0dXJuIGQucHJvbWlzZSgpO1xuICB9O1xuICB0aGlzLmNyZWF0ZUdlb3NlcnZlckZpbHRlciA9IGZ1bmN0aW9uKGZpbHRlck9iamVjdCkge1xuICAgIHZhciBmaWx0ZXI7XG4gICAgcmV0dXJuIGZpbHRlclxuICB9O1xuICBiYXNlKHRoaXMpO1xufVxuaW5oZXJpdChRdWVyeVdGU1Byb3ZpZGVyLEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gIG5ldyBRdWVyeVdGU1Byb3ZpZGVyKClcblxuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBQcm9qZWN0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3RzcmVnaXN0cnknKTtcbnZhciBRdWVyeVdGU1Byb3ZpZGVyID0gcmVxdWlyZSgnLi9xdWVyeVdGU1Byb3ZpZGVyJyk7XG52YXIgUXVlcnlRR0lTV01TUHJvdmlkZXIgPSByZXF1aXJlKCcuL3F1ZXJ5UUdJU1dNU1Byb3ZpZGVyJyk7XG52YXIgQ29tcG9uZW50c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnZ3VpL2NvbXBvbmVudHNyZWdpc3RyeScpO1xuXG52YXIgUHJvdmlkZXIgPSB7XG4gICdRR0lTJzogUXVlcnlRR0lTV01TUHJvdmlkZXIsXG4gICdPR0MnOiBRdWVyeVdGU1Byb3ZpZGVyXG59O1xuXG4vKnZhciBQaWNrVG9sZXJhbmNlUGFyYW1zID0ge307XG5QaWNrVG9sZXJhbmNlUGFyYW1zW1Byb2plY3RUeXBlcy5RREpBTkdPXSA9IHt9O1xuUGlja1RvbGVyYW5jZVBhcmFtc1tQcm9qZWN0VHlwZXMuUURKQU5HT11bR2VvbWV0cnlUeXBlcy5QT0lOVF0gPSBcIkZJX1BPSU5UX1RPTEVSQU5DRVwiO1xuUGlja1RvbGVyYW5jZVBhcmFtc1tQcm9qZWN0VHlwZXMuUURKQU5HT11bR2VvbWV0cnlUeXBlcy5MSU5FU1RSSU5HXSA9IFwiRklfTElORV9UT0xFUkFOQ0VcIjtcblBpY2tUb2xlcmFuY2VQYXJhbXNbUHJvamVjdFR5cGVzLlFESkFOR09dW0dlb21ldHJ5VHlwZXMuUE9MWUdPTl0gPSBcIkZJX1BPTFlHT05fVE9MRVJBTkNFXCI7XG5cbnZhciBQaWNrVG9sZXJhbmNlVmFsdWVzID0ge31cblBpY2tUb2xlcmFuY2VWYWx1ZXNbR2VvbWV0cnlUeXBlcy5QT0lOVF0gPSA1O1xuUGlja1RvbGVyYW5jZVZhbHVlc1tHZW9tZXRyeVR5cGVzLkxJTkVTVFJJTkddID0gNTtcblBpY2tUb2xlcmFuY2VWYWx1ZXNbR2VvbWV0cnlUeXBlcy5QT0xZR09OXSA9IDU7Ki9cblxuXG4vL29nZ2V0dG8gcXVlcnkgc2VydmljZVxuZnVuY3Rpb24gUXVlcnlTZXJ2aWNlKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy51cmwgPSBcIlwiO1xuICB0aGlzLmZpbHRlck9iamVjdCA9IHt9O1xuICB0aGlzLnF1ZXJ5RmlsdGVyT2JqZWN0ID0ge307XG4gIC8vbWUgbG8gcG9ydG8gZGEgbWFwcXVlcnlzZXJ2aWNlIG1hIHZlZGlhbW8gY29zYSBzdWNjZWRlXG4gIHRoaXMuc2V0TWFwU2VydmljZSA9IGZ1bmN0aW9uKG1hcFNlcnZpY2Upe1xuICAgIHRoaXMuX21hcFNlcnZpY2UgPSBtYXBTZXJ2aWNlO1xuICB9O1xuXG4gIHRoaXMuc2V0RmlsdGVyT2JqZWN0ID0gZnVuY3Rpb24oZmlsdGVyT2JqZWN0KXtcbiAgICB0aGlzLmZpbHRlck9iamVjdCA9IGZpbHRlck9iamVjdDtcbiAgfTtcblxuICB0aGlzLmdldEZpbHRlck9iamVjdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmZpbHRlck9iamVjdDtcbiAgfTtcbiAgLy9kYXRvIGwnb2dnZXR0byBmaWx0ZXIgcmVzdGl0dWl0byBkYWwgc2VydmVyIHJpY29zdHJ1aXNjbyBsYSBzdHJ1dHR1cmEgZGVsIGZpbHRlck9iamVjdFxuICAvL2ludGVycHJldGF0byBkYSBxdWVyeVdNU1Byb3ZpZGVyXG4gIHRoaXMuY3JlYXRlUXVlcnlGaWx0ZXJGcm9tQ29uZmlnID0gZnVuY3Rpb24oZmlsdGVyKSB7XG5cbiAgICB2YXIgcXVlcnlGaWx0ZXIgPSB7fTtcbiAgICB2YXIgYXR0cmlidXRlO1xuICAgIHZhciBvcGVyYXRvcjtcbiAgICB2YXIgZmllbGQ7XG4gICAgdmFyIG9wZXJhdG9yT2JqZWN0ID0ge307XG4gICAgdmFyIGJvb2xlYW5PYmplY3QgPSB7fTtcbiAgICAvL2Z1bnppb25lIGNoZSBjb3N0cnVpc2NlIGwnb2dnZXR0byBvcGVyYXRvcmUgZXMuIHsnPSc6eydub21lY2FtcG8nOm51bGx9fVxuICAgIGZ1bmN0aW9uIGNyZWF0ZU9wZXJhdG9yT2JqZWN0KG9iaikge1xuICAgICAgLy9yaW5pemlhbGl6em8gYSBvZ2dldHRvIHZ1b3RvXG4gICAgICBldmFsT2JqZWN0ID0ge307XG4gICAgICAvL3ZlcmlmaWNvIGNoZSBsJ29nZ2V0dG8gcGFzc2F0byBub24gc2lhIGEgc3VhIHZvbHRhIHVuIG9nZ2V0dG8gJ0JPT0xFQU5PJ1xuICAgICAgXy5mb3JFYWNoKG9iaiwgZnVuY3Rpb24odixrKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodikpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlQm9vbGVhbk9iamVjdChrLHYpO1xuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgICBmaWVsZCA9IG9iai5hdHRyaWJ1dGU7XG4gICAgICBvcGVyYXRvciA9IG9iai5vcDtcbiAgICAgIGV2YWxPYmplY3Rbb3BlcmF0b3JdID0ge307XG4gICAgICBldmFsT2JqZWN0W29wZXJhdG9yXVtmaWVsZF0gPSBudWxsO1xuICAgICAgcmV0dXJuIGV2YWxPYmplY3Q7XG4gICAgfVxuICAgIC8vZnVuY3Rpb25lIGNoZSBjb3N0cnVpc2NlIG9nZ2V0dGkgQk9PTEVBTkkgY2FzbyBBTkQgT1IgY29udGVuZW50ZSBhcnJheSBkaSBvZ2dldHRpIGZvcm5pdCBkYWxsYSBmdW56aW9uZSBjcmVhdGVPcGVyYXRvck9iamVjdFxuICAgIGZ1bmN0aW9uIGNyZWF0ZUJvb2xlYW5PYmplY3QoYm9vbGVhbk9wZXJhdG9yLCBvcGVyYXRpb25zKSB7XG4gICAgICBib29sZWFuT2JqZWN0ID0ge307XG4gICAgICBib29sZWFuT2JqZWN0W2Jvb2xlYW5PcGVyYXRvcl0gPSBbXTtcbiAgICAgIF8uZm9yRWFjaChvcGVyYXRpb25zLCBmdW5jdGlvbihvcGVyYXRpb24pe1xuICAgICAgICBib29sZWFuT2JqZWN0W2Jvb2xlYW5PcGVyYXRvcl0ucHVzaChjcmVhdGVPcGVyYXRvck9iamVjdChvcGVyYXRpb24pKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGJvb2xlYW5PYmplY3Q7XG4gICAgfVxuICAgIC8qXG4gICAgLy8gdmFkbyBhIGNyZWFyZSBsJ29nZ2V0dG8gZmlsdHJvIHByaW5jaXBhbGUuIFF1ZXN0byDDqCB1biBvZ2dldHRvIGNoZSBjb250aWVuZSBsJ29wZXJhdG9yZSBib29sZWFubyBjb21lIHJvb3QgKGNoaWF2ZSlcbiAgICAvLyBjb21lIHZhbG9yZSB1biBhcnJheSBkaSBvZ2dldHRpIG9wZXJhdG9yaSBjaGUgY29udGVuZ29ubyBpbCB0aXBvIGRpIG9wZXJhdG9yZSBjb21lIGNoaWF2ZSBlIGNvbWUgdmFsb3JlIHVuIG9nZ2V0dG8gY29udGVuZXRlXG4gICAgLy8gbm9tZSBjYW1wbyBlIHZhbG9yZSBwYXNzYXRvXG4gICAgKi9cbiAgICBfLmZvckVhY2goZmlsdGVyLCBmdW5jdGlvbih2LGssb2JqKSB7XG4gICAgICBxdWVyeUZpbHRlciA9IGNyZWF0ZUJvb2xlYW5PYmplY3Qoayx2KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcXVlcnlGaWx0ZXI7XG4gIH07XG5cbiAgdGhpcy5jcmVhdGVRdWVyeUZpbHRlck9iamVjdCA9IGZ1bmN0aW9uKGxheWVyLCBmaWx0ZXJPYmplY3Qpe1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnc3RhbmRhcmQnLFxuICAgICAgcXVlcnlMYXllcjogbGF5ZXIsXG4gICAgICBmaWx0ZXJPYmplY3QgOiBmaWx0ZXJPYmplY3RcbiAgICB9O1xuICB9O1xuXG4gIC8vLy8vUEFSU0VSUyAvLy8vLy8vLy8vLy8vLy8vLy9cblxuICAvLyBCcnV0dG8gbWEgcGVyIG9yYSB1bmljYSBzb2x1emlvbmUgdHJvdmF0YSBwZXIgZGl2aWRlcmUgcGVyIGxheWVyIGkgcmlzdWx0YXRpIGRpIHVuIGRvYyB4bWwgd2ZzLkZlYXR1cmVDb2xsZWN0aW9uLlxuICAvLyBPTDMgbGkgcGFyc2VyaXp6YSB0dXR0aSBpbnNpZW1lIG5vbiBkaXN0aW5ndWVuZG8gbGUgZmVhdHVyZXMgZGVpIGRpdmVyc2kgbGF5ZXJzXG4gIHRoaXMuX3BhcnNlTGF5ZXJGZWF0dXJlQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKHF1ZXJ5TGF5ZXIsIGRhdGEpIHtcbiAgICB2YXIgZmVhdHVyZXMgPSBbXTtcbiAgICB2YXIgbGF5ZXJOYW1lID0gcXVlcnlMYXllci5nZXRXTVNMYXllck5hbWUoKTtcbiAgICB2YXIgbGF5ZXJEYXRhID0gXy5jbG9uZURlZXAoZGF0YSk7XG4gICAgbGF5ZXJEYXRhLkZlYXR1cmVDb2xsZWN0aW9uLmZlYXR1cmVNZW1iZXIgPSBbXTtcbiAgICBcbiAgICB2YXIgZmVhdHVyZU1lbWJlcnMgPSBkYXRhLkZlYXR1cmVDb2xsZWN0aW9uLmZlYXR1cmVNZW1iZXI7XG4gICAgZmVhdHVyZU1lbWJlcnMgPSBfLmlzQXJyYXkoZmVhdHVyZU1lbWJlcnMpID8gZmVhdHVyZU1lbWJlcnMgOiBbZmVhdHVyZU1lbWJlcnNdO1xuICAgIF8uZm9yRWFjaChmZWF0dXJlTWVtYmVycyxmdW5jdGlvbihmZWF0dXJlTWVtYmVyKXtcbiAgICAgIGxheWVyTmFtZSA9IGxheWVyTmFtZS5yZXBsYWNlKC8gL2csJycpOyAvLyBRR0lTIFNFUlZFUiByaW11b3ZlIGdsaSBzcGF6aSBkYWwgbm9tZSBkZWwgbGF5ZXIgcGVyIGNyZWFyZSBsJ2VsZW1lbnRvIEZlYXR1cmVNZW1iZXJcbiAgICAgIHZhciBpc0xheWVyTWVtYmVyID0gXy5nZXQoZmVhdHVyZU1lbWJlcixsYXllck5hbWUpXG5cbiAgICAgIGlmIChpc0xheWVyTWVtYmVyKSB7XG4gICAgICAgIGxheWVyRGF0YS5GZWF0dXJlQ29sbGVjdGlvbi5mZWF0dXJlTWVtYmVyLnB1c2goZmVhdHVyZU1lbWJlcik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgeDJqcyA9IG5ldyBYMkpTKCk7XG4gICAgdmFyIGxheWVyRmVhdHVyZUNvbGxlY3Rpb25YTUwgPSB4MmpzLmpzb24yeG1sX3N0cihsYXllckRhdGEpO1xuICAgIHZhciBwYXJzZXIgPSBuZXcgb2wuZm9ybWF0LldNU0dldEZlYXR1cmVJbmZvKCk7XG4gICAgcmV0dXJuIHBhcnNlci5yZWFkRmVhdHVyZXMobGF5ZXJGZWF0dXJlQ29sbGVjdGlvblhNTCk7XG4gIH07XG5cbiAgLy8gbWVudHJlIGNvbiBpIHJpc3VsdGF0aSBpbiBtc0dMTU91dHB1dCAoZGEgTWFwc2VydmVyKSBpbCBwYXJzZXIgcHXDsiBlc3NlcmUgaXN0cnVpdG8gcGVyIHBhcnNlcml6emFyZSBpbiBiYXNlIGFkIHVuIGxheWVyIGRpIGZpbHRyb1xuICB0aGlzLl9wYXJzZUxheWVybXNHTUxPdXRwdXQgPSBmdW5jdGlvbihxdWVyeUxheWVyLCBkYXRhKXtcbiAgICB2YXIgcGFyc2VyID0gbmV3IG9sLmZvcm1hdC5XTVNHZXRGZWF0dXJlSW5mbyh7XG4gICAgICBsYXllcnM6IFtxdWVyeUxheWVyLnF1ZXJ5TGF5ZXJOYW1lXVxuICAgIH0pO1xuICAgIHJldHVybiBwYXJzZXIucmVhZEZlYXR1cmVzKGRhdGEpO1xuICB9O1xuICBcbiAgdGhpcy5fcGFyc2VMYXllckdlb0pTT04gPSBmdW5jdGlvbihxdWVyeUxheWVyLCBkYXRhKSB7XG4gICAgdmFyIGdlb2pzb24gPSBuZXcgb2wuZm9ybWF0Lkdlb0pTT04oe1xuICAgICAgZGVmYXVsdERhdGFQcm9qZWN0aW9uOiB0aGlzLmNycyxcbiAgICAgIGdlb21ldHJ5TmFtZTogXCJnZW9tZXRyeVwiXG4gICAgfSk7XG4gICAgcmV0dXJuIGdlb2pzb24ucmVhZEZlYXR1cmVzKGRhdGEpO1xuICB9O1xuXG4gIC8vLy8gRklORSBQQVJTRVIgLy8vXG5cbiAgLy9JTklaTyBTRVpJT05FIFFVRVJJRVMgLy8vXG5cbiAgLy8gTWVzc28gcXVpIGdlbmVyYWxlIGxhIGZ1bnppb25lIGNoZSBzaSBwcmVuZGUgY3VyYSBkZWxsYSB0cmFzZm9ybWF6aW9uZSBkZWxsJ3htbCBkaSByaXNwb3N0YVxuICAvLyBkYWwgc2VydmVyIGNvc8OsIGRhIGF2ZXJlIHVuYSByaXNwb3N0YSBjb2VyZW50ZSBpbiB0ZXJtaW5pIGRpIGZvcm1hdG8gcmlzdWx0YXRpIGRhIHByZXNlbnRhcmVcbiAgLy8gbmVsIGNvbXBvbmVudGUgUXVlcnlSZXN1bHRzXG4gIHRoaXMuaGFuZGxlUXVlcnlSZXNwb25zZUZyb21TZXJ2ZXIgPSBmdW5jdGlvbihyZXNwb25zZSwgaW5mb0Zvcm1hdCwgcXVlcnlMYXllcnMpIHtcbiAgICB2YXIganNvbnJlc3BvbnNlO1xuICAgIHZhciBmZWF0dXJlc0ZvckxheWVycyA9IFtdO1xuICAgIHZhciBwYXJzZXIsIGRhdGE7XG4gICAgc3dpdGNoIChpbmZvRm9ybWF0KSB7XG4gICAgICBjYXNlICdqc29uJzpcbiAgICAgICAgcGFyc2VyID0gdGhpcy5fcGFyc2VMYXllckdlb0pTT047XG4gICAgICAgIGRhdGEgPSByZXNwb25zZS52ZWN0b3IuZGF0YTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB2YXIgeDJqcyA9IG5ldyBYMkpTKCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaWYgKF8uaXNTdHJpbmcocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICBqc29ucmVzcG9uc2UgPSB4MmpzLnhtbF9zdHIyanNvbihyZXNwb25zZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGpzb25yZXNwb25zZSA9IHgyanMueG1sMmpzb24ocmVzcG9uc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcm9vdE5vZGUgPSBfLmtleXMoanNvbnJlc3BvbnNlKVswXTtcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAocm9vdE5vZGUpIHtcbiAgICAgICAgICBjYXNlICdGZWF0dXJlQ29sbGVjdGlvbic6XG4gICAgICAgICAgICBwYXJzZXIgPSB0aGlzLl9wYXJzZUxheWVyRmVhdHVyZUNvbGxlY3Rpb247XG4gICAgICAgICAgICBkYXRhID0ganNvbnJlc3BvbnNlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBcIm1zR01MT3V0cHV0XCI6XG4gICAgICAgICAgICBwYXJzZXIgPSB0aGlzLl9wYXJzZUxheWVybXNHTUxPdXRwdXQ7XG4gICAgICAgICAgICBkYXRhID0gcmVzcG9uc2U7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgdmFyIG5mZWF0dXJlcyA9IDBcbiAgICBfLmZvckVhY2gocXVlcnlMYXllcnMsZnVuY3Rpb24ocXVlcnlMYXllcikge1xuICAgICAgdmFyIGZlYXR1cmVzID0gcGFyc2VyLmNhbGwoc2VsZiwgcXVlcnlMYXllciwgZGF0YSlcbiAgICAgIG5mZWF0dXJlcyArPSBmZWF0dXJlcy5sZW5ndGg7XG4gICAgICBmZWF0dXJlc0ZvckxheWVycy5wdXNoKHtcbiAgICAgICAgbGF5ZXI6IHF1ZXJ5TGF5ZXIsXG4gICAgICAgIGZlYXR1cmVzOiBmZWF0dXJlc1xuICAgICAgfSlcbiAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlc0ZvckxheWVycztcbiAgfTtcbiAgLy8gcXVlcnkgYmFzYXRvIHN1bCBmaWx0cm9cblxuICB0aGlzLnF1ZXJ5QnlGaWx0ZXIgPSBmdW5jdGlvbihxdWVyeUZpbHRlck9iamVjdCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZCA9ICQuRGVmZXJyZWQoKTtcbiAgICAvL3BhcnRlIGRhIHJpdmVkZXJlIG5lbCBmaWx0cm9cbiAgICB2YXIgcHJvdmlkZXIgPSBQcm92aWRlcltxdWVyeUZpbHRlck9iamVjdC5xdWVyeUxheWVyLmdldFNlcnZlclR5cGUoKV07XG4gICAgLy9yaXRvcm5hIHVuYSBwcm9taXNlIHBvaSBnZXN0aXRhIGRhIGNoZSBsYSBjaGllZGVcbiAgICBwcm92aWRlci5kb1NlYXJjaChxdWVyeUZpbHRlck9iamVjdCkuXG4gICAgdGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgLy9hbCBtb21lbnRvIHF1aSByZXBsaWNvIHN0cnV0dHVyYSBwZXIgaSBwYXJzZXJcbiAgICAgIHZhciBxdWVyeUxheWVyID0gcXVlcnlGaWx0ZXJPYmplY3QucXVlcnlMYXllcjtcbiAgICAgIHZhciBmZWF0dXJlc0ZvckxheWVycyA9IHNlbGYuaGFuZGxlUXVlcnlSZXNwb25zZUZyb21TZXJ2ZXIocmVzcG9uc2UsIHF1ZXJ5TGF5ZXIuZ2V0SW5mb0Zvcm1hdCgpLCBbcXVlcnlMYXllcl0pXG4gICAgICBkLnJlc29sdmUoe1xuICAgICAgICBkYXRhOiBmZWF0dXJlc0ZvckxheWVycyxcbiAgICAgICAgcXVlcnk6IHtcbiAgICAgICAgICBmaWx0ZXI6IHF1ZXJ5RmlsdGVyT2JqZWN0XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pXG4gICAgLmZhaWwoZnVuY3Rpb24oZSl7XG4gICAgICAgICAgZC5yZWplY3QoZSk7XG4gICAgfSlcbiAgICByZXR1cm4gZC5wcm9taXNlKCk7XG4gIH07XG4gIFxuICB0aGlzLnF1ZXJ5QnlMb2NhdGlvbiA9IGZ1bmN0aW9uKGNvb3JkaW5hdGVzLCBsYXllcnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGQgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIHVybHNGb3JMYXllcnMgPSB7fTtcbiAgICBfLmZvckVhY2gobGF5ZXJzLGZ1bmN0aW9uKGxheWVyKXtcbiAgICAgIHZhciBxdWVyeVVybCA9IGxheWVyLmdldFF1ZXJ5VXJsKCk7XG4gICAgICB2YXIgdXJsSGFzaCA9IHF1ZXJ5VXJsLmhhc2hDb2RlKCkudG9TdHJpbmcoKTtcbiAgICAgIGlmIChfLmtleXModXJsc0ZvckxheWVycykuaW5kZXhPZih1cmxIYXNoKSA9PSAtMSkge1xuICAgICAgICB1cmxzRm9yTGF5ZXJzW3VybEhhc2hdID0ge1xuICAgICAgICAgIHVybDogcXVlcnlVcmwsXG4gICAgICAgICAgbGF5ZXJzOiBbXVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgdXJsc0ZvckxheWVyc1t1cmxIYXNoXS5sYXllcnMucHVzaChsYXllcik7XG4gICAgfSk7XG5cbiAgICB2YXIgcXVlcnlVcmxzRm9yTGF5ZXJzID0gW107XG4gICAgXy5mb3JFYWNoKHVybHNGb3JMYXllcnMsZnVuY3Rpb24odXJsRm9yTGF5ZXJzKXtcbiAgICAgIHZhciBxdWVyeUxheWVycyA9IHVybEZvckxheWVycy5sYXllcnM7XG4gICAgICB2YXIgaW5mb0Zvcm1hdCA9IHF1ZXJ5TGF5ZXJzWzBdLmdldEluZm9Gb3JtYXQoKTtcbiAgICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICAgIExBWUVSUzogXy5tYXAocXVlcnlMYXllcnMsZnVuY3Rpb24obGF5ZXIpeyByZXR1cm4gbGF5ZXIuZ2V0UXVlcnlMYXllck5hbWUoKTsgfSksXG4gICAgICAgIFFVRVJZX0xBWUVSUzogXy5tYXAocXVlcnlMYXllcnMsZnVuY3Rpb24obGF5ZXIpeyByZXR1cm4gbGF5ZXIuZ2V0UXVlcnlMYXllck5hbWUoKTsgfSksXG4gICAgICAgIElORk9fRk9STUFUOiBpbmZvRm9ybWF0LFxuICAgICAgICAvLyBQQVJBTUVUUkkgREkgVE9MTEVSQU5aQSBQRVIgUUdJUyBTRVJWRVJcbiAgICAgICAgRklfUE9JTlRfVE9MRVJBTkNFOiAxMCxcbiAgICAgICAgRklfTElORV9UT0xFUkFOQ0U6IDEwLFxuICAgICAgICBGSV9QT0xZR09OX1RPTEVSQU5DRTogMTBcbiAgICAgIH07XG4gICAgICBcbiAgICAgIHZhciByZXNvbHV0aW9uID0gc2VsZi5fbWFwU2VydmljZS5nZXRSZXNvbHV0aW9uKCk7XG4gICAgICB2YXIgZXBzZyA9IHNlbGYuX21hcFNlcnZpY2UuZ2V0RXBzZygpO1xuICAgICAgdmFyIGdldEZlYXR1cmVJbmZvVXJsID0gc2VsZi5fbWFwU2VydmljZS5nZXRHZXRGZWF0dXJlSW5mb1VybEZvckxheWVyKHF1ZXJ5TGF5ZXJzWzBdLGNvb3JkaW5hdGVzLHJlc29sdXRpb24sZXBzZyxwYXJhbXMpO1xuICAgICAgdmFyIHF1ZXJ5U3RyaW5nID0gZ2V0RmVhdHVyZUluZm9Vcmwuc3BsaXQoJz8nKVsxXTtcbiAgICAgIHZhciB1cmwgPSB1cmxGb3JMYXllcnMudXJsKyc/JytxdWVyeVN0cmluZztcbiAgICAgIHF1ZXJ5VXJsc0ZvckxheWVycy5wdXNoKHtcbiAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgIGluZm9mb3JtYXQ6IGluZm9Gb3JtYXQsXG4gICAgICAgIHF1ZXJ5TGF5ZXJzOiBxdWVyeUxheWVyc1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKHF1ZXJ5VXJsc0ZvckxheWVycy5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgcXVlcnlSZXF1ZXN0cyA9IFtdO1xuICAgICAgdmFyIHF1ZXJ5UmVxdWVzdHNDb250ZXh0ID0gW107XG4gICAgICB2YXIgZmVhdHVyZXNGb3JMYXllcnMgPSBbXTtcbiAgICAgIF8uZm9yRWFjaChxdWVyeVVybHNGb3JMYXllcnMsZnVuY3Rpb24ocXVlcnlVcmxGb3JMYXllcnMpe1xuICAgICAgICB2YXIgdXJsID0gcXVlcnlVcmxGb3JMYXllcnMudXJsO1xuICAgICAgICB2YXIgcXVlcnlMYXllcnMgPSBxdWVyeVVybEZvckxheWVycy5xdWVyeUxheWVycztcbiAgICAgICAgdmFyIGluZm9Gb3JtYXQgPSBxdWVyeVVybEZvckxheWVycy5pbmZvZm9ybWF0O1xuICAgICAgICB2YXIgcmVxdWVzdCA9IHNlbGYuZG9SZXF1ZXN0QW5kUGFyc2UodXJsLGluZm9Gb3JtYXQscXVlcnlMYXllcnMpO1xuICAgICAgICBxdWVyeVJlcXVlc3RzLnB1c2gocmVxdWVzdCk7XG4gICAgICB9KTtcbiAgICAgICQud2hlbi5hcHBseSh0aGlzLHF1ZXJ5UmVxdWVzdHMpLlxuICAgICAgdGhlbihmdW5jdGlvbigpe1xuICAgICAgICB2YXIgdmVjdG9yc0RhdGFSZXNwb25zZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIF8uZm9yRWFjaCh2ZWN0b3JzRGF0YVJlc3BvbnNlLGZ1bmN0aW9uKF9mZWF0dXJlc0ZvckxheWVycyxpZHgpe1xuICAgICAgICAgIGlmKGZlYXR1cmVzRm9yTGF5ZXJzKXtcbiAgICAgICAgICAgIGZlYXR1cmVzRm9yTGF5ZXJzID0gXy5jb25jYXQoZmVhdHVyZXNGb3JMYXllcnMsX2ZlYXR1cmVzRm9yTGF5ZXJzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBkLnJlc29sdmUoe1xuICAgICAgICAgIGRhdGE6IGZlYXR1cmVzRm9yTGF5ZXJzLFxuICAgICAgICAgIHF1ZXJ5OiB7XG4gICAgICAgICAgICBjb29yZGluYXRlczogY29vcmRpbmF0ZXNcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKGUpe1xuICAgICAgICBkLnJlamVjdChlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGQucmVzb2x2ZShjb29yZGluYXRlcywwLHt9KTtcbiAgICB9XG4gICAgcmV0dXJuIGQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgdGhpcy5kb1JlcXVlc3RBbmRQYXJzZSA9IGZ1bmN0aW9uKHVybCxpbmZvRm9ybWF0LHF1ZXJ5TGF5ZXJzKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGQgPSAkLkRlZmVycmVkKCk7XG4gICAgJC5nZXQodXJsKS5cbiAgICBkb25lKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgIHZhciBmZWF0dXJlc0ZvckxheWVycyA9IHNlbGYuaGFuZGxlUXVlcnlSZXNwb25zZUZyb21TZXJ2ZXIocmVzcG9uc2UsIGluZm9Gb3JtYXQsIHF1ZXJ5TGF5ZXJzKTtcbiAgICAgIGQucmVzb2x2ZShmZWF0dXJlc0ZvckxheWVycyk7XG4gICAgfSlcbiAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgZC5yZWplY3QoKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZDtcbiAgfVxuXG4gIC8vcXVlcnkgYnkgQkJPWFxuICB0aGlzLnF1ZXJ5QnlCb3VuZGluZ0JveCA9IGZ1bmN0aW9uKGJib3gpIHtcbiAgICAvL2NvZGljZSBxdWlcbiAgfTtcblxuXG4gIGJhc2UodGhpcyk7XG59XG5pbmhlcml0KFF1ZXJ5U2VydmljZSxHM1dPYmplY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9ICBuZXcgUXVlcnlTZXJ2aWNlXG5cbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIEJhc2U2NCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5CYXNlNjQ7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcblxuLypcbiAqIFJvdXRlclNlcnZpY2UgYmFzYXRvIHN1IEhpc3RvcnkuanMgKGh0dHBzOi8vZ2l0aHViLmNvbS9icm93c2Vyc3RhdGUvaGlzdG9yeS5qcykgZSBDcm9zc3JvYWRzIChodHRwczovL2dpdGh1Yi5jb20vbWlsbGVybWVkZWlyb3MvY3Jvc3Nyb2Fkcy5qcylcbiAqIElsIGNvbmNldHRvIGRpIGJhc2Ugw6ggdW5hIFJvdXRlUXVlcnksIGRlbCB0aXBvIFwibWFwP3BvaW50PTIxLjIsNDIuMSZ6b29tPTEyXCIsIFxuICogY2hlIHZpZW5lIGluc2VyaXRvIG5lbGxvIHN0YXRvIGRlbGwnaGlzdG9yeSBkZWwgYnJvd3NlciBlIG5lbGxhIFVSTCBjb21lIHBhcmFtZXRybyBxdWVyeXN0cmluZyBpbiBmb3JtYSBjb2RpZmljYXRhIChxPW1hcEBwb2ludCEyMS4yLDQxLjF8em9vbSExMikuXG4gKiBQZXIgaW52b2NhcmUgdW5hIFJvdXRlUXVlcnk6XG4gKiBcbiAqIFJvdXRlclNlcnZpY2UuZ290byhcIm1hcD9wb2ludD0yMS4yLDQyLjEmem9vbT0xMlwiKTtcbiAqIFxuICogQ2hpdW5xdWUgdm9nbGlhIHJpc3BvbmRlcmUgYWQgdW5hIFJvdXRlUXVlcnkgZGV2ZSBhZ2dpdW5nZXJlIHVuYSByb3V0ZSBjb24gUm91dGVyU2VydmljZS5hZGRSb3V0ZShwYXR0ZXJuLCBjYWxsYmFjaykuIEVzLjpcbiAqIFxuICogdmFyIHJvdXRlID0gUm91dGVyU2VydmljZS5hZGRSb3V0ZSgnbWFwL3s/cXVlcnl9JyxmdW5jdGlvbihxdWVyeSl7XG4gKiAgY29uc29sZS5sb2cocXVlcnkucG9pbnQpO1xuICogIGNvbnNvbGUubG9nKHF1ZXJ5Lnpvb20pO1xuICogfSk7XG4gKiBcbiAqIFBhdHRlcm5zOlxuICogIFwibWFwL3tmb299XCI6IGxhIHBvcnppb25lIFwiZm9vXCIgw6ggcmljaGllc3RhLCBlZCB2aWVuZSBwYXNzYXRhIGNvbWUgcGFyYW1ldHJvIGFsbGEgY2FsbGJhY2tcbiAqICBcIm1hcC86Zm9vOlwiOiBsYSBwb3J6aW9uZSBcImZvb1wiIMOoIG9wemlvbmFsZSwgZWQgZXZlbnR1YWxtZW50ZSB2aWVuZSBwYXNzYXRhIGNvbWUgcGFyYW1ldHJvIGFsbGEgY2FsbGJhY2tcbiAqICBcIm1hcC86Zm9vKjogdHV0dG8gcXVlbGxvIGNoZSB2aWVuZSBkb3BvIFwibWFwL1wiXG4gKiAgXCJtYXAvez9xdWVyeXN0cmluZ31cIjogb2JibGlnYXRvcmlhIHF1ZXJ5c3RyaW5nLCBwYXNzYXRhIGFsbGEgY2FsbGJhY2sgY29tZSBvZ2dldHRvIGRlaSBwYXJhbWV0cmlcbiAqICBcIm1hcC86P3F1ZXJ5c3RyaW5nOlwiOiBldmVudHVhbGUgcXVlcnlzdHJpbmcsIHBhc3NhdGEgYWxsYSBjYWxsYmFjayBjb21lIG9nZ2V0dG8gZGVpIHBhcmFtZXRyaVxuICogXG4gKiBQZXIgcmltdW92ZXJlIHVuYSByb3V0ZTpcbiAqIFJvdXRlclNlcnZpY2UucmVtb3ZlUm91dGUocm91dGUpO1xuKi9cblxudmFyIFJvdXRlclNlcnZpY2UgPSBmdW5jdGlvbigpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX2luaXRpYWxMb2NhdGlvblF1ZXJ5O1xuICB0aGlzLl9yb3V0ZVF1ZXJ5ID0gJyc7XG4gIHRoaXMuc2V0dGVycyA9IHtcbiAgICBzZXRSb3V0ZVF1ZXJ5OiBmdW5jdGlvbihyb3V0ZVF1ZXJ5KXtcbiAgICAgIHRoaXMuX3JvdXRlUXVlcnkgPSByb3V0ZVF1ZXJ5O1xuICAgICAgY3Jvc3Nyb2Fkcy5wYXJzZShyb3V0ZVF1ZXJ5KTtcbiAgICB9XG4gIH1cbiAgXG4gIEhpc3RvcnkuQWRhcHRlci5iaW5kKHdpbmRvdywnc3RhdGVjaGFuZ2UnLGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgc3RhdGUgPSBIaXN0b3J5LmdldFN0YXRlKCk7XG4gICAgICB2YXIgbG9jYXRpb25RdWVyeSA9IHN0YXRlLmhhc2g7XG4gICAgICBpZihzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEucm91dGVxdWVyeSl7XG4gICAgICAgICBzZWxmLnNldFJvdXRlUXVlcnkoc3RhdGUuZGF0YS5yb3V0ZXF1ZXJ5KTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBzZWxmLl9zZXRSb3V0ZVF1ZXJ5RnJvbUxvY2F0aW9uUXVlcnkobG9jYXRpb25RdWVyeSk7XG4gICAgICB9XG4gIH0pO1xuICBcbiAgYmFzZSh0aGlzKTtcbn07XG5pbmhlcml0KFJvdXRlclNlcnZpY2UsRzNXT2JqZWN0KTtcblxudmFyIHByb3RvID0gUm91dGVyU2VydmljZS5wcm90b3R5cGU7XG5cbnByb3RvLmluaXQgPSBmdW5jdGlvbigpe1xuICB2YXIgcXVlcnkgPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoO1xuICB0aGlzLl9zZXRSb3V0ZVF1ZXJ5RnJvbUxvY2F0aW9uUXVlcnkocXVlcnkpO1xufTtcblxucHJvdG8uYWRkUm91dGUgPSBmdW5jdGlvbihwYXR0ZXJuLGhhbmRsZXIscHJpb3JpdHkpIHtcbiAgcmV0dXJuIGNyb3Nzcm9hZHMuYWRkUm91dGUocGF0dGVybixoYW5kbGVyLHByaW9yaXR5KTtcbn07XG5cbnByb3RvLnJlbW92ZVJvdXRlID0gZnVuY3Rpb24ocm91dGUpIHtcbiAgcmV0dXJuIGNyb3Nzcm9hZHMucmVtb3ZlUm91dGUocm91dGUpO1xufTtcblxucHJvdG8ucmVtb3ZlQWxsUm91dGVzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBjcm9zc3JvYWRzLnJlbW92ZUFsbFJvdXRlcygpO1xufTtcblxucHJvdG8ucGFyc2UgPSBmdW5jdGlvbihyZXF1ZXN0LGRlZmF1bHRBcmdzKSB7XG4gIHJldHVybiBjcm9zc3JvYWRzLnBhcnNlKHJlcXVlc3QsZGVmYXVsdEFyZ3MpO1xufTtcblxucHJvdG8uZ290byA9IGZ1bmN0aW9uKHJvdXRlUXVlcnkpe1xuICAvL3ZhciBwYXRoYjY0ID0gQmFzZTY0LmVuY29kZShwYXRoKTtcbiAgLy9IaXN0b3J5LnB1c2hTdGF0ZSh7cGF0aDpwYXRofSxudWxsLCc/cD0nK3BhdGhiNjQpO1xuICBpZiAoIXRoaXMuX2luaXRpYWxRdWVyeSkge1xuICAgIHRoaXMuX2luaXRpYWxMb2NhdGlvblF1ZXJ5ID0gdGhpcy5fc3RyaXBJbml0aWFsUXVlcnkobG9jYXRpb24uc2VhcmNoLnN1YnN0cmluZygxKSk7XG4gIH1cbiAgaWYgKHJvdXRlUXVlcnkpIHtcbiAgICBlbmNvZGVkUm91dGVRdWVyeSA9IHRoaXMuX2VuY29kZVJvdXRlUXVlcnkocm91dGVRdWVyeSk7XG4gICAgdmFyIHBhdGggPSAnPycrdGhpcy5faW5pdGlhbExvY2F0aW9uUXVlcnkgKyAnJnE9JytlbmNvZGVkUm91dGVRdWVyeTtcbiAgICBIaXN0b3J5LnB1c2hTdGF0ZSh7cm91dGVxdWVyeTpyb3V0ZVF1ZXJ5fSxudWxsLHBhdGgpO1xuICB9XG59O1xuXG5wcm90by5tYWtlUXVlcnlTdHJpbmcgPSBmdW5jdGlvbihxdWVyeVBhcmFtcyl7fTtcblxucHJvdG8uc2xpY2VQYXRoID0gZnVuY3Rpb24ocGF0aCl7XG4gIHJldHVybiBwYXRoLnNwbGl0KCc/JylbMF0uc3BsaXQoJy8nKTtcbn07XG4gIFxucHJvdG8uc2xpY2VGaXJzdCA9IGZ1bmN0aW9uKHBhdGgpe1xuICB2YXIgcGF0aEFuZFF1ZXJ5ID0gcGF0aC5zcGxpdCgnPycpO1xuICB2YXIgcXVlcnlTdHJpbmcgPSBwYXRoQW5kUXVlcnlbMV07XG4gIHZhciBwYXRoQXJyID0gcGF0aEFuZFF1ZXJ5WzBdLnNwbGl0KCcvJylcbiAgdmFyIGZpcnN0UGF0aCA9IHBhdGhBcnJbMF07XG4gIHBhdGggPSBwYXRoQXJyLnNsaWNlKDEpLmpvaW4oJy8nKTtcbiAgcGF0aCA9IFtwYXRoLHF1ZXJ5U3RyaW5nXS5qb2luKCc/JylcbiAgcmV0dXJuIFtmaXJzdFBhdGgscGF0aF07XG59O1xuICBcbnByb3RvLmdldFF1ZXJ5UGFyYW1zID0gZnVuY3Rpb24ocXVlcnkpe1xuICBxdWVyeSA9IHF1ZXJ5LnJlcGxhY2UoJz8nLCcnKTtcbiAgdmFyIHF1ZXJ5UGFyYW1zID0ge307XG4gIHZhciBxdWVyeVBhaXJzID0gW107XG4gIGlmIChxdWVyeSAhPSBcIlwiICYmIHF1ZXJ5LmluZGV4T2YoXCImXCIpID09IC0xKSB7XG4gICAgcXVlcnlQYWlycyA9IFtxdWVyeV07XG4gIH1cbiAgZWxzZSB7XG4gICAgcXVlcnlQYWlycyA9IHF1ZXJ5LnNwbGl0KCcmJyk7XG4gIH1cbiAgdHJ5IHtcbiAgICBfLmZvckVhY2gocXVlcnlQYWlycyxmdW5jdGlvbihxdWVyeVBhaXIpe1xuICAgICAgdmFyIHBhaXIgPSBxdWVyeVBhaXIuc3BsaXQoJz0nKTtcbiAgICAgIHZhciBrZXkgPSBwYWlyWzBdO1xuICAgICAgdmFyIHZhbHVlID0gcGFpclsxXTtcbiAgICAgIHF1ZXJ5UGFyYW1zW2tleV0gPSB2YWx1ZTtcbiAgICB9KTtcbiAgfVxuICBjYXRjaCAoZSkge31cbiAgcmV0dXJuIHF1ZXJ5UGFyYW1zO1xufTtcblxucHJvdG8uZ2V0UXVlcnlTdHJpbmcgPSBmdW5jdGlvbihwYXRoKXtcbiAgcmV0dXJuIHBhdGguc3BsaXQoJz8nKVsxXTtcbn07XG5cbnByb3RvLl9nZXRRdWVyeVBvcnRpb24gPSBmdW5jdGlvbihxdWVyeSxxdWVyeUtleSl7XG4gIHZhciBxdWVyeVBvcnRpb247XG4gIHRyeSB7XG4gICAgdmFyIHF1ZXJ5UGFpcnMgPSBxdWVyeS5zcGxpdCgnJicpO1xuICAgIHZhciBxdWVyeVBhcmFtcyA9IHt9O1xuICAgIF8uZm9yRWFjaChxdWVyeVBhaXJzLGZ1bmN0aW9uKHF1ZXJ5UGFpcil7XG4gICAgICB2YXIgcGFpciA9IHF1ZXJ5UGFpci5zcGxpdCgnPScpO1xuICAgICAgdmFyIGtleSA9IHBhaXJbMF07XG4gICAgICBpZiAoa2V5ID09IHF1ZXJ5S2V5KSB7XG4gICAgICAgIHF1ZXJ5UG9ydGlvbiA9IHF1ZXJ5UGFpcjtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICBjYXRjaCAoZSkge31cbiAgcmV0dXJuIHF1ZXJ5UG9ydGlvbjtcbn07XG5cbnByb3RvLl9lbmNvZGVSb3V0ZVF1ZXJ5ID0gZnVuY3Rpb24ocm91dGVRdWVyeSkge1xuICByb3V0ZVF1ZXJ5ID0gcm91dGVRdWVyeS5yZXBsYWNlKCc/JywnQCcpO1xuICByb3V0ZVF1ZXJ5ID0gcm91dGVRdWVyeS5yZXBsYWNlKCcmJywnfCcpO1xuICByb3V0ZVF1ZXJ5ID0gcm91dGVRdWVyeS5yZXBsYWNlKCc9JywnIScpO1xuICByZXR1cm4gcm91dGVRdWVyeTtcbn07XG5cbnByb3RvLl9kZWNvZGVSb3V0ZVF1ZXJ5ID0gZnVuY3Rpb24ocm91dGVRdWVyeSkge1xuICByb3V0ZVF1ZXJ5ID0gcm91dGVRdWVyeS5yZXBsYWNlKCdAJywnPycpO1xuICByb3V0ZVF1ZXJ5ID0gcm91dGVRdWVyeS5yZXBsYWNlKCd8JywnJicpO1xuICByb3V0ZVF1ZXJ5ID0gcm91dGVRdWVyeS5yZXBsYWNlKCchJywnPScpO1xuICByZXR1cm4gcm91dGVRdWVyeTtcbn07XG5cbnByb3RvLl9zZXRSb3V0ZVF1ZXJ5RnJvbUxvY2F0aW9uUXVlcnkgPSBmdW5jdGlvbihsb2NhdGlvblF1ZXJ5KSB7XG4gIC8vdmFyIHBhdGhiNjQgPSB0aGlzLmdldFF1ZXJ5UGFyYW1zKGxvY2F0aW9uUXVlcnkpWydxJ107XG4gIC8vdmFyIHBhdGggPSBwYXRoYjY0ID8gQmFzZTY0LmRlY29kZShwYXRoYjY0KSA6ICcnO1xuICB2YXIgZW5jb2RlZFJvdXRlUXVlcnkgPSB0aGlzLl9nZXRSb3V0ZVF1ZXJ5RnJvbUxvY2F0aW9uUXVlcnkobG9jYXRpb25RdWVyeSk7XG4gIGlmIChlbmNvZGVkUm91dGVRdWVyeSkge1xuICAgIHZhciByb3V0ZVF1ZXJ5ID0gdGhpcy5fZGVjb2RlUm91dGVRdWVyeShlbmNvZGVkUm91dGVRdWVyeSk7XG4gICAgdGhpcy5zZXRSb3V0ZVF1ZXJ5KHJvdXRlUXVlcnkpO1xuICB9XG59O1xuXG5wcm90by5fZ2V0Um91dGVRdWVyeUZyb21Mb2NhdGlvblF1ZXJ5ID0gZnVuY3Rpb24obG9jYXRpb25RdWVyeSkge1xuICByZXR1cm4gdGhpcy5nZXRRdWVyeVBhcmFtcyhsb2NhdGlvblF1ZXJ5KVsncSddO1xufTtcblxucHJvdG8uX3N0cmlwSW5pdGlhbFF1ZXJ5ID0gZnVuY3Rpb24obG9jYXRpb25RdWVyeSkge1xuICB2YXIgcHJldmlvdXNRdWVyeSA9IHRoaXMuX2dldFF1ZXJ5UG9ydGlvbihsb2NhdGlvblF1ZXJ5LCdxJyk7XG4gIGlmIChwcmV2aW91c1F1ZXJ5KSB7XG4gICAgdmFyIHByZXZpb3VzUXVlcnlMZW5ndGggPSBwcmV2aW91c1F1ZXJ5Lmxlbmd0aDtcbiAgICB2YXIgcHJldmlvdXNRdWVyeVBvc2l0aW9uID0gbG9jYXRpb25RdWVyeS5pbmRleE9mKHByZXZpb3VzUXVlcnkpO1xuICAgIHF1ZXJ5UHJlZml4ID0gXy50cmltRW5kKGxvY2F0aW9uUXVlcnkuc3Vic3RyaW5nKDAscHJldmlvdXNRdWVyeVBvc2l0aW9uKSxcIiZcIik7XG4gICAgcXVlcnlTdWZmaXggPSBsb2NhdGlvblF1ZXJ5LnN1YnN0cmluZyhwcmV2aW91c1F1ZXJ5UG9zaXRpb24rcHJldmlvdXNRdWVyeUxlbmd0aCk7XG4gICAgcXVlcnlTdWZmaXggPSAocXVlcnlQcmVmaXggIT0gXCJcIikgPyBxdWVyeVN1ZmZpeCA6IF8udHJpbVN0YXJ0KHF1ZXJ5U3VmZml4LFwiJlwiKTtcbiAgICBsb2NhdGlvblF1ZXJ5ID0gcXVlcnlQcmVmaXggKyBxdWVyeVN1ZmZpeDtcbiAgfVxuICByZXR1cm4gbG9jYXRpb25RdWVyeTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFJvdXRlclNlcnZpY2U7XG4iLCJ2YXIgT0dDX1BJWEVMX1dJRFRIID0gMC4yODtcbnZhciBPR0NfRFBJID0gMjUuNC9PR0NfUElYRUxfV0lEVEg7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICByZXNUb1NjYWxlOiBmdW5jdGlvbihyZXMsIG1ldHJpYykge1xuICAgIHZhciBtZXRyaWMgPSBtZXRyaWMgfHwgJ20nO1xuICAgIHZhciBzY2FsZTtcbiAgICBzd2l0Y2ggKG1ldHJpYykge1xuICAgICAgY2FzZSAnbSc6XG4gICAgICAgIHZhciBzY2FsZSA9IChyZXMqMTAwMCkgLyBPR0NfUElYRUxfV0lEVEg7XG4gICAgICAgIGJyZWFrXG4gICAgfVxuICAgIHJldHVybiBzY2FsZTtcbiAgfVxufTtcbiIsIlxuLyoqXG4gKiBEZWNpbWFsIGFkanVzdG1lbnQgb2YgYSBudW1iZXIuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9ICB0eXBlICBUaGUgdHlwZSBvZiBhZGp1c3RtZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9ICB2YWx1ZSBUaGUgbnVtYmVyLlxuICogQHBhcmFtIHtJbnRlZ2VyfSBleHAgICBUaGUgZXhwb25lbnQgKHRoZSAxMCBsb2dhcml0aG0gb2YgdGhlIGFkanVzdG1lbnQgYmFzZSkuXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgYWRqdXN0ZWQgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIGRlY2ltYWxBZGp1c3QodHlwZSwgdmFsdWUsIGV4cCkge1xuICAvLyBJZiB0aGUgZXhwIGlzIHVuZGVmaW5lZCBvciB6ZXJvLi4uXG4gIGlmICh0eXBlb2YgZXhwID09PSAndW5kZWZpbmVkJyB8fCArZXhwID09PSAwKSB7XG4gICAgcmV0dXJuIE1hdGhbdHlwZV0odmFsdWUpO1xuICB9XG4gIHZhbHVlID0gK3ZhbHVlO1xuICBleHAgPSArZXhwO1xuICAvLyBJZiB0aGUgdmFsdWUgaXMgbm90IGEgbnVtYmVyIG9yIHRoZSBleHAgaXMgbm90IGFuIGludGVnZXIuLi5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCAhKHR5cGVvZiBleHAgPT09ICdudW1iZXInICYmIGV4cCAlIDEgPT09IDApKSB7XG4gICAgcmV0dXJuIE5hTjtcbiAgfVxuICAvLyBTaGlmdFxuICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCkuc3BsaXQoJ2UnKTtcbiAgdmFsdWUgPSBNYXRoW3R5cGVdKCsodmFsdWVbMF0gKyAnZScgKyAodmFsdWVbMV0gPyAoK3ZhbHVlWzFdIC0gZXhwKSA6IC1leHApKSk7XG4gIC8vIFNoaWZ0IGJhY2tcbiAgdmFsdWUgPSB2YWx1ZS50b1N0cmluZygpLnNwbGl0KCdlJyk7XG4gIHJldHVybiArKHZhbHVlWzBdICsgJ2UnICsgKHZhbHVlWzFdID8gKCt2YWx1ZVsxXSArIGV4cCkgOiBleHApKTtcbn1cblxuLy8gRGVjaW1hbCByb3VuZFxuaWYgKCFNYXRoLnJvdW5kMTApIHtcbiAgTWF0aC5yb3VuZDEwID0gZnVuY3Rpb24odmFsdWUsIGV4cCkge1xuICAgIHJldHVybiBkZWNpbWFsQWRqdXN0KCdyb3VuZCcsIHZhbHVlLCBleHApO1xuICB9O1xufVxuLy8gRGVjaW1hbCBmbG9vclxuaWYgKCFNYXRoLmZsb29yMTApIHtcbiAgTWF0aC5mbG9vcjEwID0gZnVuY3Rpb24odmFsdWUsIGV4cCkge1xuICAgIHJldHVybiBkZWNpbWFsQWRqdXN0KCdmbG9vcicsIHZhbHVlLCBleHApO1xuICB9O1xufVxuLy8gRGVjaW1hbCBjZWlsXG5pZiAoIU1hdGguY2VpbDEwKSB7XG4gIE1hdGguY2VpbDEwID0gZnVuY3Rpb24odmFsdWUsIGV4cCkge1xuICAgIHJldHVybiBkZWNpbWFsQWRqdXN0KCdjZWlsJywgdmFsdWUsIGV4cCk7XG4gIH07XG59XG5cblN0cmluZy5wcm90b3R5cGUuaGFzaENvZGUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGhhc2ggPSAwLCBpLCBjaHIsIGxlbjtcbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gaGFzaDtcbiAgZm9yIChpID0gMCwgbGVuID0gdGhpcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGNociAgID0gdGhpcy5jaGFyQ29kZUF0KGkpO1xuICAgIGhhc2ggID0gKChoYXNoIDw8IDUpIC0gaGFzaCkgKyBjaHI7XG4gICAgaGFzaCB8PSAwO1xuICB9XG4gIHJldHVybiBoYXNoO1xufTtcblxudmFyIEJhc2U2NCA9IHtfa2V5U3RyOlwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLz1cIixlbmNvZGU6ZnVuY3Rpb24oZSl7dmFyIHQ9XCJcIjt2YXIgbixyLGkscyxvLHUsYTt2YXIgZj0wO2U9QmFzZTY0Ll91dGY4X2VuY29kZShlKTt3aGlsZShmPGUubGVuZ3RoKXtuPWUuY2hhckNvZGVBdChmKyspO3I9ZS5jaGFyQ29kZUF0KGYrKyk7aT1lLmNoYXJDb2RlQXQoZisrKTtzPW4+PjI7bz0obiYzKTw8NHxyPj40O3U9KHImMTUpPDwyfGk+PjY7YT1pJjYzO2lmKGlzTmFOKHIpKXt1PWE9NjR9ZWxzZSBpZihpc05hTihpKSl7YT02NH10PXQrdGhpcy5fa2V5U3RyLmNoYXJBdChzKSt0aGlzLl9rZXlTdHIuY2hhckF0KG8pK3RoaXMuX2tleVN0ci5jaGFyQXQodSkrdGhpcy5fa2V5U3RyLmNoYXJBdChhKX1yZXR1cm4gdH0sZGVjb2RlOmZ1bmN0aW9uKGUpe3ZhciB0PVwiXCI7dmFyIG4scixpO3ZhciBzLG8sdSxhO3ZhciBmPTA7ZT1lLnJlcGxhY2UoL1teQS1aYS16MC05Ky89XS9nLFwiXCIpO3doaWxlKGY8ZS5sZW5ndGgpe3M9dGhpcy5fa2V5U3RyLmluZGV4T2YoZS5jaGFyQXQoZisrKSk7bz10aGlzLl9rZXlTdHIuaW5kZXhPZihlLmNoYXJBdChmKyspKTt1PXRoaXMuX2tleVN0ci5pbmRleE9mKGUuY2hhckF0KGYrKykpO2E9dGhpcy5fa2V5U3RyLmluZGV4T2YoZS5jaGFyQXQoZisrKSk7bj1zPDwyfG8+PjQ7cj0obyYxNSk8PDR8dT4+MjtpPSh1JjMpPDw2fGE7dD10K1N0cmluZy5mcm9tQ2hhckNvZGUobik7aWYodSE9NjQpe3Q9dCtTdHJpbmcuZnJvbUNoYXJDb2RlKHIpfWlmKGEhPTY0KXt0PXQrU3RyaW5nLmZyb21DaGFyQ29kZShpKX19dD1CYXNlNjQuX3V0ZjhfZGVjb2RlKHQpO3JldHVybiB0fSxfdXRmOF9lbmNvZGU6ZnVuY3Rpb24oZSl7ZT1lLnJlcGxhY2UoL3JuL2csXCJuXCIpO3ZhciB0PVwiXCI7Zm9yKHZhciBuPTA7bjxlLmxlbmd0aDtuKyspe3ZhciByPWUuY2hhckNvZGVBdChuKTtpZihyPDEyOCl7dCs9U3RyaW5nLmZyb21DaGFyQ29kZShyKX1lbHNlIGlmKHI+MTI3JiZyPDIwNDgpe3QrPVN0cmluZy5mcm9tQ2hhckNvZGUocj4+NnwxOTIpO3QrPVN0cmluZy5mcm9tQ2hhckNvZGUociY2M3wxMjgpfWVsc2V7dCs9U3RyaW5nLmZyb21DaGFyQ29kZShyPj4xMnwyMjQpO3QrPVN0cmluZy5mcm9tQ2hhckNvZGUocj4+NiY2M3wxMjgpO3QrPVN0cmluZy5mcm9tQ2hhckNvZGUociY2M3wxMjgpfX1yZXR1cm4gdH0sX3V0ZjhfZGVjb2RlOmZ1bmN0aW9uKGUpe3ZhciB0PVwiXCI7dmFyIG49MDt2YXIgcj1jMT1jMj0wO3doaWxlKG48ZS5sZW5ndGgpe3I9ZS5jaGFyQ29kZUF0KG4pO2lmKHI8MTI4KXt0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKHIpO24rK31lbHNlIGlmKHI+MTkxJiZyPDIyNCl7YzI9ZS5jaGFyQ29kZUF0KG4rMSk7dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgociYzMSk8PDZ8YzImNjMpO24rPTJ9ZWxzZXtjMj1lLmNoYXJDb2RlQXQobisxKTtjMz1lLmNoYXJDb2RlQXQobisyKTt0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKChyJjE1KTw8MTJ8KGMyJjYzKTw8NnxjMyY2Myk7bis9M319cmV0dXJuIHR9fTtcblxuXG52YXIgdXRpbHMgPSB7XG4gIG1peGluOiBmdW5jdGlvbiBtaXhpbihkZXN0aW5hdGlvbiwgc291cmNlKSB7XG4gICAgICByZXR1cm4gdXRpbHMubWVyZ2UoZGVzdGluYXRpb24ucHJvdG90eXBlLCBzb3VyY2UpO1xuICB9LFxuICBcbiAgbWl4aW5pbnN0YW5jZTogZnVuY3Rpb24gbWl4aW5pbnN0YW5jZShkZXN0aW5hdGlvbixzb3VyY2Upe1xuICAgICAgdmFyIHNvdXJjZUluc3RhbmNlID0gbmV3IHNvdXJjZTtcbiAgICAgIHV0aWxzLm1lcmdlKGRlc3RpbmF0aW9uLCBzb3VyY2VJbnN0YW5jZSk7XG4gICAgICB1dGlscy5tZXJnZShkZXN0aW5hdGlvbi5wcm90b3R5cGUsIHNvdXJjZS5wcm90b3R5cGUpO1xuICB9LFxuXG5cbiAgbWVyZ2U6IGZ1bmN0aW9uIG1lcmdlKGRlc3RpbmF0aW9uLCBzb3VyY2UpIHtcbiAgICAgIHZhciBrZXk7XG5cbiAgICAgIGZvciAoa2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgIGlmICh1dGlscy5oYXNPd24oc291cmNlLCBrZXkpKSB7XG4gICAgICAgICAgICAgIGRlc3RpbmF0aW9uW2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgICAgICB9XG4gICAgICB9XG4gIH0sXG5cbiAgaGFzT3duOiBmdW5jdGlvbiBoYXNPd24ob2JqZWN0LCBrZXkpIHtcbiAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBrZXkpO1xuICB9LFxuICBcbiAgaW5oZXJpdDpmdW5jdGlvbihjaGlsZEN0b3IsIHBhcmVudEN0b3IpIHtcbiAgICBmdW5jdGlvbiB0ZW1wQ3RvcigpIHt9O1xuICAgIHRlbXBDdG9yLnByb3RvdHlwZSA9IHBhcmVudEN0b3IucHJvdG90eXBlO1xuICAgIGNoaWxkQ3Rvci5zdXBlckNsYXNzXyA9IHBhcmVudEN0b3IucHJvdG90eXBlO1xuICAgIGNoaWxkQ3Rvci5wcm90b3R5cGUgPSBuZXcgdGVtcEN0b3IoKTtcbiAgICBjaGlsZEN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY2hpbGRDdG9yO1xuICB9LFxuICBcbiAgYmFzZTogZnVuY3Rpb24obWUsIG9wdF9tZXRob2ROYW1lLCB2YXJfYXJncykge1xuICAgIHZhciBjYWxsZXIgPSBhcmd1bWVudHMuY2FsbGVlLmNhbGxlcjtcbiAgICBpZiAoY2FsbGVyLnN1cGVyQ2xhc3NfKSB7XG4gICAgICAvLyBUaGlzIGlzIGEgY29uc3RydWN0b3IuIENhbGwgdGhlIHN1cGVyY2xhc3MgY29uc3RydWN0b3IuXG4gICAgICByZXR1cm4gY2FsbGVyLnN1cGVyQ2xhc3NfLmNvbnN0cnVjdG9yLmFwcGx5KFxuICAgICAgICAgIG1lLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICB9XG5cbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIGZvdW5kQ2FsbGVyID0gZmFsc2U7XG4gICAgZm9yICh2YXIgY3RvciA9IG1lLmNvbnN0cnVjdG9yO1xuICAgICAgICAgY3RvcjsgY3RvciA9IGN0b3Iuc3VwZXJDbGFzc18gJiYgY3Rvci5zdXBlckNsYXNzXy5jb25zdHJ1Y3Rvcikge1xuICAgICAgaWYgKGN0b3IucHJvdG90eXBlW29wdF9tZXRob2ROYW1lXSA9PT0gY2FsbGVyKSB7XG4gICAgICAgIGZvdW5kQ2FsbGVyID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZm91bmRDYWxsZXIpIHtcbiAgICAgICAgcmV0dXJuIGN0b3IucHJvdG90eXBlW29wdF9tZXRob2ROYW1lXS5hcHBseShtZSwgYXJncyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgd2UgZGlkIG5vdCBmaW5kIHRoZSBjYWxsZXIgaW4gdGhlIHByb3RvdHlwZSBjaGFpbixcbiAgICAvLyB0aGVuIG9uZSBvZiB0d28gdGhpbmdzIGhhcHBlbmVkOlxuICAgIC8vIDEpIFRoZSBjYWxsZXIgaXMgYW4gaW5zdGFuY2UgbWV0aG9kLlxuICAgIC8vIDIpIFRoaXMgbWV0aG9kIHdhcyBub3QgY2FsbGVkIGJ5IHRoZSByaWdodCBjYWxsZXIuXG4gICAgaWYgKG1lW29wdF9tZXRob2ROYW1lXSA9PT0gY2FsbGVyKSB7XG4gICAgICByZXR1cm4gbWUuY29uc3RydWN0b3IucHJvdG90eXBlW29wdF9tZXRob2ROYW1lXS5hcHBseShtZSwgYXJncyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICAgICdiYXNlIGNhbGxlZCBmcm9tIGEgbWV0aG9kIG9mIG9uZSBuYW1lICcgK1xuICAgICAgICAgICd0byBhIG1ldGhvZCBvZiBhIGRpZmZlcmVudCBuYW1lJyk7XG4gICAgfVxuICB9LFxuICBcbiAgbm9vcDogZnVuY3Rpb24oKXt9LFxuICBcbiAgdHJ1ZWZuYzogZnVuY3Rpb24oKXtyZXR1cm4gdHJ1ZX0sXG4gIFxuICBmYWxzZWZuYzogZnVuY3Rpb24oKXtyZXR1cm4gdHJ1ZX0sXG4gIFxuICByZXNvbHZlOiBmdW5jdGlvbih2YWx1ZSl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIGRlZmVycmVkLnJlc29sdmUodmFsdWUpO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH0sXG4gIFxuICByZWplY3Q6IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgZGVmZXJyZWQucmVqZWN0KHZhbHVlKTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9LFxuICBcbiAgQmFzZTY0OiBCYXNlNjRcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbHM7XG4iLCJ2YXIgQ29udHJvbCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuICB2YXIgbmFtZSA9IG9wdGlvbnMubmFtZSB8fCBcIj9cIjtcbiAgdGhpcy5uYW1lID0gbmFtZS5zcGxpdCgnICcpLmpvaW4oJy0nKS50b0xvd2VyQ2FzZSgpO1xuICB0aGlzLmlkID0gdGhpcy5uYW1lKydfJysoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwMCkpO1xuICBcbiAgdGhpcy5wb3NpdGlvbkNvZGUgPSBvcHRpb25zLnBvc2l0aW9uIHx8ICd0bCc7XG4gIFxuICBcbiAgaWYgKCFvcHRpb25zLmVsZW1lbnQpIHtcbiAgICB2YXIgY2xhc3NOYW1lID0gXCJvbC1cIit0aGlzLm5hbWUuc3BsaXQoJyAnKS5qb2luKCctJykudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgdGlwTGFiZWwgPSBvcHRpb25zLnRpcExhYmVsIHx8IHRoaXMubmFtZTtcbiAgICB2YXIgbGFiZWwgPSBvcHRpb25zLmxhYmVsIHx8IFwiP1wiO1xuICAgIFxuICAgIG9wdGlvbnMuZWxlbWVudCA9ICQoJzxkaXYgY2xhc3M9XCInK2NsYXNzTmFtZSsnIG9sLXVuc2VsZWN0YWJsZSBvbC1jb250cm9sXCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdGl0bGU9XCInK3RpcExhYmVsKydcIj4nK2xhYmVsKyc8L2J1dHRvbj48L2Rpdj4nKVswXTtcbiAgfVxuICBcbiAgJChvcHRpb25zLmVsZW1lbnQpLmFkZENsYXNzKFwib2wtY29udHJvbC1cIit0aGlzLnBvc2l0aW9uQ29kZSk7XG4gIFxuICB2YXIgYnV0dG9uQ2xpY2tIYW5kbGVyID0gb3B0aW9ucy5idXR0b25DbGlja0hhbmRsZXIgfHwgQ29udHJvbC5wcm90b3R5cGUuX2hhbmRsZUNsaWNrLmJpbmQodGhpcyk7XG4gIFxuICAkKG9wdGlvbnMuZWxlbWVudCkub24oJ2NsaWNrJyxidXR0b25DbGlja0hhbmRsZXIpO1xuICBcbiAgb2wuY29udHJvbC5Db250cm9sLmNhbGwodGhpcyxvcHRpb25zKTtcbiAgXG4gIHRoaXMuX3Bvc3RSZW5kZXIoKTtcbn1cbm9sLmluaGVyaXRzKENvbnRyb2wsIG9sLmNvbnRyb2wuQ29udHJvbCk7XG5cbnZhciBwcm90byA9IENvbnRyb2wucHJvdG90eXBlO1xuXG5wcm90by5nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uKHBvc2l0aW9uQ29kZSkge1xuICB2YXIgcG9zaXRpb25Db2RlID0gcG9zaXRpb25Db2RlIHx8IHRoaXMucG9zaXRpb25Db2RlO1xuICB2YXIgcG9zaXRpb24gPSB7fTtcbiAgcG9zaXRpb25bJ3RvcCddID0gKHBvc2l0aW9uQ29kZS5pbmRleE9mKCd0JykgPiAtMSkgPyB0cnVlIDogZmFsc2U7XG4gIHBvc2l0aW9uWydsZWZ0J10gPSAocG9zaXRpb25Db2RlLmluZGV4T2YoJ2wnKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgcmV0dXJuIHBvc2l0aW9uO1xufTtcblxucHJvdG8uX2hhbmRsZUNsaWNrID0gZnVuY3Rpb24oKXtcbiAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgbWFwID0gdGhpcy5nZXRNYXAoKTtcbiAgXG4gIHZhciByZXNldENvbnRyb2wgPSBudWxsO1xuICAvLyByZW1vdmUgYWxsIHRoZSBvdGhlciwgZXZlbnR1YWxseSB0b2dnbGVkLCBpbnRlcmFjdGlvbmNvbnRyb2xzXG4gIHZhciBjb250cm9scyA9IG1hcC5nZXRDb250cm9scygpO1xuICBjb250cm9scy5mb3JFYWNoKGZ1bmN0aW9uKGNvbnRyb2wpe1xuICAgIGlmKGNvbnRyb2wuaWQgJiYgY29udHJvbC50b2dnbGUgJiYgKGNvbnRyb2wuaWQgIT0gc2VsZi5pZCkpIHtcbiAgICAgIGNvbnRyb2wudG9nZ2xlKGZhbHNlKTtcbiAgICAgIGlmIChjb250cm9sLm5hbWUgPT0gJ3Jlc2V0Jykge1xuICAgICAgICByZXNldENvbnRyb2wgPSBjb250cm9sO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIGlmICghc2VsZi5fdG9nZ2xlZCAmJiByZXNldENvbnRyb2wpIHtcbiAgICByZXNldENvbnRyb2wudG9nZ2xlKHRydWUpO1xuICB9XG59O1xuXG5wcm90by5zZXRNYXAgPSBmdW5jdGlvbihtYXApe1xuICB2YXIgcG9zaXRpb24gPSAgdGhpcy5nZXRQb3NpdGlvbigpO1xuICB2YXIgdmlld1BvcnQgPSBtYXAuZ2V0Vmlld3BvcnQoKTtcbiAgdmFyIHByZXZpdXNDb250cm9scyA9ICQodmlld1BvcnQpLmZpbmQoJy5vbC1jb250cm9sLScrdGhpcy5wb3NpdGlvbkNvZGUpO1xuICBpZiAocHJldml1c0NvbnRyb2xzLmxlbmd0aCkge1xuICAgIHByZXZpdXNDb250cm9sID0gcHJldml1c0NvbnRyb2xzLmxhc3QoKTtcbiAgICB2YXIgcHJldmlvdXNPZmZzZXQgPSBwb3NpdGlvbi5sZWZ0ID8gcHJldml1c0NvbnRyb2wucG9zaXRpb24oKS5sZWZ0IDogcHJldml1c0NvbnRyb2wucG9zaXRpb24oKS5yaWdodDtcbiAgICB2YXIgaFdoZXJlID0gcG9zaXRpb24ubGVmdCA/ICdsZWZ0JyA6ICdyaWdodCc7XG4gICAgdmFyIHByZXZpb3VzV2lkdGggPSBwcmV2aXVzQ29udHJvbFswXS5vZmZzZXRXaWR0aDtcbiAgICB2YXIgaE9mZnNldCA9ICQodGhpcy5lbGVtZW50KS5wb3NpdGlvbigpW2hXaGVyZV0gKyBwcmV2aW91c09mZnNldCArIHByZXZpb3VzV2lkdGggKyAyO1xuICAgICQodGhpcy5lbGVtZW50KS5jc3MoaFdoZXJlLGhPZmZzZXQrJ3B4Jyk7XG4gIH1cbiAgXG4gIG9sLmNvbnRyb2wuQ29udHJvbC5wcm90b3R5cGUuc2V0TWFwLmNhbGwodGhpcyxtYXApO1xufTtcblxucHJvdG8uX3Bvc3RSZW5kZXIgPSBmdW5jdGlvbigpIHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2w7XG4iLCJ2YXIgQ29udHJvbCA9IHJlcXVpcmUoJy4vY29udHJvbCcpO1xuXG52YXIgSW50ZXJhY3Rpb25Db250cm9sID0gZnVuY3Rpb24ob3B0aW9ucyl7XG4gIHRoaXMuX3RvZ2dsZWQgPSB0aGlzLl90b2dnbGVkIHx8IGZhbHNlO1xuICB0aGlzLl9pbnRlcmFjdGlvbkNsYXNzID0gb3B0aW9ucy5pbnRlcmFjdGlvbkNsYXNzIHx8IG51bGw7XG4gIHRoaXMuX2ludGVyYWN0aW9uID0gbnVsbDtcbiAgdGhpcy5fYXV0b3VudG9nZ2xlID0gb3B0aW9ucy5hdXRvdW50b2dnbGUgfHwgZmFsc2U7XG5cbiAgXG4gIG9wdGlvbnMuYnV0dG9uQ2xpY2tIYW5kbGVyID0gSW50ZXJhY3Rpb25Db250cm9sLnByb3RvdHlwZS5faGFuZGxlQ2xpY2suYmluZCh0aGlzKTtcbiAgXG4gIENvbnRyb2wuY2FsbCh0aGlzLG9wdGlvbnMpO1xufTtcbm9sLmluaGVyaXRzKEludGVyYWN0aW9uQ29udHJvbCwgQ29udHJvbCk7XG5cbnZhciBwcm90byA9IEludGVyYWN0aW9uQ29udHJvbC5wcm90b3R5cGU7XG5cbnByb3RvLnRvZ2dsZSA9IGZ1bmN0aW9uKHRvZ2dsZSl7XG4gIHZhciB0b2dnbGUgPSB0b2dnbGUgIT09IHVuZGVmaW5lZCA/IHRvZ2dsZSA6ICF0aGlzLl90b2dnbGVkXG4gIHRoaXMuX3RvZ2dsZWQgPSB0b2dnbGU7XG4gIHZhciBtYXAgPSB0aGlzLmdldE1hcCgpO1xuICB2YXIgY29udHJvbEJ1dHRvbiA9ICQodGhpcy5lbGVtZW50KS5maW5kKCdidXR0b24nKS5maXJzdCgpO1xuICBcbiAgaWYgKHRvZ2dsZSkge1xuICAgIGlmICh0aGlzLl9pbnRlcmFjdGlvbikge1xuICAgICAgLy9tYXAuYWRkSW50ZXJhY3Rpb24odGhpcy5faW50ZXJhY3Rpb24pO1xuICAgICAgdGhpcy5faW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICAgIH1cbiAgICBjb250cm9sQnV0dG9uLmFkZENsYXNzKCdnM3ctb2wtdG9nZ2xlZCcpO1xuICB9XG4gIGVsc2Uge1xuICAgIGlmICh0aGlzLl9pbnRlcmFjdGlvbikge1xuICAgICAgLy9tYXAucmVtb3ZlSW50ZXJhY3Rpb24odGhpcy5faW50ZXJhY3Rpb24pO1xuICAgICAgdGhpcy5faW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB9XG4gICAgY29udHJvbEJ1dHRvbi5yZW1vdmVDbGFzcygnZzN3LW9sLXRvZ2dsZWQnKTtcbiAgfVxufTtcblxucHJvdG8uc2V0TWFwID0gZnVuY3Rpb24obWFwKSB7XG4gIGlmICghdGhpcy5faW50ZXJhY3Rpb24pIHtcbiAgICB0aGlzLl9pbnRlcmFjdGlvbiA9IG5ldyB0aGlzLl9pbnRlcmFjdGlvbkNsYXNzO1xuICAgIG1hcC5hZGRJbnRlcmFjdGlvbih0aGlzLl9pbnRlcmFjdGlvbik7XG4gICAgdGhpcy5faW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgfVxuICBDb250cm9sLnByb3RvdHlwZS5zZXRNYXAuY2FsbCh0aGlzLG1hcCk7XG59O1xuXG5wcm90by5faGFuZGxlQ2xpY2sgPSBmdW5jdGlvbihlKXtcbiAgdGhpcy50b2dnbGUoKTtcbiAgQ29udHJvbC5wcm90b3R5cGUuX2hhbmRsZUNsaWNrLmNhbGwodGhpcyxlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSW50ZXJhY3Rpb25Db250cm9sO1xuIiwidmFyIE9MQ29udHJvbCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuICB0aGlzLl9jb250cm9sID0gbnVsbDtcbiAgXG4gIHRoaXMucG9zaXRpb25Db2RlID0gb3B0aW9ucy5wb3NpdGlvbiB8fCAndGwnO1xuICBcbiAgc3dpdGNoIChvcHRpb25zLnR5cGUpIHtcbiAgICBjYXNlICd6b29tJzpcbiAgICAgIHRoaXMuX2NvbnRyb2wgPSBuZXcgb2wuY29udHJvbC5ab29tKG9wdGlvbnMpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnc2NhbGVsaW5lJzpcbiAgICAgIHRoaXMuX2NvbnRyb2wgPSBuZXcgb2wuY29udHJvbC5TY2FsZUxpbmUob3B0aW9ucyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdvdmVydmlldyc6XG4gICAgICB0aGlzLl9jb250cm9sID0gbmV3IG9sLmNvbnRyb2wuT3ZlcnZpZXdNYXAob3B0aW9ucyk7XG4gIH1cbiAgXG4gICQodGhpcy5fY29udHJvbC5lbGVtZW50KS5hZGRDbGFzcyhcIm9sLWNvbnRyb2wtXCIrdGhpcy5wb3NpdGlvbkNvZGUpO1xuICBcbiAgb2wuY29udHJvbC5Db250cm9sLmNhbGwodGhpcyx7XG4gICAgZWxlbWVudDogdGhpcy5fY29udHJvbC5lbGVtZW50XG4gIH0pO1xufVxub2wuaW5oZXJpdHMoT0xDb250cm9sLCBvbC5jb250cm9sLkNvbnRyb2wpO1xubW9kdWxlLmV4cG9ydHMgPSBPTENvbnRyb2w7XG5cbnZhciBwcm90byA9IE9MQ29udHJvbC5wcm90b3R5cGU7XG5cbnByb3RvLmdldFBvc2l0aW9uID0gZnVuY3Rpb24ocG9zaXRpb25Db2RlKSB7XG4gIHZhciBwb3NpdGlvbkNvZGUgPSBwb3NpdGlvbkNvZGUgfHwgdGhpcy5wb3NpdGlvbkNvZGU7XG4gIHZhciBwb3NpdGlvbiA9IHt9O1xuICBwb3NpdGlvblsndG9wJ10gPSAocG9zaXRpb25Db2RlLmluZGV4T2YoJ3QnKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgcG9zaXRpb25bJ2xlZnQnXSA9IChwb3NpdGlvbkNvZGUuaW5kZXhPZignbCcpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xuICByZXR1cm4gcG9zaXRpb247XG59O1xuXG5wcm90by5zZXRNYXAgPSBmdW5jdGlvbihtYXApe1xuICB2YXIgcG9zaXRpb24gPSAgdGhpcy5nZXRQb3NpdGlvbigpO1xuICB2YXIgdmlld1BvcnQgPSBtYXAuZ2V0Vmlld3BvcnQoKTtcbiAgdmFyIHByZXZpdXNDb250cm9scyA9ICQodmlld1BvcnQpLmZpbmQoJy5vbC1jb250cm9sLScrdGhpcy5wb3NpdGlvbkNvZGUpO1xuICBpZiAocHJldml1c0NvbnRyb2xzLmxlbmd0aCkge1xuICAgIHByZXZpdXNDb250cm9sID0gcHJldml1c0NvbnRyb2xzLmxhc3QoKTtcbiAgICB2YXIgcHJldmlvdXNPZmZzZXQgPSBwb3NpdGlvbi5sZWZ0ID8gcHJldml1c0NvbnRyb2wucG9zaXRpb24oKS5sZWZ0IDogcHJldml1c0NvbnRyb2wucG9zaXRpb24oKS5yaWdodDtcbiAgICB2YXIgaFdoZXJlID0gcG9zaXRpb24ubGVmdCA/ICdsZWZ0JyA6ICdyaWdodCc7XG4gICAgdmFyIHByZXZpb3VzV2lkdGggPSBwcmV2aXVzQ29udHJvbFswXS5vZmZzZXRXaWR0aDsgICAgXG4gICAgdmFyIGhPZmZzZXQgPSAkKHRoaXMuZWxlbWVudCkucG9zaXRpb24oKVtoV2hlcmVdICsgcHJldmlvdXNPZmZzZXQgKyBwcmV2aW91c1dpZHRoICsgMjtcbiAgICAkKHRoaXMuZWxlbWVudCkuY3NzKGhXaGVyZSxoT2Zmc2V0KydweCcpO1xuICB9XG4gIFxuICB0aGlzLl9jb250cm9sLnNldE1hcChtYXApO1xufTtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG52YXIgSW50ZXJhY3Rpb25Db250cm9sID0gcmVxdWlyZSgnLi9pbnRlcmFjdGlvbmNvbnRyb2wnKTtcblxudmFyIFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uID0gcmVxdWlyZSgnLi4vaW50ZXJhY3Rpb25zL3BpY2tjb29yZGluYXRlc2ludGVyYWN0aW9uJyk7XG5cbnZhciBRdWVyeUNvbnRyb2wgPSBmdW5jdGlvbihvcHRpb25zKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgX29wdGlvbnMgPSB7XG4gICAgbmFtZTogXCJxdWVyeWxheWVyXCIsXG4gICAgdGlwTGFiZWw6IFwiUXVlcnkgbGF5ZXJcIixcbiAgICBsYWJlbDogXCJcXHVlYTBmXCIsXG4gICAgaW50ZXJhY3Rpb25DbGFzczogUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb25cbiAgfTtcbiAgXG4gIG9wdGlvbnMgPSB1dGlscy5tZXJnZShvcHRpb25zLF9vcHRpb25zKTtcbiAgXG4gIEludGVyYWN0aW9uQ29udHJvbC5jYWxsKHRoaXMsb3B0aW9ucyk7XG59XG5vbC5pbmhlcml0cyhRdWVyeUNvbnRyb2wsIEludGVyYWN0aW9uQ29udHJvbCk7XG5cbnZhciBwcm90byA9IFF1ZXJ5Q29udHJvbC5wcm90b3R5cGU7XG5cbnByb3RvLnNldE1hcCA9IGZ1bmN0aW9uKG1hcCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIEludGVyYWN0aW9uQ29udHJvbC5wcm90b3R5cGUuc2V0TWFwLmNhbGwodGhpcyxtYXApO1xuICB0aGlzLl9pbnRlcmFjdGlvbi5vbignYm94c3RhcnQnLGZ1bmN0aW9uKGUpe1xuICAgIHNlbGYuX3N0YXJ0Q29vcmRpbmF0ZSA9IGUuY29vcmRpbmF0ZTtcbiAgfSk7XG4gIFxuICB0aGlzLl9pbnRlcmFjdGlvbi5vbigncGlja2VkJyxmdW5jdGlvbihlKXtcbiAgICBzZWxmLmRpc3BhdGNoRXZlbnQoe1xuICAgICAgdHlwZTogJ3BpY2tlZCcsXG4gICAgICBjb29yZGluYXRlczogZS5jb29yZGluYXRlXG4gICAgfSk7XG4gICAgaWYgKHNlbGYuX2F1dG91bnRvZ2dsZSkge1xuICAgICAgc2VsZi50b2dnbGUoKTtcbiAgICB9XG4gIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBRdWVyeUNvbnRyb2w7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xudmFyIEludGVyYWN0aW9uQ29udHJvbCA9IHJlcXVpcmUoJy4vaW50ZXJhY3Rpb25jb250cm9sJyk7XG5cbnZhciBSZXNldENvbnRyb2wgPSBmdW5jdGlvbihvcHRpb25zKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl90b2dnbGVkID0gdHJ1ZTtcbiAgdGhpcy5fc3RhcnRDb29yZGluYXRlID0gbnVsbDtcbiAgdmFyIF9vcHRpb25zID0ge1xuICAgICAgbmFtZTogXCJyZXNldFwiLFxuICAgICAgdGlwTGFiZWw6IFwiUGFuXCIsXG4gICAgICBsYWJlbDogXCJcXHVlOTAxXCIsXG4gICAgfTtcbiAgXG4gIG9wdGlvbnMgPSB1dGlscy5tZXJnZShvcHRpb25zLF9vcHRpb25zKTtcbiAgXG4gIEludGVyYWN0aW9uQ29udHJvbC5jYWxsKHRoaXMsb3B0aW9ucyk7XG59XG5vbC5pbmhlcml0cyhSZXNldENvbnRyb2wsIEludGVyYWN0aW9uQ29udHJvbCk7XG5tb2R1bGUuZXhwb3J0cyA9IFJlc2V0Q29udHJvbDtcblxudmFyIHByb3RvID0gUmVzZXRDb250cm9sLnByb3RvdHlwZTtcblxucHJvdG8uX3Bvc3RSZW5kZXIgPSBmdW5jdGlvbigpe1xuICB0aGlzLnRvZ2dsZSh0cnVlKTtcbn07XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xudmFyIEludGVyYWN0aW9uQ29udHJvbCA9IHJlcXVpcmUoJy4vaW50ZXJhY3Rpb25jb250cm9sJyk7XG5cbnZhciBab29tQm94Q29udHJvbCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX3N0YXJ0Q29vcmRpbmF0ZSA9IG51bGw7XG4gIHZhciBfb3B0aW9ucyA9IHtcbiAgICAgIG5hbWU6IFwiem9vbWJveFwiLFxuICAgICAgdGlwTGFiZWw6IFwiWm9vbSB0byBib3hcIixcbiAgICAgIGxhYmVsOiBcIlxcdWU5MDBcIixcbiAgICAgIGludGVyYWN0aW9uQ2xhc3M6IG9sLmludGVyYWN0aW9uLkRyYWdCb3hcbiAgICB9O1xuICBcbiAgb3B0aW9ucyA9IHV0aWxzLm1lcmdlKG9wdGlvbnMsX29wdGlvbnMpO1xuICBcbiAgSW50ZXJhY3Rpb25Db250cm9sLmNhbGwodGhpcyxvcHRpb25zKTtcbn1cbm9sLmluaGVyaXRzKFpvb21Cb3hDb250cm9sLCBJbnRlcmFjdGlvbkNvbnRyb2wpO1xubW9kdWxlLmV4cG9ydHMgPSBab29tQm94Q29udHJvbDtcblxudmFyIHByb3RvID0gWm9vbUJveENvbnRyb2wucHJvdG90eXBlO1xuXG5wcm90by5zZXRNYXAgPSBmdW5jdGlvbihtYXApIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBJbnRlcmFjdGlvbkNvbnRyb2wucHJvdG90eXBlLnNldE1hcC5jYWxsKHRoaXMsbWFwKTtcbiAgdGhpcy5faW50ZXJhY3Rpb24ub24oJ2JveHN0YXJ0JyxmdW5jdGlvbihlKXtcbiAgICBzZWxmLl9zdGFydENvb3JkaW5hdGUgPSBlLmNvb3JkaW5hdGU7XG4gIH0pO1xuICBcbiAgdGhpcy5faW50ZXJhY3Rpb24ub24oJ2JveGVuZCcsZnVuY3Rpb24oZSl7XG4gICAgdmFyIHN0YXJ0X2Nvb3JkaW5hdGUgPSBzZWxmLl9zdGFydENvb3JkaW5hdGU7XG4gICAgdmFyIGVuZF9jb29yZGluYXRlID0gZS5jb29yZGluYXRlO1xuICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYm91bmRpbmdFeHRlbnQoW3N0YXJ0X2Nvb3JkaW5hdGUsZW5kX2Nvb3JkaW5hdGVdKTtcbiAgICBzZWxmLmRpc3BhdGNoRXZlbnQoe1xuICAgICAgdHlwZTogJ3pvb21lbmQnLFxuICAgICAgZXh0ZW50OiBleHRlbnRcbiAgICB9KTtcbiAgICBzZWxmLl9zdGFydENvb3JkaW5hdGUgPSBudWxsO1xuICAgIGlmIChzZWxmLl9hdXRvdW50b2dnbGUpIHtcbiAgICAgIHNlbGYudG9nZ2xlKCk7XG4gICAgfVxuICB9KVxufTtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBtYXBoZWxwZXJzID0gcmVxdWlyZSgnLi9tYXAvbWFwaGVscGVycycpO1xuXG4oZnVuY3Rpb24gKG5hbWUsIHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShmYWN0b3J5KTtcbiAgfVxuICBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfVxuICBlbHNlIHtcbiAgICByb290W25hbWVdID0gZmFjdG9yeSgpO1xuICB9XG59KSgnZzN3b2wzJywgdGhpcywgZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG4gIFxuICB2YXIgaGVscGVycyA9IHV0aWxzLm1lcmdlKHt9LG1hcGhlbHBlcnMpO1xuICBcbiAgcmV0dXJuIHtcbiAgICBoZWxwZXJzOiBoZWxwZXJzXG4gIH1cbn0pO1xuIiwidmFyIERlbGV0ZUludGVyYWN0aW9uRXZlbnQgPSBmdW5jdGlvbih0eXBlLCBmZWF0dXJlcywgY29vcmRpbmF0ZSkge1xuXG4gIHRoaXMudHlwZSA9IHR5cGU7XG4gIHRoaXMuZmVhdHVyZXMgPSBmZWF0dXJlcztcbiAgdGhpcy5jb29yZGluYXRlID0gY29vcmRpbmF0ZTtcbn07XG5cbnZhciBEZWxldGVJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgb2wuaW50ZXJhY3Rpb24uUG9pbnRlci5jYWxsKHRoaXMsIHtcbiAgICBoYW5kbGVEb3duRXZlbnQ6IERlbGV0ZUludGVyYWN0aW9uLmhhbmRsZURvd25FdmVudF8sXG4gICAgaGFuZGxlTW92ZUV2ZW50OiBEZWxldGVJbnRlcmFjdGlvbi5oYW5kbGVNb3ZlRXZlbnRfLFxuICAgIGhhbmRsZVVwRXZlbnQ6IERlbGV0ZUludGVyYWN0aW9uLmhhbmRsZVVwRXZlbnRfLFxuICAgIGhhbmRsZUV2ZW50OiBEZWxldGVJbnRlcmFjdGlvbi5oYW5kbGVFdmVudF8sXG4gIH0pO1xuXG4gIHRoaXMucHJldmlvdXNDdXJzb3JfID0gdW5kZWZpbmVkO1xuICB0aGlzLmxhc3RDb29yZGluYXRlXyA9IG51bGw7XG4gIHRoaXMuZmVhdHVyZXNfID0gb3B0aW9ucy5mZWF0dXJlcyAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5mZWF0dXJlcyA6IG51bGw7XG59O1xub2wuaW5oZXJpdHMoRGVsZXRlSW50ZXJhY3Rpb24sIG9sLmludGVyYWN0aW9uLlBvaW50ZXIpO1xuXG5EZWxldGVJbnRlcmFjdGlvbi5oYW5kbGVFdmVudF8gPSBmdW5jdGlvbihtYXBCcm93c2VyRXZlbnQpIHtcbiAgaWYgKG1hcEJyb3dzZXJFdmVudC50eXBlID09ICdrZXlkb3duJyl7XG4gICAgaWYodGhpcy5mZWF0dXJlc18uZ2V0QXJyYXkoKS5sZW5ndGggJiYgbWFwQnJvd3NlckV2ZW50Lm9yaWdpbmFsRXZlbnQua2V5Q29kZSA9PSA0Nil7XG4gICAgICB0aGlzLmRpc3BhdGNoRXZlbnQoXG4gICAgICAgICAgbmV3IERlbGV0ZUludGVyYWN0aW9uRXZlbnQoXG4gICAgICAgICAgICAgICdkZWxldGVlbmQnLCB0aGlzLmZlYXR1cmVzXyxcbiAgICAgICAgICAgICAgZXZlbnQuY29vcmRpbmF0ZSkpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIGVsc2V7XG4gICAgcmV0dXJuIG9sLmludGVyYWN0aW9uLlBvaW50ZXIuaGFuZGxlRXZlbnQuY2FsbCh0aGlzLG1hcEJyb3dzZXJFdmVudCk7XG4gIH1cbn07XG5cbkRlbGV0ZUludGVyYWN0aW9uLmhhbmRsZURvd25FdmVudF8gPSBmdW5jdGlvbihldmVudCkge1xuICB0aGlzLmxhc3RGZWF0dXJlXyA9IHRoaXMuZmVhdHVyZXNBdFBpeGVsXyhldmVudC5waXhlbCwgZXZlbnQubWFwKTtcbiAgaWYgKHRoaXMubGFzdEZlYXR1cmVfKSB7XG4gICAgRGVsZXRlSW50ZXJhY3Rpb24uaGFuZGxlTW92ZUV2ZW50Xy5jYWxsKHRoaXMsIGV2ZW50KTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoXG4gICAgICAgICAgICBuZXcgRGVsZXRlSW50ZXJhY3Rpb25FdmVudChcbiAgICAgICAgICAgICAgICAnZGVsZXRlZW5kJywgdGhpcy5mZWF0dXJlc18sXG4gICAgICAgICAgICAgICAgZXZlbnQuY29vcmRpbmF0ZSkpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbkRlbGV0ZUludGVyYWN0aW9uLmhhbmRsZU1vdmVFdmVudF8gPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgZWxlbSA9IGV2ZW50Lm1hcC5nZXRUYXJnZXRFbGVtZW50KCk7XG4gIHZhciBpbnRlcnNlY3RpbmdGZWF0dXJlID0gZXZlbnQubWFwLmZvckVhY2hGZWF0dXJlQXRQaXhlbChldmVudC5waXhlbCxcbiAgICAgIGZ1bmN0aW9uKGZlYXR1cmUpIHtcbiAgICAgICAgcmV0dXJuIGZlYXR1cmU7XG4gICAgICB9KTtcblxuICBpZiAoaW50ZXJzZWN0aW5nRmVhdHVyZSkge1xuICAgIHRoaXMucHJldmlvdXNDdXJzb3JfID0gZWxlbS5zdHlsZS5jdXJzb3I7XG5cbiAgICBlbGVtLnN0eWxlLmN1cnNvciA9ICAncG9pbnRlcic7XG5cbiAgfSBlbHNlIHtcbiAgICBlbGVtLnN0eWxlLmN1cnNvciA9IHRoaXMucHJldmlvdXNDdXJzb3JfICE9PSB1bmRlZmluZWQgP1xuICAgICAgICB0aGlzLnByZXZpb3VzQ3Vyc29yXyA6ICcnO1xuICAgIHRoaXMucHJldmlvdXNDdXJzb3JfID0gdW5kZWZpbmVkO1xuICB9XG59O1xuXG5EZWxldGVJbnRlcmFjdGlvbi5wcm90b3R5cGUuZmVhdHVyZXNBdFBpeGVsXyA9IGZ1bmN0aW9uKHBpeGVsLCBtYXApIHtcbiAgdmFyIGZvdW5kID0gbnVsbDtcblxuICB2YXIgaW50ZXJzZWN0aW5nRmVhdHVyZSA9IG1hcC5mb3JFYWNoRmVhdHVyZUF0UGl4ZWwocGl4ZWwsXG4gICAgICBmdW5jdGlvbihmZWF0dXJlKSB7XG4gICAgICAgIHJldHVybiBmZWF0dXJlO1xuICAgICAgfSk7XG5cbiAgaWYgKHRoaXMuZmVhdHVyZXNfICYmXG4gICAgIF8uaW5jbHVkZXModGhpcy5mZWF0dXJlc18uZ2V0QXJyYXkoKSwgaW50ZXJzZWN0aW5nRmVhdHVyZSkpIHtcbiAgICBmb3VuZCA9IGludGVyc2VjdGluZ0ZlYXR1cmU7XG4gIH1cblxuICByZXR1cm4gZm91bmQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERlbGV0ZUludGVyYWN0aW9uO1xuIiwidmFyIFBpY2tDb29yZGluYXRlc0V2ZW50VHlwZSA9IHtcbiAgUElDS0VEOiAncGlja2VkJ1xufTtcblxudmFyIFBpY2tDb29yZGluYXRlc0V2ZW50ID0gZnVuY3Rpb24odHlwZSwgY29vcmRpbmF0ZSkge1xuICB0aGlzLnR5cGUgPSB0eXBlO1xuICB0aGlzLmNvb3JkaW5hdGUgPSBjb29yZGluYXRlO1xufTtcblxudmFyIFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICB0aGlzLnByZXZpb3VzQ3Vyc29yXyA9IG51bGw7XG4gIFxuICBvbC5pbnRlcmFjdGlvbi5Qb2ludGVyLmNhbGwodGhpcywge1xuICAgIGhhbmRsZURvd25FdmVudDogUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24uaGFuZGxlRG93bkV2ZW50XyxcbiAgICBoYW5kbGVVcEV2ZW50OiBQaWNrQ29vcmRpbmF0ZXNJbnRlcmFjdGlvbi5oYW5kbGVVcEV2ZW50XyxcbiAgICBoYW5kbGVNb3ZlRXZlbnQ6IFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uLmhhbmRsZU1vdmVFdmVudF8sXG4gIH0pO1xufTtcbm9sLmluaGVyaXRzKFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uLCBvbC5pbnRlcmFjdGlvbi5Qb2ludGVyKTtcblxuUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24uaGFuZGxlRG93bkV2ZW50XyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHJldHVybiB0cnVlO1xufTtcblxuUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24uaGFuZGxlVXBFdmVudF8gPSBmdW5jdGlvbihldmVudCkge1xuICB0aGlzLmRpc3BhdGNoRXZlbnQoXG4gICAgICAgICAgbmV3IFBpY2tDb29yZGluYXRlc0V2ZW50KFxuICAgICAgICAgICAgICBQaWNrQ29vcmRpbmF0ZXNFdmVudFR5cGUuUElDS0VELFxuICAgICAgICAgICAgICBldmVudC5jb29yZGluYXRlKSk7XG4gIHJldHVybiB0cnVlO1xufTtcblxuUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24uaGFuZGxlTW92ZUV2ZW50XyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHZhciBlbGVtID0gZXZlbnQubWFwLmdldFRhcmdldEVsZW1lbnQoKTtcbiAgZWxlbS5zdHlsZS5jdXJzb3IgPSAgJ3BvaW50ZXInO1xufTtcblxuUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24ucHJvdG90eXBlLnNob3VsZFN0b3BFdmVudCA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiBmYWxzZTtcbn07XG5cblBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uLnByb3RvdHlwZS5zZXRBY3RpdmUgPSBmdW5jdGlvbihhY3RpdmUpe1xuICB2YXIgbWFwID0gdGhpcy5nZXRNYXAoKTtcbiAgaWYgKG1hcCkge1xuICAgIHZhciBlbGVtID0gbWFwLmdldFRhcmdldEVsZW1lbnQoKTtcbiAgICBlbGVtLnN0eWxlLmN1cnNvciA9ICcnO1xuICB9XG4gIG9sLmludGVyYWN0aW9uLlBvaW50ZXIucHJvdG90eXBlLnNldEFjdGl2ZS5jYWxsKHRoaXMsYWN0aXZlKTtcbn07XG5cblBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uLnByb3RvdHlwZS5zZXRNYXAgPSBmdW5jdGlvbihtYXApe1xuICBpZiAoIW1hcCkge1xuICAgIHZhciBlbGVtID0gdGhpcy5nZXRNYXAoKS5nZXRUYXJnZXRFbGVtZW50KCk7XG4gICAgZWxlbS5zdHlsZS5jdXJzb3IgPSAnJztcbiAgfVxuICBvbC5pbnRlcmFjdGlvbi5Qb2ludGVyLnByb3RvdHlwZS5zZXRNYXAuY2FsbCh0aGlzLG1hcCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uO1xuIiwiICB2YXIgUGlja0ZlYXR1cmVFdmVudFR5cGUgPSB7XG4gIFBJQ0tFRDogJ3BpY2tlZCdcbn07XG5cbnZhciBQaWNrRmVhdHVyZUV2ZW50ID0gZnVuY3Rpb24odHlwZSwgY29vcmRpbmF0ZSwgZmVhdHVyZSkge1xuICB0aGlzLnR5cGUgPSB0eXBlO1xuICB0aGlzLmZlYXR1cmUgPSBmZWF0dXJlO1xuICB0aGlzLmNvb3JkaW5hdGUgPSBjb29yZGluYXRlO1xufTtcblxudmFyIFBpY2tGZWF0dXJlSW50ZXJhY3Rpb24gPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIG9sLmludGVyYWN0aW9uLlBvaW50ZXIuY2FsbCh0aGlzLCB7XG4gICAgaGFuZGxlRG93bkV2ZW50OiBQaWNrRmVhdHVyZUludGVyYWN0aW9uLmhhbmRsZURvd25FdmVudF8sXG4gICAgaGFuZGxlVXBFdmVudDogUGlja0ZlYXR1cmVJbnRlcmFjdGlvbi5oYW5kbGVVcEV2ZW50XyxcbiAgICBoYW5kbGVNb3ZlRXZlbnQ6IFBpY2tGZWF0dXJlSW50ZXJhY3Rpb24uaGFuZGxlTW92ZUV2ZW50XyxcbiAgfSk7XG4gIFxuICB0aGlzLmZlYXR1cmVzXyA9IG9wdGlvbnMuZmVhdHVyZXMgfHwgbnVsbDtcbiAgXG4gIHRoaXMubGF5ZXJzXyA9IG9wdGlvbnMubGF5ZXJzIHx8IG51bGw7XG4gIFxuICB0aGlzLnBpY2tlZEZlYXR1cmVfID0gbnVsbDtcbiAgXG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5sYXllckZpbHRlcl8gPSBmdW5jdGlvbihsYXllcikge1xuICAgIHJldHVybiBfLmluY2x1ZGVzKHNlbGYubGF5ZXJzXywgbGF5ZXIpO1xuICB9O1xufTtcbm9sLmluaGVyaXRzKFBpY2tGZWF0dXJlSW50ZXJhY3Rpb24sIG9sLmludGVyYWN0aW9uLlBvaW50ZXIpO1xuXG5QaWNrRmVhdHVyZUludGVyYWN0aW9uLmhhbmRsZURvd25FdmVudF8gPSBmdW5jdGlvbihldmVudCkge1xuICB0aGlzLnBpY2tlZEZlYXR1cmVfID0gdGhpcy5mZWF0dXJlc0F0UGl4ZWxfKGV2ZW50LnBpeGVsLCBldmVudC5tYXApO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cblBpY2tGZWF0dXJlSW50ZXJhY3Rpb24uaGFuZGxlVXBFdmVudF8gPSBmdW5jdGlvbihldmVudCkge1xuICBpZih0aGlzLnBpY2tlZEZlYXR1cmVfKXtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoXG4gICAgICAgICAgICBuZXcgUGlja0ZlYXR1cmVFdmVudChcbiAgICAgICAgICAgICAgICBQaWNrRmVhdHVyZUV2ZW50VHlwZS5QSUNLRUQsXG4gICAgICAgICAgICAgICAgZXZlbnQuY29vcmRpbmF0ZSxcbiAgICAgICAgICAgICAgICB0aGlzLnBpY2tlZEZlYXR1cmVfKSk7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5QaWNrRmVhdHVyZUludGVyYWN0aW9uLmhhbmRsZU1vdmVFdmVudF8gPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgZWxlbSA9IGV2ZW50Lm1hcC5nZXRUYXJnZXRFbGVtZW50KCk7XG4gIHZhciBpbnRlcnNlY3RpbmdGZWF0dXJlID0gdGhpcy5mZWF0dXJlc0F0UGl4ZWxfKGV2ZW50LnBpeGVsLCBldmVudC5tYXApO1xuXG4gIGlmIChpbnRlcnNlY3RpbmdGZWF0dXJlKSB7XG4gICAgZWxlbS5zdHlsZS5jdXJzb3IgPSAgJ3BvaW50ZXInO1xuICB9IGVsc2Uge1xuICAgIGVsZW0uc3R5bGUuY3Vyc29yID0gJyc7XG4gIH1cbn07XG5cblBpY2tGZWF0dXJlSW50ZXJhY3Rpb24ucHJvdG90eXBlLmZlYXR1cmVzQXRQaXhlbF8gPSBmdW5jdGlvbihwaXhlbCwgbWFwKSB7XG4gIHZhciBmb3VuZCA9IG51bGw7XG5cbiAgdmFyIGludGVyc2VjdGluZ0ZlYXR1cmUgPSBtYXAuZm9yRWFjaEZlYXR1cmVBdFBpeGVsKHBpeGVsLFxuICAgICAgZnVuY3Rpb24oZmVhdHVyZSkge1xuICAgICAgICBpZiAodGhpcy5mZWF0dXJlc18pIHtcbiAgICAgICAgICBpZiAodGhpcy5mZWF0dXJlc18uaW5kZXhPZihmZWF0dXJlKSA+IC0xKXtcbiAgICAgICAgICAgIHJldHVybiBmZWF0dXJlXG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZlYXR1cmU7XG4gICAgICB9LHRoaXMsdGhpcy5sYXllckZpbHRlcl8pO1xuICBcbiAgaWYoaW50ZXJzZWN0aW5nRmVhdHVyZSl7XG4gICAgZm91bmQgPSBpbnRlcnNlY3RpbmdGZWF0dXJlO1xuICB9XG4gIHJldHVybiBmb3VuZDtcbn07XG5cblBpY2tGZWF0dXJlSW50ZXJhY3Rpb24ucHJvdG90eXBlLnNob3VsZFN0b3BFdmVudCA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiBmYWxzZTtcbn07XG5cblBpY2tGZWF0dXJlSW50ZXJhY3Rpb24ucHJvdG90eXBlLnNldE1hcCA9IGZ1bmN0aW9uKG1hcCl7XG4gIGlmICghbWFwKSB7XG4gICAgdmFyIGVsZW0gPSB0aGlzLmdldE1hcCgpLmdldFRhcmdldEVsZW1lbnQoKTtcbiAgICBlbGVtLnN0eWxlLmN1cnNvciA9ICcnO1xuICB9XG4gIG9sLmludGVyYWN0aW9uLlBvaW50ZXIucHJvdG90eXBlLnNldE1hcC5jYWxsKHRoaXMsbWFwKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGlja0ZlYXR1cmVJbnRlcmFjdGlvbjtcbiIsInZhciBCYXNlTGF5ZXJzID0ge307XG5cbkJhc2VMYXllcnMuT1NNID0gbmV3IG9sLmxheWVyLlRpbGUoe1xuICBzb3VyY2U6IG5ldyBvbC5zb3VyY2UuT1NNKHtcbiAgICBhdHRyaWJ1dGlvbnM6IFtcbiAgICAgIG5ldyBvbC5BdHRyaWJ1dGlvbih7XG4gICAgICAgIGh0bWw6ICdBbGwgbWFwcyAmY29weTsgJyArXG4gICAgICAgICAgICAnPGEgaHJlZj1cImh0dHA6Ly93d3cub3BlbnN0cmVldG1hcC5vcmcvXCI+T3BlblN0cmVldE1hcDwvYT4nXG4gICAgICB9KSxcbiAgICAgIG9sLnNvdXJjZS5PU00uQVRUUklCVVRJT05cbiAgICBdLFxuICAgIHVybDogJ2h0dHA6Ly97YS1jfS50aWxlLm9wZW5zdHJlZXRtYXAub3JnL3t6fS97eH0ve3l9LnBuZycsXG4gICAgY3Jvc3NPcmlnaW46IG51bGxcbiAgfSksXG4gIGlkOiAnb3NtJyxcbiAgdGl0bGU6ICdPU00nLFxuICBiYXNlbWFwOiB0cnVlXG59KTtcblxuQmFzZUxheWVycy5CSU5HID0ge307XG5cbkJhc2VMYXllcnMuQklORy5Sb2FkID0gbmV3IG9sLmxheWVyLlRpbGUoe1xuICBuYW1lOidSb2FkJyxcbiAgdmlzaWJsZTogZmFsc2UsXG4gIHByZWxvYWQ6IEluZmluaXR5LFxuICBzb3VyY2U6IG5ldyBvbC5zb3VyY2UuQmluZ01hcHMoe1xuICAgIGtleTogJ0FtX21BU25VQS1qdFczTzNNeElZbU9PUExPdkwzOWR3TXZSbnlvSHhmS2ZfRVBOWWdmV005aW1xR0VUV0tHVm4nLFxuICAgIGltYWdlcnlTZXQ6ICdSb2FkJ1xuICAgICAgLy8gdXNlIG1heFpvb20gMTkgdG8gc2VlIHN0cmV0Y2hlZCB0aWxlcyBpbnN0ZWFkIG9mIHRoZSBCaW5nTWFwc1xuICAgICAgLy8gXCJubyBwaG90b3MgYXQgdGhpcyB6b29tIGxldmVsXCIgdGlsZXNcbiAgICAgIC8vIG1heFpvb206IDE5XG4gIH0pLFxuICBiYXNlbWFwOiB0cnVlXG59KTtcblxuQmFzZUxheWVycy5CSU5HLkFlcmlhbFdpdGhMYWJlbHMgPSBuZXcgb2wubGF5ZXIuVGlsZSh7XG4gIG5hbWU6ICdBZXJpYWxXaXRoTGFiZWxzJyxcbiAgdmlzaWJsZTogdHJ1ZSxcbiAgcHJlbG9hZDogSW5maW5pdHksXG4gIHNvdXJjZTogbmV3IG9sLnNvdXJjZS5CaW5nTWFwcyh7XG4gICAga2V5OiAnQW1fbUFTblVBLWp0VzNPM014SVltT09QTE92TDM5ZHdNdlJueW9IeGZLZl9FUE5ZZ2ZXTTlpbXFHRVRXS0dWbicsXG4gICAgaW1hZ2VyeVNldDogJ0FlcmlhbFdpdGhMYWJlbHMnXG4gICAgICAvLyB1c2UgbWF4Wm9vbSAxOSB0byBzZWUgc3RyZXRjaGVkIHRpbGVzIGluc3RlYWQgb2YgdGhlIEJpbmdNYXBzXG4gICAgICAvLyBcIm5vIHBob3RvcyBhdCB0aGlzIHpvb20gbGV2ZWxcIiB0aWxlc1xuICAgICAgLy8gbWF4Wm9vbTogMTlcbiAgfSksXG4gIGJhc2VtYXA6IHRydWVcbn0pO1xuXG5CYXNlTGF5ZXJzLkJJTkcuQWVyaWFsID0gbmV3IG9sLmxheWVyLlRpbGUoe1xuICBuYW1lOiAnQWVyaWFsJyxcbiAgdmlzaWJsZTogZmFsc2UsXG4gIHByZWxvYWQ6IEluZmluaXR5LFxuICBzb3VyY2U6IG5ldyBvbC5zb3VyY2UuQmluZ01hcHMoe1xuICAgIGtleTogJ0FtX21BU25VQS1qdFczTzNNeElZbU9PUExPdkwzOWR3TXZSbnlvSHhmS2ZfRVBOWWdmV005aW1xR0VUV0tHVm4nLFxuICAgIGltYWdlcnlTZXQ6ICdBZXJpYWwnXG4gICAgICAvLyB1c2UgbWF4Wm9vbSAxOSB0byBzZWUgc3RyZXRjaGVkIHRpbGVzIGluc3RlYWQgb2YgdGhlIEJpbmdNYXBzXG4gICAgICAvLyBcIm5vIHBob3RvcyBhdCB0aGlzIHpvb20gbGV2ZWxcIiB0aWxlc1xuICAgICAgLy8gbWF4Wm9vbTogMTlcbiAgfSksXG4gIGJhc2VtYXA6IHRydWVcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VMYXllcnM7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xudmFyIFJhc3RlckxheWVycyA9IHt9O1xuXG5SYXN0ZXJMYXllcnMuVGlsZWRXTVNMYXllciA9IGZ1bmN0aW9uKGxheWVyT2JqLGV4dHJhUGFyYW1zKXtcbiAgdmFyIG9wdGlvbnMgPSB7XG4gICAgbGF5ZXJPYmo6IGxheWVyT2JqLFxuICAgIGV4dHJhUGFyYW1zOiBleHRyYVBhcmFtcyB8fCB7fSxcbiAgICB0aWxlZDogdHJ1ZVxuICB9XG4gIHJldHVybiBSYXN0ZXJMYXllcnMuX1dNU0xheWVyKG9wdGlvbnMpO1xufTtcblxuUmFzdGVyTGF5ZXJzLldNU0xheWVyID0gZnVuY3Rpb24obGF5ZXJPYmosZXh0cmFQYXJhbXMpe1xuICB2YXIgb3B0aW9ucyA9IHtcbiAgICBsYXllck9iajogbGF5ZXJPYmosXG4gICAgZXh0cmFQYXJhbXM6IGV4dHJhUGFyYW1zIHx8IHt9XG4gIH1cbiAgcmV0dXJuIFJhc3RlckxheWVycy5fV01TTGF5ZXIob3B0aW9ucyk7XG59O1xuXG5SYXN0ZXJMYXllcnMuX1dNU0xheWVyID0gZnVuY3Rpb24ob3B0aW9ucyl7XG4gIHZhciBsYXllck9iaiA9IG9wdGlvbnMubGF5ZXJPYmo7XG4gIHZhciBleHRyYVBhcmFtcyA9IG9wdGlvbnMuZXh0cmFQYXJhbXM7XG4gIHZhciB0aWxlZCA9IG9wdGlvbnMudGlsZWQgfHwgZmFsc2U7XG4gIFxuICB2YXIgcGFyYW1zID0ge1xuICAgIExBWUVSUzogbGF5ZXJPYmoubGF5ZXJzIHx8ICcnLFxuICAgIFZFUlNJT046ICcxLjMuMCcsXG4gICAgVFJBTlNQQVJFTlQ6IHRydWUsXG4gICAgU0xEX1ZFUlNJT046ICcxLjEuMCdcbiAgfTtcbiAgXG4gIHBhcmFtcyA9IHV0aWxzLm1lcmdlKHBhcmFtcyxleHRyYVBhcmFtcyk7XG4gIFxuICB2YXIgc291cmNlT3B0aW9ucyA9IHtcbiAgICB1cmw6IGxheWVyT2JqLnVybCxcbiAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICByYXRpbzogMVxuICB9O1xuICBcbiAgdmFyIGltYWdlT3B0aW9ucyA9IHtcbiAgICBpZDogbGF5ZXJPYmouaWQsXG4gICAgbmFtZTogbGF5ZXJPYmoubmFtZSxcbiAgICBvcGFjaXR5OiBsYXllck9iai5vcGFjaXR5IHx8IDEuMCxcbiAgICB2aXNpYmxlOmxheWVyT2JqLnZpc2libGUsXG4gICAgbWF4UmVzb2x1dGlvbjogbGF5ZXJPYmoubWF4UmVzb2x1dGlvblxuICB9XG4gIFxuICB2YXIgaW1hZ2VDbGFzcztcbiAgdmFyIHNvdXJjZTtcbiAgaWYgKHRpbGVkKSB7XG4gICAgc291cmNlID0gbmV3IG9sLnNvdXJjZS5UaWxlV01TKHNvdXJjZU9wdGlvbnMpO1xuICAgIGltYWdlQ2xhc3MgPSBvbC5sYXllci5UaWxlO1xuICAgIC8vaW1hZ2VPcHRpb25zLmV4dGVudCA9IFsxMTM0ODY3LDM4NzMwMDIsMjUwNTk2NCw1NTk2OTQ0XTtcbiAgfVxuICBlbHNlIHtcbiAgICBzb3VyY2UgPSBuZXcgb2wuc291cmNlLkltYWdlV01TKHNvdXJjZU9wdGlvbnMpXG4gICAgaW1hZ2VDbGFzcyA9IG9sLmxheWVyLkltYWdlO1xuICB9XG4gIFxuICBpbWFnZU9wdGlvbnMuc291cmNlID0gc291cmNlO1xuICBcbiAgdmFyIGxheWVyID0gbmV3IGltYWdlQ2xhc3MoaW1hZ2VPcHRpb25zKTtcbiAgXG4gIHJldHVybiBsYXllcjtcbn07XG5cbi8qUmFzdGVyTGF5ZXJzLlRpbGVkV01TTGF5ZXIgPSBmdW5jdGlvbihsYXllck9iail7XG4gIHZhciBsYXllciA9IG5ldyBvbC5sYXllci5UaWxlKHtcbiAgICBuYW1lOiBsYXllck9iai5uYW1lLFxuICAgIG9wYWNpdHk6IDEuMCxcbiAgICBzb3VyY2U6IG5ldyBvbC5zb3VyY2UuVGlsZVdNUyh7XG4gICAgICB1cmw6IGxheWVyT2JqLnVybCxcbiAgICAgIHBhcmFtczoge1xuICAgICAgICBMQVlFUlM6IGxheWVyT2JqLmxheWVycyB8fCAnJyxcbiAgICAgICAgVkVSU0lPTjogJzEuMy4wJyxcbiAgICAgICAgVFJBTlNQQVJFTlQ6IHRydWVcbiAgICAgIH1cbiAgICB9KSxcbiAgICB2aXNpYmxlOiBsYXllck9iai52aXNpYmxlXG4gIH0pO1xuICBcbiAgcmV0dXJuIGxheWVyO1xufTsqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJhc3RlckxheWVycztcblxuIiwiQmFzZUxheWVycyA9IHJlcXVpcmUoJy4uL2xheWVycy9iYXNlcycpO1xuXG52YXIgTWFwSGVscGVycyA9IHtcbiAgY3JlYXRlVmlld2VyOiBmdW5jdGlvbihvcHRzKXtcbiAgICByZXR1cm4gbmV3IF9WaWV3ZXIob3B0cyk7XG4gIH1cbn07XG5cbnZhciBfVmlld2VyID0gZnVuY3Rpb24ob3B0cyl7XG4gIHZhciBjb250cm9scyA9IG9sLmNvbnRyb2wuZGVmYXVsdHMoe1xuICAgIGF0dHJpYnV0aW9uT3B0aW9uczoge1xuICAgICAgY29sbGFwc2libGU6IGZhbHNlXG4gICAgfSxcbiAgICB6b29tOiBmYWxzZSxcbiAgICBhdHRyaWJ1dGlvbjogZmFsc2VcbiAgfSk7Ly8uZXh0ZW5kKFtuZXcgb2wuY29udHJvbC5ab29tKCldKTtcbiAgXG4gIHZhciBpbnRlcmFjdGlvbnMgPSBvbC5pbnRlcmFjdGlvbi5kZWZhdWx0cygpXG4gICAgLmV4dGVuZChbXG4gICAgICBuZXcgb2wuaW50ZXJhY3Rpb24uRHJhZ1JvdGF0ZSgpXG4gICAgXSk7XG4gIGludGVyYWN0aW9ucy5yZW1vdmVBdCgxKSAvLyByaW11b3ZvIGRvdWNsaWNrem9vbVxuICBcbiAgdmFyIHZpZXc7XG4gIGlmIChvcHRzLnZpZXcgaW5zdGFuY2VvZiBvbC5WaWV3KSB7XG4gICAgdmlldyA9IG9wdHMudmlldztcbiAgfVxuICBlbHNlIHtcbiAgICB2aWV3ID0gbmV3IG9sLlZpZXcob3B0cy52aWV3KTtcbiAgfVxuICB2YXIgb3B0aW9ucyA9IHtcbiAgICBjb250cm9sczogY29udHJvbHMsXG4gICAgaW50ZXJhY3Rpb25zOiBpbnRlcmFjdGlvbnMsXG4gICAgb2wzTG9nbzogZmFsc2UsXG4gICAgdmlldzogdmlldyxcbiAgICBrZXlib2FyZEV2ZW50VGFyZ2V0OiBkb2N1bWVudFxuICB9O1xuICBpZiAob3B0cy5pZCl7XG4gICAgb3B0aW9ucy50YXJnZXQgPSBvcHRzLmlkO1xuICB9XG4gIHZhciBtYXAgID0gbmV3IG9sLk1hcChvcHRpb25zKTtcbiAgdGhpcy5tYXAgPSBtYXA7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKXtcbiAgaWYgKHRoaXMubWFwKSB7XG4gICAgdGhpcy5tYXAuZGlzcG9zZSgpO1xuICAgIHRoaXMubWFwID0gbnVsbFxuICB9XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5nZXRWaWV3ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLm1hcC5nZXRWaWV3KCk7XG59XG5cbl9WaWV3ZXIucHJvdG90eXBlLnVwZGF0ZU1hcCA9IGZ1bmN0aW9uKG1hcE9iamVjdCl7fTtcblxuX1ZpZXdlci5wcm90b3R5cGUudXBkYXRlVmlldyA9IGZ1bmN0aW9uKCl7fTtcblxuX1ZpZXdlci5wcm90b3R5cGUuZ2V0TWFwID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMubWFwO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUuc2V0VGFyZ2V0ID0gZnVuY3Rpb24oaWQpe1xuICB0aGlzLm1hcC5zZXRUYXJnZXQoaWQpO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUuZ29UbyA9IGZ1bmN0aW9uKGNvb3JkaW5hdGVzLCBvcHRpb25zKXtcbiAgdmFyIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgYW5pbWF0ZSA9IG9wdGlvbnMuYW5pbWF0ZSB8fCB0cnVlO1xuICB2YXIgem9vbSA9IG9wdGlvbnMuem9vbSB8fCBmYWxzZTtcbiAgdmFyIHZpZXcgPSB0aGlzLm1hcC5nZXRWaWV3KCk7XG4gIFxuICBpZiAoYW5pbWF0ZSkge1xuICAgIHZhciBwYW5BbmltYXRpb24gPSBvbC5hbmltYXRpb24ucGFuKHtcbiAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICBzb3VyY2U6IHZpZXcuZ2V0Q2VudGVyKClcbiAgICB9KTtcbiAgICB2YXIgem9vbUFuaW1hdGlvbiA9IG9sLmFuaW1hdGlvbi56b29tKHtcbiAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICByZXNvbHV0aW9uOiB2aWV3LmdldFJlc29sdXRpb24oKVxuICAgIH0pO1xuICAgIHRoaXMubWFwLmJlZm9yZVJlbmRlcihwYW5BbmltYXRpb24sem9vbUFuaW1hdGlvbik7XG4gIH1cbiAgXG4gIHZpZXcuc2V0Q2VudGVyKGNvb3JkaW5hdGVzKTtcbiAgaWYgKHpvb20pIHtcbiAgICB2aWV3LnNldFpvb20oem9vbSk7XG4gIH1cbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmdvVG9SZXMgPSBmdW5jdGlvbihjb29yZGluYXRlcywgcmVzb2x1dGlvbil7XG4gIHZhciBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIGFuaW1hdGUgPSBvcHRpb25zLmFuaW1hdGUgfHwgdHJ1ZTtcbiAgdmFyIHZpZXcgPSB0aGlzLm1hcC5nZXRWaWV3KCk7XG4gIFxuICBpZiAoYW5pbWF0ZSkge1xuICAgIHZhciBwYW5BbmltYXRpb24gPSBvbC5hbmltYXRpb24ucGFuKHtcbiAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICBzb3VyY2U6IHZpZXcuZ2V0Q2VudGVyKClcbiAgICB9KTtcbiAgICB2YXIgem9vbUFuaW1hdGlvbiA9IG9sLmFuaW1hdGlvbi56b29tKHtcbiAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICByZXNvbHV0aW9uOiB2aWV3LmdldFJlc29sdXRpb24oKVxuICAgIH0pO1xuICAgIHRoaXMubWFwLmJlZm9yZVJlbmRlcihwYW5BbmltYXRpb24sem9vbUFuaW1hdGlvbik7XG4gIH1cblxuICB2aWV3LnNldENlbnRlcihjb29yZGluYXRlcyk7XG4gIHZpZXcuc2V0UmVzb2x1dGlvbihyZXNvbHV0aW9uKTtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmZpdCA9IGZ1bmN0aW9uKGdlb21ldHJ5LCBvcHRpb25zKXtcbiAgdmFyIHZpZXcgPSB0aGlzLm1hcC5nZXRWaWV3KCk7XG4gIFxuICB2YXIgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBhbmltYXRlID0gb3B0aW9ucy5hbmltYXRlIHx8IHRydWU7XG4gIFxuICBpZiAoYW5pbWF0ZSkge1xuICAgIHZhciBwYW5BbmltYXRpb24gPSBvbC5hbmltYXRpb24ucGFuKHtcbiAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICBzb3VyY2U6IHZpZXcuZ2V0Q2VudGVyKClcbiAgICB9KTtcbiAgICB2YXIgem9vbUFuaW1hdGlvbiA9IG9sLmFuaW1hdGlvbi56b29tKHtcbiAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICByZXNvbHV0aW9uOiB2aWV3LmdldFJlc29sdXRpb24oKVxuICAgIH0pO1xuICAgIHRoaXMubWFwLmJlZm9yZVJlbmRlcihwYW5BbmltYXRpb24sem9vbUFuaW1hdGlvbik7XG4gIH1cbiAgXG4gIGlmIChvcHRpb25zLmFuaW1hdGUpIHtcbiAgICBkZWxldGUgb3B0aW9ucy5hbmltYXRlOyAvLyBub24gbG8gcGFzc28gYWwgbWV0b2RvIGRpIE9MMyBwZXJjaMOpIMOoIHVuJ29wemlvbmUgaW50ZXJuYVxuICB9XG4gIG9wdGlvbnMuY29uc3RyYWluUmVzb2x1dGlvbiA9IG9wdGlvbnMuY29uc3RyYWluUmVzb2x1dGlvbiB8fCB0cnVlO1xuICBcbiAgdmlldy5maXQoZ2VvbWV0cnksdGhpcy5tYXAuZ2V0U2l6ZSgpLG9wdGlvbnMpO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUuZ2V0Wm9vbSA9IGZ1bmN0aW9uKCl7XG4gIHZhciB2aWV3ID0gdGhpcy5tYXAuZ2V0VmlldygpO1xuICByZXR1cm4gdmlldy5nZXRab29tKCk7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5nZXRSZXNvbHV0aW9uID0gZnVuY3Rpb24oKXtcbiAgdmFyIHZpZXcgPSB0aGlzLm1hcC5nZXRWaWV3KCk7XG4gIHJldHVybiB2aWV3LmdldFJlc29sdXRpb24oKTtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmdldENlbnRlciA9IGZ1bmN0aW9uKCl7XG4gIHZhciB2aWV3ID0gdGhpcy5tYXAuZ2V0VmlldygpO1xuICByZXR1cm4gdmlldy5nZXRDZW50ZXIoKTtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmdldEJCT1ggPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5tYXAuZ2V0VmlldygpLmNhbGN1bGF0ZUV4dGVudCh0aGlzLm1hcC5nZXRTaXplKCkpO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUuZ2V0TGF5ZXJCeU5hbWUgPSBmdW5jdGlvbihsYXllck5hbWUpIHtcbiAgdmFyIGxheWVycyA9IHRoaXMubWFwLmdldExheWVycygpO1xuICB2YXIgbGVuZ3RoID0gbGF5ZXJzLmdldExlbmd0aCgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGxheWVyTmFtZSA9PT0gbGF5ZXJzLml0ZW0oaSkuZ2V0KCduYW1lJykpIHtcbiAgICAgIHJldHVybiBsYXllcnMuaXRlbShpKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5yZW1vdmVMYXllckJ5TmFtZSA9IGZ1bmN0aW9uKGxheWVyTmFtZSl7XG4gIHZhciBsYXllciA9IHRoaXMuZ2V0TGF5ZXJCeU5hbWUobGF5ZXJOYW1lKTtcbiAgaWYgKGxheWVyKXtcbiAgICB0aGlzLm1hcC5yZW1vdmVMYXllcihsYXllcik7XG4gICAgZGVsZXRlIGxheWVyO1xuICB9XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5nZXRBY3RpdmVMYXllcnMgPSBmdW5jdGlvbigpe1xuICB2YXIgYWN0aXZlbGF5ZXJzID0gW107XG4gIHRoaXMubWFwLmdldExheWVycygpLmZvckVhY2goZnVuY3Rpb24obGF5ZXIpIHtcbiAgICB2YXIgcHJvcHMgPSBsYXllci5nZXRQcm9wZXJ0aWVzKCk7XG4gICAgaWYgKHByb3BzLmJhc2VtYXAgIT0gdHJ1ZSAmJiBwcm9wcy52aXNpYmxlKXtcbiAgICAgICBhY3RpdmVsYXllcnMucHVzaChsYXllcik7XG4gICAgfVxuICB9KTtcbiAgXG4gIHJldHVybiBhY3RpdmVsYXllcnM7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5yZW1vdmVMYXllcnMgPSBmdW5jdGlvbigpe1xuICB0aGlzLm1hcC5nZXRMYXllcnMoKS5jbGVhcigpO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUuZ2V0TGF5ZXJzTm9CYXNlID0gZnVuY3Rpb24oKXtcbiAgdmFyIGxheWVycyA9IFtdO1xuICB0aGlzLm1hcC5nZXRMYXllcnMoKS5mb3JFYWNoKGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgdmFyIHByb3BzID0gbGF5ZXIuZ2V0UHJvcGVydGllcygpO1xuICAgIGlmIChwcm9wcy5iYXNlbWFwICE9IHRydWUpe1xuICAgICAgbGF5ZXJzLnB1c2gobGF5ZXIpO1xuICAgIH1cbiAgfSk7XG4gIFxuICByZXR1cm4gbGF5ZXJzO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUuYWRkQmFzZUxheWVyID0gZnVuY3Rpb24odHlwZSl7XG4gIHZhciBsYXllcjtcbiAgdHlwZSA/IGxheWVyID0gQmFzZUxheWVyc1t0eXBlXTogIGxheWVyID0gQmFzZUxheWVycy5CSU5HLkFlcmlhbDtcbiAgdGhpcy5tYXAuYWRkTGF5ZXIobGF5ZXIpO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUuY2hhbmdlQmFzZUxheWVyID0gZnVuY3Rpb24obGF5ZXJOYW1lKXtcbiAgdmFyIGJhc2VMYXllciA9IHRoaXMuZ2V0TGF5ZXJCeU5hbWUobGF5ZXJuYW1lKTtcbiAgdmFyIGxheWVycyA9IHRoaXMubWFwLmdldExheWVycygpO1xuICBsYXllcnMuaW5zZXJ0QXQoMCwgYmFzZUxheWVyKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWFwSGVscGVycztcbiIsInZhciB1dGlscyA9IHtcbiAgbWVyZ2U6IGZ1bmN0aW9uKG9iajEsb2JqMil7XG4gICAgdmFyIG9iajMgPSB7fTtcbiAgICBmb3IgKHZhciBhdHRybmFtZSBpbiBvYmoxKSB7IG9iajNbYXR0cm5hbWVdID0gb2JqMVthdHRybmFtZV07IH1cbiAgICBmb3IgKHZhciBhdHRybmFtZSBpbiBvYmoyKSB7IG9iajNbYXR0cm5hbWVdID0gb2JqMlthdHRybmFtZV07IH1cbiAgICByZXR1cm4gb2JqMztcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHV0aWxzO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjwhLS0gaXRlbSB0ZW1wbGF0ZSAtLT5cXG48ZGl2IGlkPVxcXCJjYXRhbG9nXFxcIiBjbGFzcz1cXFwidGFiYmFibGUtcGFuZWwgY2F0YWxvZ1xcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJiYWJsZS1saW5lXFxcIj5cXG4gICAgPHVsIGNsYXNzPVxcXCJuYXYgbmF2LXRhYnNcXFwiIHJvbGU9XFxcInRhYmxpc3RcXFwiPlxcbiAgICAgIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIGNsYXNzPVxcXCJhY3RpdmVcXFwiPjxhIGhyZWY9XFxcIiN0cmVlXFxcIiBhcmlhLWNvbnRyb2xzPVxcXCJ0cmVlXFxcIiByb2xlPVxcXCJ0YWJcXFwiIGRhdGEtdG9nZ2xlPVxcXCJ0YWJcXFwiIGRhdGEtaTE4bj1cXFwidHJlZVxcXCI+RGF0YTwvYT48L2xpPlxcbiAgICAgIDxsaSB2LWlmPVxcXCJoYXNCYXNlTGF5ZXJzXFxcIiByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiPjxhIGhyZWY9XFxcIiNiYXNlbGF5ZXJzXFxcIiBhcmlhLWNvbnRyb2xzPVxcXCJiYXNlbGF5ZXJzXFxcIiByb2xlPVxcXCJ0YWJcXFwiIGRhdGEtdG9nZ2xlPVxcXCJ0YWJcXFwiIGRhdGEtaTE4bj1cXFwiYmFzZWxheWVyc1xcXCI+TGF5ZXIgQmFzZTwvYT48L2xpPlxcbiAgICAgIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiPjxhIGhyZWY9XFxcIiNsZWdlbmRcXFwiIGFyaWEtY29udHJvbHM9XFxcImxlZ2VuZFxcXCIgcm9sZT1cXFwidGFiXFxcIiBkYXRhLXRvZ2dsZT1cXFwidGFiXFxcIiBkYXRhLWkxOG49XFxcImxlZ2VuZFxcXCI+TGVnZW5kYTwvYT48L2xpPlxcbiAgICA8L3VsPlxcbiAgICA8ZGl2ICBjbGFzcz1cXFwidGFiLWNvbnRlbnRcXFwiPlxcbiAgICAgIDxkaXYgcm9sZT1cXFwidGFicGFuZWxcXFwiIGNsYXNzPVxcXCJ0YWItcGFuZSBhY3RpdmUgdHJlZVxcXCIgaWQ9XFxcInRyZWVcXFwiPlxcbiAgICAgICAgPHVsIGNsYXNzPVxcXCJ0cmVlLXJvb3RcXFwiPlxcbiAgICAgICAgICA8dHJpc3RhdGUtdHJlZSB2LWlmPVxcXCIhaXNIaWRkZW5cXFwiIDpsYXllcnN0cmVlPVxcXCJsYXllcnN0cmVlXFxcIiBjbGFzcz1cXFwiaXRlbVxcXCIgdi1mb3I9XFxcImxheWVyc3RyZWUgaW4gbGF5ZXJzdHJlZVxcXCI+XFxuICAgICAgICAgIDwvdHJpc3RhdGUtdHJlZT5cXG4gICAgICAgIDwvdWw+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiB2LWlmPVxcXCJoYXNCYXNlTGF5ZXJzXFxcIiByb2xlPVxcXCJ0YWJwYW5lbFxcXCIgY2xhc3M9XFxcInRhYi1wYW5lIGJhc2VsYXllcnNcXFwiIGlkPVxcXCJiYXNlbGF5ZXJzXFxcIj5cXG4gICAgICAgIDxmb3JtPlxcbiAgICAgICAgICA8dWw+XFxuICAgICAgICAgICAgPGxpIHYtaWY9XFxcIiFiYXNlbGF5ZXIuZml4ZWRcXFwiIHYtZm9yPVxcXCJiYXNlbGF5ZXIgaW4gYmFzZWxheWVyc1xcXCI+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJyYWRpb1xcXCI+XFxuICAgICAgICAgICAgICAgIDxsYWJlbD48aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIG5hbWU9XFxcImJhc2VsYXllclxcXCIgdi1jaGVja2VkPVxcXCJiYXNlbGF5ZXIudmlzaWJsZVxcXCIgQGNsaWNrPVxcXCJzZXRCYXNlTGF5ZXIoYmFzZWxheWVyLmlkKVxcXCI+e3sgYmFzZWxheWVyLnRpdGxlIH19PC9sYWJlbD5cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvbGk+XFxuICAgICAgICAgIDwvdWw+XFxuICAgICAgICA8L2Zvcm0+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGxlZ2VuZCA6bGF5ZXJzdHJlZT1cXFwibGF5ZXJzdHJlZVxcXCI+PC9sZWdlbmQ+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBtZXJnZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5tZXJnZTtcbnZhciB0ID0gcmVxdWlyZSgnY29yZS9pMThuL2kxOG4uc2VydmljZScpLnQ7XG52YXIgcmVzb2x2ZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZXNvbHZlO1xudmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJ2d1aS92dWUvY29tcG9uZW50Jyk7XG52YXIgR1VJID0gcmVxdWlyZSgnZ3VpL2d1aScpO1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNyZWdpc3RyeScpO1xuXG52YXIgdnVlQ29tcG9uZW50T3B0aW9ucyA9IHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vY2F0YWxvZy5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICBwcm9qZWN0OiBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRQcm9qZWN0KClcbiAgICB9XG4gIH0sXG4gIGNvbXB1dGVkOiB7XG4gICAgbGF5ZXJzdHJlZTogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiB0aGlzLnByb2plY3Quc3RhdGUubGF5ZXJzdHJlZTtcbiAgICB9LFxuICAgIGJhc2VsYXllcnM6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gdGhpcy5wcm9qZWN0LnN0YXRlLmJhc2VsYXllcnM7XG4gICAgfSxcbiAgICBoYXNCYXNlTGF5ZXJzOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHRoaXMucHJvamVjdC5zdGF0ZS5iYXNlbGF5ZXJzLmxlbmd0aD4wO1xuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIHNldEJhc2VMYXllcjogZnVuY3Rpb24oaWQpIHtcbiAgICAgIHRoaXMucHJvamVjdC5zZXRCYXNlTGF5ZXIoaWQpO1xuICAgIH1cbiAgfSxcbiAgcmVhZHk6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLiRvbigndHJlZW5vZGV0b29nbGVkJyxmdW5jdGlvbihub2RlKXtcbiAgICAgIHNlbGYucHJvamVjdC50b2dnbGVMYXllcihub2RlLmlkKTtcbiAgICB9KTtcblxuICAgIHRoaXMuJG9uKCd0cmVlbm9kZXN0b29nbGVkJyxmdW5jdGlvbihub2RlcyxwYXJlbnRDaGVja2VkKXtcbiAgICAgIHZhciBsYXllcnNJZHMgPSBfLm1hcChub2RlcywnaWQnKTtcbiAgICAgIHNlbGYucHJvamVjdC50b2dnbGVMYXllcnMobGF5ZXJzSWRzLHBhcmVudENoZWNrZWQpO1xuICAgIH0pO1xuICAgIFxuICAgIHRoaXMuJG9uKCd0cmVlbm9kZXNlbGVjdGVkJyxmdW5jdGlvbihub2RlKXtcbiAgICAgIGlmICghbm9kZS5zZWxlY3RlZCkge1xuICAgICAgICBzZWxmLnByb2plY3Quc2VsZWN0TGF5ZXIobm9kZS5pZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLnByb2plY3QudW5zZWxlY3RMYXllcihub2RlLmlkKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG4vLyBzZSBsbyB2b2dsaW8gaXN0YW56aWFyZSBtYW51YWxtZW50ZVxudmFyIEludGVybmFsQ29tcG9uZW50ID0gVnVlLmV4dGVuZCh2dWVDb21wb25lbnRPcHRpb25zKTtcblxuLy8gc2UgbG8gdm9nbGlvIHVzYXJlIGNvbWUgY29tcG9uZW50ZSBjb21lIGVsZW1lbnRvIGh0bWxcblZ1ZS5jb21wb25lbnQoJ2czdy1jYXRhbG9nJywgdnVlQ29tcG9uZW50T3B0aW9ucyk7XG5cblxuLyogQ09NUE9ORU5USSBGSUdMSSAqL1xuXG4vLyB0cmVlIGNvbXBvbmVudFxuXG5cblZ1ZS5jb21wb25lbnQoJ3RyaXN0YXRlLXRyZWUnLCB7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL3RyaXN0YXRlLXRyZWUuaHRtbCcpLFxuICBwcm9wczoge1xuICAgIGxheWVyc3RyZWU6IFtdLFxuICAgIC8vZXJlZGl0byBpbCBudW1lcm8gZGkgY2hpbGRzIGRhbCBwYXJlbnRcbiAgICBuX3BhcmVudENoaWxkcyA6IDAsXG4gICAgY2hlY2tlZDogZmFsc2VcbiAgfSxcbiAgZGF0YTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICBleHBhbmRlZDogdGhpcy5sYXllcnN0cmVlLmV4cGFuZGVkLFxuICAgICAgcGFyZW50Q2hlY2tlZDogZmFsc2UsXG4gICAgICAvL3Byb3ByaWV0YSBjaGUgc2VydmUgcGVyIGZhcmUgY29uZnJvbnRvIHBlciBpbCB0cmlzdGF0ZVxuICAgICAgbl9jaGlsZHM6IHRoaXMubGF5ZXJzdHJlZS5ub2RlcyA/IHRoaXMubGF5ZXJzdHJlZS5ub2Rlcy5sZW5ndGggOiAwXG4gICAgfVxuICB9LFxuICB3YXRjaDoge1xuICAgICAgJ2NoZWNrZWQnOiBmdW5jdGlvbiAodmFsKXtcbiAgICAgICAgdGhpcy5sYXllcnN0cmVlLnZpc2libGUgPSB2YWw7XG4gICAgICB9XG4gIH0sXG4gIGNvbXB1dGVkOiB7XG4gICAgaXNGb2xkZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBpc0ZvbGRlciA9IHRoaXMubl9jaGlsZHMgPyB0cnVlIDogZmFsc2U7XG4gICAgICBpZiAoaXNGb2xkZXIpIHtcbiAgICAgICAgdmFyIF92aXNpYmxlQ2hpbGRzID0gMDtcbiAgICAgICAgXy5mb3JFYWNoKHRoaXMubGF5ZXJzdHJlZS5ub2RlcyxmdW5jdGlvbihsYXllcil7XG4gICAgICAgICAgaWYgKGxheWVyLnZpc2libGUpe1xuICAgICAgICAgICAgX3Zpc2libGVDaGlsZHMgKz0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLm5fcGFyZW50Q2hpbGRzID0gdGhpcy5uX2NoaWxkcyAtIF92aXNpYmxlQ2hpbGRzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGlzRm9sZGVyXG4gICAgfSxcbiAgICBpc0hpZGRlbjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5sYXllcnN0cmVlLmhpZGRlbiAmJiAodGhpcy5sYXllcnN0cmVlLmhpZGRlbiA9PT0gdHJ1ZSk7XG4gICAgfSxcbiAgICBzZWxlY3RlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaXNTZWxlY3RlZCA9IHRoaXMubGF5ZXJzdHJlZS5zZWxlY3RlZCA/IFwiU0lcIiA6IFwiTk9cIjtcbiAgICAgIGNvbnNvbGUubG9nKGlzU2VsZWN0ZWQpO1xuICAgICAgcmV0dXJuIGlzU2VsZWN0ZWQ7XG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgdG9nZ2xlOiBmdW5jdGlvbiAoY2hlY2tBbGxMYXllcnMpIHtcbiAgICAgIHZhciBjaGVja0FsbCA9IGNoZWNrQWxsTGF5ZXJzID09ICd0cnVlJyA/IHRydWUgOiBmYWxzZTtcbiAgICAgIGlmICh0aGlzLmlzRm9sZGVyICYmICFjaGVja0FsbCkge1xuICAgICAgICB0aGlzLmxheWVyc3RyZWUuZXhwYW5kZWQgPSAhdGhpcy5sYXllcnN0cmVlLmV4cGFuZGVkO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoY2hlY2tBbGwpe1xuICAgICAgICBpZiAodGhpcy5wYXJlbnRDaGVja2VkICYmICF0aGlzLm5fcGFyZW50Q2hpbGRzKXtcbiAgICAgICAgICB0aGlzLnBhcmVudENoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnBhcmVudENoZWNrZWQgJiYgdGhpcy5uX3BhcmVudENoaWxkcykge1xuICAgICAgICAgIHRoaXMucGFyZW50Q2hlY2tlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5wYXJlbnRDaGVja2VkID0gIXRoaXMucGFyZW50Q2hlY2tlZDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLiRkaXNwYXRjaCgndHJlZW5vZGVzdG9vZ2xlZCcsdGhpcy5sYXllcnN0cmVlLm5vZGVzLHRoaXMucGFyZW50Q2hlY2tlZCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhpcy4kZGlzcGF0Y2goJ3RyZWVub2RldG9vZ2xlZCcsdGhpcy5sYXllcnN0cmVlKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCF0aGlzLmlzRm9sZGVyKSB7XG4gICAgICAgIHRoaXMuJGRpc3BhdGNoKCd0cmVlbm9kZXNlbGVjdGVkJyx0aGlzLmxheWVyc3RyZWUpO1xuICAgICAgfVxuICAgIH0sXG4gICAgdHJpQ2xhc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghdGhpcy5uX3BhcmVudENoaWxkcykge1xuICAgICAgICByZXR1cm4gJ2ZhLWNoZWNrLXNxdWFyZS1vJztcbiAgICAgIH0gZWxzZSBpZiAoKHRoaXMubl9wYXJlbnRDaGlsZHMgPiAwKSAmJiAodGhpcy5uX3BhcmVudENoaWxkcyA8IHRoaXMubl9jaGlsZHMpKSB7XG4gICAgICAgIHJldHVybiAnZmEtc3F1YXJlJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAnZmEtc3F1YXJlLW8nO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSlcblxuVnVlLmNvbXBvbmVudCgnbGVnZW5kJyx7XG4gICAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vbGVnZW5kLmh0bWwnKSxcbiAgICBwcm9wczogWydsYXllcnN0cmVlJ10sXG4gICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAvL2RhdGEgcXVpXG4gICAgICB9XG4gICAgfSxcbiAgICBjb21wdXRlZDoge1xuICAgICAgdmlzaWJsZWxheWVyczogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIF92aXNpYmxlbGF5ZXJzID0gW107XG4gICAgICAgIHZhciBsYXllcnN0cmVlID0gdGhpcy5sYXllcnN0cmVlO1xuICAgICAgICBmdW5jdGlvbiB0cmF2ZXJzZShvYmope1xuICAgICAgICBfLmZvckluKG9iaiwgZnVuY3Rpb24gKGxheWVyLCBrZXkpIHtcbiAgICAgICAgICAgICAgLy92ZXJpZmljYSBjaGUgaWwgdmFsb3JlIGRlbGwnaWQgbm9uIHNpYSBudWxsb1xuICAgICAgICAgICAgICBpZiAoIV8uaXNOaWwobGF5ZXIuaWQpICYmIGxheWVyLnZpc2libGUpIHtcbiAgICAgICAgICAgICAgICAgIF92aXNpYmxlbGF5ZXJzLnB1c2gobGF5ZXIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmICghXy5pc05pbChsYXllci5ub2RlcykpIHtcbiAgICAgICAgICAgICAgICAgIHRyYXZlcnNlKGxheWVyLm5vZGVzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRyYXZlcnNlKGxheWVyc3RyZWUpO1xuICAgICAgICByZXR1cm4gX3Zpc2libGVsYXllcnM7XG4gICAgICB9XG4gICAgfSxcbiAgICB3YXRjaDoge1xuICAgICAgJ2xheWVyc3RyZWUnOiB7XG4gICAgICAgIGhhbmRsZXI6IGZ1bmN0aW9uKHZhbCwgb2xkKXtcbiAgICAgICAgICAvL2NvZGljZSBxdWlcbiAgICAgICAgfSxcbiAgICAgICAgZGVlcDogdHJ1ZVxuICAgICAgfVxuICAgIH0sXG4gICAgcmVhZHk6IGZ1bmN0aW9uKCkge1xuICAgICAgLy9jb2RpY2UgcXVpXG4gICAgfVxufSk7XG5cblZ1ZS5jb21wb25lbnQoJ2xlZ2VuZC1pdGVtJyx7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL2xlZ2VuZF9pdGVtLmh0bWwnKSxcbiAgcHJvcHM6IFsnbGF5ZXInXSxcbiAgY29tcHV0ZWQ6IHtcbiAgICBsZWdlbmR1cmw6IGZ1bmN0aW9uKCl7XG4gICAgICAvLyBpbiBhdHRlc2EgZGkgcmlzb2x2ZXJlIGxvIHNjaGlhbnRvIGRpIFFHU0kgU2VydmVyLi4uXG4gICAgICAvL3JldHVybiBcImh0dHA6Ly9sb2NhbGhvc3QvY2dpLWJpbi9xZ2lzX21hcHNlcnYuZmNnaT9tYXA9L2hvbWUvZ2lvaGFwcHkvU2NyaXZhbmlhL0Rldi9HM1cvZzN3LWNsaWVudC90ZXN0L3Byb2dldHRvL3Rlc3QucWdzJlNFUlZJQ0U9V01TJlZFUlNJT049MS4zLjAmUkVRVUVTVD1HZXRMZWdlbmRHcmFwaGljJkZPUk1BVD1pbWFnZS9wbmcmTEFZRVJUSVRMRT1GYWxzZSZJVEVNRk9OVFNJWkU9MTAmTEFZRVI9XCIrdGhpcy5sYXllci5uYW1lO1xuICAgICAgcmV0dXJuIFByb2plY3RzUmVnaXN0cnkuZ2V0Q3VycmVudFByb2plY3QoKS5nZXRMYXllckJ5SWQodGhpcy5sYXllci5pZCkuZ2V0TGVnZW5kVXJsKCk7XG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgLy8gZXNlbXBpbyB1dGlsaXp6byBkZWwgc2Vydml6aW8gR1VJXG4gICAgb3BlbmZvcm06IGZ1bmN0aW9uKCl7XG4gICAgICAvL0dVSS5ub3RpZnkuc3VjY2VzcyhcIkFwcm8gdW4gZm9ybVwiKTtcbiAgICAgIC8vR1VJLnNob3dGb3JtKCk7XG4gICAgfVxuICB9XG59KTtcblxuLyogRklORSBDT01QT05FTlRJIEZJR0xJICovXG5cbi8qIElOVEVSRkFDQ0lBIFBVQkJMSUNBICovXG5mdW5jdGlvbiBDYXRhbG9nQ29tcG9uZW50KG9wdGlvbnMpe1xuICBiYXNlKHRoaXMpO1xuICB0aGlzLmlkID0gXCJjYXRhbG9nLWNvbXBvbmVudFwiO1xuICB0aGlzLnRpdGxlID0gXCJjYXRhbG9nXCI7XG4gIHRoaXMuaW50ZXJuYWxDb21wb25lbnQgPSBuZXcgSW50ZXJuYWxDb21wb25lbnQ7XG4gIC8vbWVyZ2lvIG9wemlvbmkgY29uIHByb3ByaXTDoCBkaSBkZWZhdWx0IGRlbCBjb21wb25lbnRlXG4gIG1lcmdlKHRoaXMsIG9wdGlvbnMpO1xufVxuXG5pbmhlcml0KENhdGFsb2dDb21wb25lbnQsIENvbXBvbmVudCk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2F0YWxvZ0NvbXBvbmVudDtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IHJvbGU9XFxcInRhYnBhbmVsXFxcIiBjbGFzcz1cXFwidGFiLXBhbmVcXFwiIGlkPVxcXCJsZWdlbmRcXFwiPlxcbiAgPGxlZ2VuZC1pdGVtIDpsYXllcj1cXFwibGF5ZXJcXFwiIHYtZm9yPVxcXCJsYXllciBpbiB2aXNpYmxlbGF5ZXJzXFxcIj48L2xlZ2VuZC1pdGVtPlxcbjwvZGl2PlxcblwiO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgQGNsaWNrPVxcXCJvcGVuZm9ybSgpXFxcIj57eyBsYXllci50aXRsZSB9fTwvZGl2PlxcbjxkaXY+PGltZyA6c3JjPVxcXCJsZWdlbmR1cmxcXFwiPjwvZGl2PlxcblwiO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxsaSBjbGFzcz1cXFwidHJlZS1pdGVtXFxcIiA6Y2xhc3M9XFxcIntzZWxlY3RlZDogbGF5ZXJzdHJlZS5zZWxlY3RlZH1cXFwiPlxcbiAgPHNwYW4gOmNsYXNzPVxcXCJ7Ym9sZDogaXNGb2xkZXIsICdmYS1jaGV2cm9uLWRvd24nOiBsYXllcnN0cmVlLmV4cGFuZGVkLCAnZmEtY2hldnJvbi1yaWdodCc6ICFsYXllcnN0cmVlLmV4cGFuZGVkfVxcXCIgQGNsaWNrPVxcXCJ0b2dnbGVcXFwiIHYtaWY9XFxcImlzRm9sZGVyXFxcIiBjbGFzcz1cXFwiZmFcXFwiPjwvc3Bhbj5cXG4gIDxzcGFuIHYtaWY9XFxcImlzRm9sZGVyXFxcIiBAY2xpY2s9XFxcInRvZ2dsZSgndHJ1ZScpXFxcIiA6Y2xhc3M9XFxcIlt0cmlDbGFzcygpXVxcXCIgY2xhc3M9XFxcImZhXFxcIj48L3NwYW4+XFxuICA8c3BhbiB2LWVsc2UgQGNsaWNrPVxcXCJ0b2dnbGVcXFwiIDpjbGFzcz1cXFwiW2xheWVyc3RyZWUudmlzaWJsZSAgPyAnZmEtY2hlY2stc3F1YXJlLW8nOiAnZmEtc3F1YXJlLW8nLGxheWVyc3RyZWUuZGlzYWJsZWQgID8gJ2Rpc2FibGVkJzogJyddXFxcIiBjbGFzcz1cXFwiZmFcXFwiIHN0eWxlPVxcXCJjdXJzb3I6ZGVmYXVsdFxcXCI+PC9zcGFuPlxcbiAgPHNwYW4gaWQ9XFxcInRyZWUtbm9kZS10aXRsZVxcXCIgOmNsYXNzPVxcXCJ7Ym9sZDogaXNGb2xkZXIsIGRpc2FibGVkOiBsYXllcnN0cmVlLmRpc2FibGVkfVxcXCIgQGNsaWNrPVxcXCJzZWxlY3RcXFwiPnt7bGF5ZXJzdHJlZS50aXRsZX19PC9zcGFuPlxcbiAgPHVsIHYtc2hvdz1cXFwibGF5ZXJzdHJlZS5leHBhbmRlZFxcXCIgdi1pZj1cXFwiaXNGb2xkZXJcXFwiPlxcbiAgICA8dHJpc3RhdGUtdHJlZSA6bl9wYXJlbnQtY2hpbGRzLnN5bmM9XFxcIm5fcGFyZW50Q2hpbGRzXFxcIiA6bGF5ZXJzdHJlZT1cXFwibGF5ZXJzdHJlZVxcXCIgOmNoZWNrZWQ9XFxcInBhcmVudENoZWNrZWRcXFwiIHYtZm9yPVxcXCJsYXllcnN0cmVlIGluIGxheWVyc3RyZWUubm9kZXNcXFwiPlxcbiAgICA8L3RyaXN0YXRlLXRyZWU+XFxuICA8L3VsPlxcbjwvbGk+XFxuXFxuXFxuXFxuXFxuXCI7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG5cbnZhciBDb21wb25lbnQgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIHZhciBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5pbnRlcm5hbENvbXBvbmVudCA9IG51bGw7XG4gIHRoaXMuaWQgPSBvcHRpb25zLmlkIHx8IE1hdGgucmFuZG9tKCkgKiAxMDAwO1xuICB0aGlzLnRpdGxlID0gb3B0aW9ucy50aXRsZSB8fCAnJ1xuICB0aGlzLnN0YXRlID0ge1xuICAgIHZpc2libGU6IG9wdGlvbnMudmlzaWJsZSB8fCB0cnVlLFxuICAgIG9wZW46IG9wdGlvbnMub3BlbiB8fCBmYWxzZVxuICB9XG59O1xuaW5oZXJpdChDb21wb25lbnQsRzNXT2JqZWN0KTtcblxudmFyIHByb3RvID0gQ29tcG9uZW50LnByb3RvdHlwZTtcblxucHJvdG8uZ2V0SWQgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5pZDtcbn07XG5cbnByb3RvLmdldFRpdGxlID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuc3RhdGUudGl0bGU7XG59O1xuXG5wcm90by5zZXRUaXRsZSA9IGZ1bmN0aW9uKHRpdGxlKSB7XG4gIHRoaXMuc3RhdGUudGl0bGUgPSB0aXRsZTtcbn07XG5cbi8vaW1wbGVtZW50YXRpIGR1ZSBtZXRvZGkgcGVyIHBvdGVyIHVuaWZpY2FyZSBpbCBtZXRvZG8gZGkgcmVjdXBlcm8gZGVsIHNlcnZpemlvXG4vL2xlZ2F0byBhbCBjb21wb25lbnRlXG5cbnByb3RvLmdldFNlcnZpY2UgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuX3NlcnZpY2U7XG59O1xuXG5wcm90by5zZXRTZXJ2aWNlID0gZnVuY3Rpb24oc2VydmljZUluc3RhbmNlKSB7XG4gIHRoaXMuX3NlcnZpY2UgPSBzZXJ2aWNlSW5zdGFuY2U7XG59O1xuXG4vLy8vLy8vLy8vIGZpbmUgbWV0b2RpIFNlcnZpY2UgQ29tcG9uZW50cyAvLy8vLy8vLy8vXG5cbi8qIEhPT0tTICovXG5cbi8qIFxuICogSWwgbWV0b2RvIHBlcm1ldHRlIGFsIGNvbXBvbmVudGUgZGkgbW9udGFyc2kgbmVsIERPTVxuICogcGFyZW50RWw6IGVsZW1lbnRvIERPTSBwYWRyZSwgc3UgY3VpIGluc2VyaXJzaTsgXG4gKiByaXRvcm5hIHVuYSBwcm9taXNlLCByaXNvbHRhIG5lbCBtb21lbnRvIGluIGN1aSBzYXLDoCB0ZXJtaW5hdG8gaWwgbW9udGFnZ2lvXG4qL1xucHJvdG8ubW91bnQgPSBmdW5jdGlvbihwYXJlbnQpe307XG5cbi8qXG4gKiBNZXRvZG8gcmljaGlhbWF0byBxdWFuZG8gc2kgdnVvbGUgcmltdW92ZXJlIGlsIGNvbXBvbmVudGUuXG4gKiBSaXRvcm5hIHVuYSBwcm9tZXNzYSBjaGUgc2Fyw6Agcmlzb2x0YSBuZWwgbW9tZW50byBpbiBjdWkgaWwgY29tcG9uZW50ZSBhdnLDoCBjb21wbGV0YXRvIGxhIHByb3ByaWEgcmltb3ppb25lIChlZCBldmVudHVhbGUgcmlsYXNjaW8gZGkgcmlzb3JzZSBkaXBlbmRlbnRpKVxuKi9cbnByb3RvLnVubW91bnQgPSBmdW5jdGlvbigpe307XG5cbi8qIFxuICogTWV0b2RvIChvcHppb25hbGUpIGNoZSBvZmZyZSBsJ29wcG9ydHVuaXTDoCBkaSByaWNhbGNvbGFyZSBwcm9wcmlldMOgIGRpcGVuZGVudGkgZGFsbGUgZGltZW5zaW9uaSBkZWwgcGFkcmVcbiAqIHBhcmVudEhlaWdodDogbnVvdmEgYWx0ZXp6YSBkZWwgcGFyZW50XG4gKiBwYXJlbnRXaWR0aDogbnVvdmEgbGFyZ2hlenphIGRlbCBwYXJlbnRcbiAqIHJpY2hpYW1hdG8gb2duaSB2b2x0YSBjaGUgaWwgcGFyZW50IHN1YmlzY2UgdW4gcmlkaW1lbnNpb25hbWVudG9cbiovXG5wcm90by5sYXlvdXQgPSBmdW5jdGlvbihwYXJlbnRXaWR0aCxwYXJlbnRIZWlnaHQpe307XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7XG4iLCJ2YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xuXG5mdW5jdGlvbiBDb21wb25lbnRzUmVnaXN0cnkoKSB7XG4gIHRoaXMuY29tcG9uZW50cyA9IHt9O1xuICBcbiAgdGhpcy5yZWdpc3RlckNvbXBvbmVudCA9IGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgIHZhciBpZCA9IGNvbXBvbmVudC5nZXRJZCgpO1xuICAgIGlmICghdGhpcy5jb21wb25lbnRzW2lkXSkge1xuICAgICAgdGhpcy5jb21wb25lbnRzW2lkXSA9IGNvbXBvbmVudDtcbiAgICB9XG4gIH07IFxuICBcbiAgdGhpcy5nZXRDb21wb25lbnQgPSBmdW5jdGlvbihpZCkge1xuICAgIHJldHVybiB0aGlzLmNvbXBvbmVudHNbaWRdO1xuICB9O1xuICBcbiAgdGhpcy51bnJlZ2lzdGVyQ29tcG9uZW50ID0gZnVuY3Rpb24oaWQpIHtcbiAgICB2YXIgY29tcG9uZW50ID0gdGhpcy5fY29tcG9uZW50c1tpZF07XG4gICAgaWYgKGNvbXBvbmVudCkge1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihjb21wb25lbnQuZGVzdHJveSkpIHtcbiAgICAgICAgY29tcG9uZW50LmRlc3Ryb3koKTtcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSBjb21wb25lbnQ7XG4gICAgICB0aGlzLl9jb21wb25lbnRzW2lkXSA9IG51bGw7XG4gICAgfVxuICB9O1xufVxuaW5oZXJpdChDb21wb25lbnRzUmVnaXN0cnksRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQ29tcG9uZW50c1JlZ2lzdHJ5O1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciByZXNvbHZlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlc29sdmU7XG52YXIgcmVqZWN0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlamVjdDtcbnZhciBHVUkgPSByZXF1aXJlKCdndWkvZ3VpJyk7XG52YXIgUGFuZWwgPSAgcmVxdWlyZSgnZ3VpL3BhbmVsJyk7XG52YXIgUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24gPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9pbnRlcmFjdGlvbnMvcGlja2Nvb3JkaW5hdGVzaW50ZXJhY3Rpb24nKTtcbnZhciBRdWVyeVNlcnZpY2UgPSByZXF1aXJlKCdjb3JlL3F1ZXJ5L3F1ZXJ5c2VydmljZScpO1xuXG5WdWUuZmlsdGVyKCdzdGFydGNhc2UnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIF8uc3RhcnRDYXNlKHZhbHVlKTtcbn0pO1xuXG5WdWUuZmlsdGVyKCdsb3dlckNhc2UnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIF8ubG93ZXJDYXNlKHZhbHVlKTtcbn0pO1xuXG5WdWUuZmlsdGVyKCdyZWxhdGlvbnBsdXJhbCcsIGZ1bmN0aW9uIChyZWxhdGlvbikge1xuICByZXR1cm4gKHJlbGF0aW9uLnBsdXJhbCkgPyByZWxhdGlvbi5wbHVyYWwgOiBfLnN0YXJ0Q2FzZShyZWxhdGlvbi5uYW1lKTtcbn0pO1xuXG5WdWUudmFsaWRhdG9yKCdlbWFpbCcsIGZ1bmN0aW9uICh2YWwpIHtcbiAgcmV0dXJuIC9eKChbXjw+KClbXFxdXFxcXC4sOzpcXHNAXFxcIl0rKFxcLltePD4oKVtcXF1cXFxcLiw7Olxcc0BcXFwiXSspKil8KFxcXCIuK1xcXCIpKUAoKFxcW1swLTldezEsM31cXC5bMC05XXsxLDN9XFwuWzAtOV17MSwzfVxcLlswLTldezEsM31cXF0pfCgoW2EtekEtWlxcLTAtOV0rXFwuKStbYS16QS1aXXsyLH0pKSQvLnRlc3QodmFsKVxufSk7XG5cblZ1ZS52YWxpZGF0b3IoJ2ludGVnZXInLCBmdW5jdGlvbiAodmFsKSB7XG4gIHJldHVybiAvXigtP1sxLTldXFxkKnwwKSQvLnRlc3QodmFsKTtcbn0pXG5cbnZhciBGb3JtUGFuZWwgPSBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vZm9ybXBhbmVsLmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXRlOiB7fSxcbiAgICB9XG4gIH0sXG4gIHRyYW5zaXRpb25zOiB7J2FkZHJlbW92ZXRyYW5zaXRpb24nOiAnc2hvd2hpZGUnfSxcbiAgbWV0aG9kczoge1xuICAgIGV4ZWM6IGZ1bmN0aW9uKGNiayl7XG4gICAgICB2YXIgcmVsYXRpb25zID0gdGhpcy5zdGF0ZS5yZWxhdGlvbnMgfHwgbnVsbDtcbiAgICAgIGNiayh0aGlzLnN0YXRlLmZpZWxkcyxyZWxhdGlvbnMpO1xuICAgICAgR1VJLmNsb3NlRm9ybSgpO1xuICAgIH0sXG4gICAgYnRuRW5hYmxlZDogZnVuY3Rpb24oYnV0dG9uKSB7XG4gICAgICByZXR1cm4gYnV0dG9uLnR5cGUgIT0gJ3NhdmUnIHx8IChidXR0b24udHlwZSA9PSAnc2F2ZScgJiYgdGhpcy4kdmFsaWRhdGlvbi52YWxpZCk7XG4gICAgfSxcbiAgICBoYXNGaWVsZHNSZXF1aXJlZDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy4kb3B0aW9ucy5mb3JtLl9oYXNGaWVsZHNSZXF1aXJlZCgpO1xuICAgIH0sXG4gICAgaXNFZGl0YWJsZTogZnVuY3Rpb24oZmllbGQpe1xuICAgICAgcmV0dXJuIHRoaXMuJG9wdGlvbnMuZm9ybS5faXNFZGl0YWJsZShmaWVsZCk7XG4gICAgfSxcbiAgICBpc1NpbXBsZTogZnVuY3Rpb24oZmllbGQpe1xuICAgICAgcmV0dXJuIHRoaXMuJG9wdGlvbnMuZm9ybS5faXNTaW1wbGUoZmllbGQpO1xuICAgIH0sXG4gICAgaXNUZXh0YXJlYTogZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgIHJldHVybiB0aGlzLiRvcHRpb25zLmZvcm0uX2lzVGV4dGFyZWEoZmllbGQpO1xuICAgIH0sXG4gICAgaXNTZWxlY3Q6IGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgIHJldHVybiB0aGlzLiRvcHRpb25zLmZvcm0uX2lzU2VsZWN0KGZpZWxkKTtcbiAgICB9LFxuICAgIGlzTGF5ZXJQaWNrZXI6IGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgIHJldHVybiB0aGlzLiRvcHRpb25zLmZvcm0uX2lzTGF5ZXJQaWNrZXIoZmllbGQpO1xuICAgIH0sXG4gICAgbGF5ZXJQaWNrZXJQbGFjZUhvbGRlcjogZnVuY3Rpb24oZmllbGQpe1xuICAgICAgcmV0dXJuIHRoaXMuJG9wdGlvbnMuZm9ybS5fZ2V0bGF5ZXJQaWNrZXJMYXllck5hbWUoZmllbGQuaW5wdXQub3B0aW9ucy5sYXllcmlkKTtcbiAgICB9LFxuICAgIHBpY2tMYXllcjogZnVuY3Rpb24oZmllbGQpe1xuICAgICAgdGhpcy4kb3B0aW9ucy5mb3JtLl9waWNrTGF5ZXIoZmllbGQpO1xuICAgIH0sXG4gICAgaXNWaXNpYmxlOiBmdW5jdGlvbihmaWVsZCl7XG4gICAgICByZXR1cm4gdGhpcy4kb3B0aW9ucy5mb3JtLl9pc1Zpc2libGUoZmllbGQpO1xuICAgIH0sXG4gICAgc2hvd1JlbGF0aW9uOiBmdW5jdGlvbihyZWxhdGlvbil7XG4gICAgICByZXR1cm4gdGhpcy4kb3B0aW9ucy5mb3JtLl9zaG91bGRTaG93UmVsYXRpb24ocmVsYXRpb24pO1xuICAgIH0sXG4gICAgcmVsYXRpb25Qa0ZpZWxkTmFtZTogZnVuY3Rpb24ocmVsYXRpb24pIHtcbiAgICAgIHJldHVybiByZWxhdGlvbi5waztcbiAgICB9LFxuICAgIGlzUmVsYXRpb25FbGVtZW50RGVsZXRhYmxlOiBmdW5jdGlvbihyZWxhdGlvbixlbGVtZW50KSB7XG4gICAgICB2YXIgbWluID0gMTtcbiAgICAgIGlmIChyZWxhdGlvbi5taW4pIHtcbiAgICAgICAgbWluID0gTWF0aC5taW4obWluLnJlbGF0aW9uLm1pbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWluIDwgcmVsYXRpb24uZWxlbWVudHMubGVuZ3RoO1xuICAgIH0sXG4gICAgY2FuQWRkUmVsYXRpb25FbGVtZW50czogZnVuY3Rpb24ocmVsYXRpb24pIHtcbiAgICAgIHZhciBjYW5BZGQgPSB0cnVlO1xuICAgICAgaWYgKHJlbGF0aW9uLnR5cGUgPT0gJ09ORScpIHtcbiAgICAgICAgY2FuQWRkID0gKHJlbGF0aW9uLmVsZW1lbnRzLmxlbmd0aCkgPyBmYWxzZSA6IHRydWUgLy8gc2Ugw6ggdW5hIHJlbGF6aW9uZSAxOjEgZSBub24gaG8gZWxlbWVudGksIGxvIHBvc3NvIGFnZ2l1bmdlcmUsIGFsdHJpbWVudGkgbm9cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2YXIgbWF4ID0gcmVsYXRpb24ubWF4ID8gcmVsYXRpb24ubWF4IDogTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuICAgICAgICBjYW5BZGQgPSByZWxhdGlvbi5lbGVtZW50cy5sZW5ndGggPCBtYXg7IFxuICAgICAgfVxuICAgICAgcmV0dXJuIGNhbkFkZDtcbiAgICB9LFxuICAgIGFkZFJlbGF0aW9uRWxlbWVudDogZnVuY3Rpb24ocmVsYXRpb24pIHtcbiAgICAgIHRoaXMuJG9wdGlvbnMuZm9ybS5fYWRkUmVsYXRpb25FbGVtZW50KHJlbGF0aW9uKTtcbiAgICB9LFxuICAgIHJlbW92ZVJlbGF0aW9uRWxlbWVudDogZnVuY3Rpb24ocmVsYXRpb24sZWxlbWVudCl7XG4gICAgICB0aGlzLiRvcHRpb25zLmZvcm0uX3JlbW92ZVJlbGF0aW9uRWxlbWVudChyZWxhdGlvbixlbGVtZW50KTtcbiAgICB9LFxuICAgIGZpZWxkc1N1YnNldDogZnVuY3Rpb24oZmllbGRzKSB7XG4gICAgICB2YXIgZW5kID0gTWF0aC5taW4oMyxmaWVsZHMubGVuZ3RoKTtcbiAgICAgIHJldHVybiBmaWVsZHMuc2xpY2UoMCxlbmQpO1xuICAgIH0sXG4gICAgZmllbGRzU3Vic2V0TGVuZ3RoOiBmdW5jdGlvbihmaWVsZHMpIHtcbiAgICAgIHJldHVybiB0aGlzLmZpZWxkc1N1YnNldChmaWVsZHMpLmxlbmd0aDtcbiAgICB9LFxuICAgIGNvbGxhcHNlRWxlbWVudEJveDogZnVuY3Rpb24ocmVsYXRpb24sZWxlbWVudCkge1xuICAgICAgdmFyIGJveGlkID0gdGhpcy5nZXRVbmlxdWVSZWxhdGlvbkVsZW1lbnRpZChyZWxhdGlvbixlbGVtZW50KTtcbiAgICAgIGlmICh0aGlzLnN0YXRlLmVsZW1lbnRzQm94ZXNbYm94aWRdKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0YXRlLmVsZW1lbnRzQm94ZXNbYm94aWRdLmNvbGxhcHNlZDtcbiAgICAgIH1cbiAgICB9LFxuICAgIHRvZ2dsZUVsZW1lbnRCb3g6IGZ1bmN0aW9uKHJlbGF0aW9uLGVsZW1lbnQpIHtcbiAgICAgIHZhciBib3hpZCA9IHRoaXMuZ2V0VW5pcXVlUmVsYXRpb25FbGVtZW50aWQocmVsYXRpb24sZWxlbWVudCk7XG4gICAgICB0aGlzLnN0YXRlLmVsZW1lbnRzQm94ZXNbYm94aWRdLmNvbGxhcHNlZCA9ICF0aGlzLnN0YXRlLmVsZW1lbnRzQm94ZXNbYm94aWRdLmNvbGxhcHNlZDtcbiAgICB9LFxuICAgIGdldFVuaXF1ZVJlbGF0aW9uRWxlbWVudGlkOiBmdW5jdGlvbihyZWxhdGlvbixlbGVtZW50KXtcbiAgICAgIHJldHVybiB0aGlzLiRvcHRpb25zLmZvcm0uZ2V0VW5pcXVlUmVsYXRpb25FbGVtZW50aWQocmVsYXRpb24sZWxlbWVudCk7XG4gICAgfVxuICB9LFxuICBjb21wdXRlZDoge1xuICAgIGlzVmFsaWQ6IGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICByZXR1cm4gdGhpcy4kdmFsaWRhdGUoZmllbGQubmFtZSk7XG4gICAgfSxcbiAgICBoYXNSZWxhdGlvbnM6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gdGhpcy5zdGF0ZS5yZWxhdGlvbnMubGVuZ3RoXG4gICAgfSxcbiAgfVxufSk7XG5cbnZhciBJbnB1dHMgPSB7fTtcbklucHV0cy5TVFJJTkcgPSAnc3RyaW5nJztcbklucHV0cy5JTlRFR0VSID0gJ2ludGVnZXInO1xuSW5wdXRzLkZMT0FUID0gJ2Zsb2F0JztcblxuSW5wdXRzLmRlZmF1bHRzID0ge307XG5JbnB1dHMuZGVmYXVsdHNbSW5wdXRzLlNUUklOR10gPSBcIlwiO1xuSW5wdXRzLmRlZmF1bHRzW0lucHV0cy5JTlRFR0VSXSA9IDA7XG5JbnB1dHMuZGVmYXVsdHNbSW5wdXRzLkZMT0FUXSA9IDAuMDtcbklucHV0cy5zaW1wbGVGaWVsZFR5cGVzID0gW0lucHV0cy5TVFJJTkcsSW5wdXRzLklOVEVHRVIsSW5wdXRzLkZMT0FUXTtcblxuSW5wdXRzLlRFWFRBUkVBID0gJ3RleHRhcmVhJztcbklucHV0cy5TRUxFQ1QgPSAnc2VsZWN0JztcbklucHV0cy5MQVlFUlBJQ0tFUiA9ICdsYXllcnBpY2tlcic7XG5cbklucHV0cy5zcGVjaWFsSW5wdXRzID0gW0lucHV0cy5URVhUQVJFQSxJbnB1dHMuU0VMRUNULElucHV0cy5MQVlFUlBJQ0tFUl07XG5cbmZ1bmN0aW9uIEZvcm0ob3B0aW9ucyl7XG4gIC8vIHByb3ByaWV0w6AgbmVjZXNzYXJpZS4gSW4gZnV0dXJvIGxlIG1ldHRlcm1vIGluIHVuYSBjbGFzc2UgUGFuZWwgZGEgY3VpIGRlcml2ZXJhbm5vIHR1dHRpIGkgcGFubmVsbGkgY2hlIHZvZ2xpb25vIGVzc2VyZSBtb3N0cmF0aSBuZWxsYSBzaWRlYmFyXG4gIHRoaXMuaW50ZXJuYWxDb21wb25lbnQgPSBudWxsO1xuICB0aGlzLm9wdGlvbnMgPSAgb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5wcm92aWRlciA9IG9wdGlvbnMucHJvdmlkZXI7XG4gIHRoaXMuaWQgPSBvcHRpb25zLmlkOyAvLyBpZCBkZWwgZm9ybVxuICB0aGlzLm5hbWUgPSBvcHRpb25zLm5hbWU7IC8vIG5vbWUgZGVsIGZvcm1cbiAgdGhpcy5kYXRhaWQgPSBvcHRpb25zLmRhdGFpZDsgLy8gXCJhY2Nlc3NpXCIsIFwiZ2l1bnppb25pXCIsIGVjYy5cbiAgdGhpcy5wayA9IG9wdGlvbnMucGsgfHwgbnVsbCwgLy8gZXZlbnR1YWxlIGNoaWF2ZSBwcmltYXJpYSAobm9uIHR1dHRpIGkgZm9ybSBwb3RyZWJiZXJvIGF2ZXJjZWxhIG8gYXZlcm5lIGJpc29nbm9cbiAgdGhpcy5pc25ldyA9ICghXy5pc05pbChvcHRpb25zLmlzbmV3KSAmJiBfLmlzQm9vbGVhbihvcHRpb25zLmlzbmV3KSkgPyBvcHRpb25zLmlzbmV3IDogdHJ1ZTtcbiAgXG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgLy8gaSBkYXRpIGRlbCBmb3JtIHBvc3Nvbm8gYXZlcmUgbyBtZW5vIHVuYSBwcmltYXJ5IGtleVxuICAgIGZpZWxkczogb3B0aW9ucy5maWVsZHMsXG4gICAgcmVsYXRpb25zOiBvcHRpb25zLnJlbGF0aW9uc1xuICB9XG4gIFxuICB0aGlzLl9mb3JtUGFuZWwgPSBvcHRpb25zLmZvcm1QYW5lbCB8fCBGb3JtUGFuZWw7XG4gIHRoaXMuX2RlZmF1bHRzID0gb3B0aW9ucy5kZWZhdWx0cyB8fCBJbnB1dHMuZGVmYXVsdHM7XG59XG5pbmhlcml0KEZvcm0sUGFuZWwpO1xuXG52YXIgcHJvdG8gPSBGb3JtLnByb3RvdHlwZTtcblxuLy8gdmllbmUgcmljaGlhbWF0byBkYWxsYSB0b29sYmFyIHF1YW5kbyBpbCBwbHVnaW4gY2hpZWRlIGRpIG1vc3RyYXJlIHVuIHByb3ByaW8gcGFubmVsbG8gbmVsbGEgR1VJIChHVUkuc2hvd1BhbmVsKVxucHJvdG8ubW91bnQgPSBmdW5jdGlvbihjb250YWluZXIpe1xuICB0aGlzLl9zZXR1cEZpZWxkcygpO1xuICB2YXIgcGFuZWwgPSB0aGlzLl9zZXR1cFBhbmVsKCk7XG4gIHRoaXMuX21vdW50UGFuZWwocGFuZWwsY29udGFpbmVyKTtcbiAgcmV0dXJuIHJlc29sdmUodHJ1ZSk7XG59O1xuXG5wcm90by5fbW91bnRQYW5lbCA9IGZ1bmN0aW9uKHBhbmVsLGNvbnRhaW5lcil7XG4gIHBhbmVsLiRtb3VudCgpLiRhcHBlbmRUbyhjb250YWluZXIpO1xufTtcblxuLy8gcmljaGlhbWF0byBxdWFuZG8gbGEgR1VJIGNoaWVkZSBkaSBjaGl1ZGVyZSBpbCBwYW5uZWxsby4gU2Ugcml0b3JuYSBmYWxzZSBpbCBwYW5uZWxsbyBub24gdmllbmUgY2hpdXNvXG5wcm90by51bm1vdW50ID0gZnVuY3Rpb24oKXtcbiAgdGhpcy5pbnRlcm5hbENvbXBvbmVudC4kZGVzdHJveSh0cnVlKTtcbiAgdGhpcy5pbnRlcm5hbENvbXBvbmVudCA9IG51bGw7XG4gIHJldHVybiByZXNvbHZlKHRydWUpO1xufTtcblxucHJvdG8uX2lzTmV3ID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuaXNuZXc7XG59O1xuXG5wcm90by5faGFzRmllbGRzUmVxdWlyZWQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNvbWVGaWVsZHNSZXF1aXJlZCA9IF8uc29tZSh0aGlzLnN0YXRlLmZpZWxkcyxmdW5jdGlvbihmaWVsZCl7XG4gICAgcmV0dXJuIGZpZWxkLnZhbGlkYXRlICYmIGZpZWxkLnZhbGlkYXRlLnJlcXVpcmVkO1xuICB9KTtcbiAgdmFyIHNvbWVSZWxhdGlvbnNSZXF1aXJlZCA9IF8uc29tZSh0aGlzLnN0YXRlLnJlbGF0aW9ucyxmdW5jdGlvbihyZWxhdGlvbil7XG4gICAgcmV0dXJuIHJlbGF0aW9uLnZhbGlkYXRlICYmIHJlbGF0aW9uLnZhbGlkYXRlLnJlcXVpcmVkO1xuICB9KTtcbiAgcmV0dXJuIHNvbWVGaWVsZHNSZXF1aXJlZCB8fCBzb21lUmVsYXRpb25zUmVxdWlyZWQ7XG59O1xuXG5wcm90by5faXNWaXNpYmxlID0gZnVuY3Rpb24oZmllbGQpe1xuICBpZighZmllbGQuZWRpdGFibGUgJiYgKGZpZWxkLnZhbHVlID09IFwiXCIgfHwgXy5pc051bGwoZmllbGQudmFsdWUpKSl7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5wcm90by5faXNFZGl0YWJsZSA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgcmV0dXJuIGZpZWxkLmVkaXRhYmxlO1xufTtcblxucHJvdG8uX2lzU2ltcGxlID0gZnVuY3Rpb24oZmllbGQpe1xuICBpZiAoXy5pbmNsdWRlcyhJbnB1dHMuc3BlY2lhbElucHV0cyxmaWVsZC5pbnB1dC50eXBlKSl7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiBfLmluY2x1ZGVzKElucHV0cy5zaW1wbGVGaWVsZFR5cGVzLGZpZWxkLnR5cGUpXG59O1xuXG5wcm90by5faXNUZXh0YXJlYSA9IGZ1bmN0aW9uKGZpZWxkKSB7XG4gIHJldHVybiAoZmllbGQuaW5wdXQudHlwZSA9PSBJbnB1dHMuVEVYVEFSRUEpO1xufTtcblxucHJvdG8uX2lzU2VsZWN0ID0gZnVuY3Rpb24oZmllbGQpe1xuICByZXR1cm4gKF8uaW5jbHVkZXMoSW5wdXRzLnNwZWNpYWxJbnB1dHMsZmllbGQuaW5wdXQudHlwZSkgJiYgZmllbGQuaW5wdXQudHlwZSA9PSBJbnB1dHMuU0VMRUNUKTtcbn07XG5cbnByb3RvLl9pc0xheWVyUGlja2VyID0gZnVuY3Rpb24oZmllbGQpe1xuICByZXR1cm4gKF8uaW5jbHVkZXMoSW5wdXRzLnNwZWNpYWxJbnB1dHMsZmllbGQuaW5wdXQudHlwZSkgJiYgZmllbGQuaW5wdXQudHlwZSA9PSBJbnB1dHMuTEFZRVJQSUNLRVIpO1xufTtcblxucHJvdG8uX3BpY2tMYXllciA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICAvLyByaXRvcm5vIHVuYSBwcm9tZXNzYSwgc2UgcXVhbGN1biBhbHRybyB2b2xlc3NlIHVzYXJlIGlsIHJpc3VsdGF0byAoZXMuIHBlciBzZXR0YXJlIGFsdHJpIGNhbXBpIGluIGJhc2UgYWxsYSBmZWF0dXJlIHNlbGV6aW9uYXRhKVxuICB2YXIgZCA9ICQuRGVmZXJyZWQoKTtcbiAgLy8gZGlzYWJpbGl0byB0ZW1wb3JhbmVtYW50ZSBsbyBzdHJhdG8gbW9kYWxlIHBlciBwZXJtZXR0ZXJlIGwnaW50ZXJhemlvbmUgY29uIGxhIG1hcHBhXG4gIEdVSS5zZXRNb2RhbChmYWxzZSk7XG4gIG1hcFNlcnZpY2UgPSBHVUkuZ2V0Q29tcG9uZW50KCdtYXAnKS5nZXRTZXJ2aWNlKCk7XG4gIHZhciBsYXllciA9IG1hcFNlcnZpY2UuZ2V0UHJvamVjdCgpLmdldExheWVyQnlJZChmaWVsZC5pbnB1dC5vcHRpb25zLmxheWVyaWQpO1xuICB2YXIgcmVsRmllbGROYW1lID0gZmllbGQuaW5wdXQub3B0aW9ucy5maWVsZDtcbiAgdmFyIHJlbEZpZWxkTGFiZWwgPSBsYXllci5nZXRBdHRyaWJ1dGVMYWJlbChmaWVsZC5pbnB1dC5vcHRpb25zLmZpZWxkKTtcbiAgXG4gIHRoaXMuX3BpY2tJbnRlcmFjdGlvbiA9IG5ldyBQaWNrQ29vcmRpbmF0ZXNJbnRlcmFjdGlvbigpO1xuICBtYXBTZXJ2aWNlLmFkZEludGVyYWN0aW9uKHRoaXMuX3BpY2tJbnRlcmFjdGlvbik7XG4gIHRoaXMuX3BpY2tJbnRlcmFjdGlvbi5vbigncGlja2VkJyxmdW5jdGlvbihlKXsgICBcbiAgICBRdWVyeVNlcnZpY2UucXVlcnlCeUxvY2F0aW9uKGUuY29vcmRpbmF0ZSwgW2xheWVyXSlcbiAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICB2YXIgZmVhdHVyZXNGb3JMYXllcnMgPSByZXNwb25zZS5kYXRhO1xuICAgICAgaWYgKGZlYXR1cmVzRm9yTGF5ZXJzLmxlbmd0aCAmJiBmZWF0dXJlc0ZvckxheWVyc1swXS5mZWF0dXJlcy5sZW5ndGgpIHsgXG4gICAgICAgIHZhciBhdHRyaWJ1dGVzID0gZmVhdHVyZXNGb3JMYXllcnNbMF0uZmVhdHVyZXNbMF0uZ2V0UHJvcGVydGllcygpOyAvLyBwcmVuZG8gbGEgcHJpbWEgZmVhdHVyZSBkZWwgcHJpbW8gKGUgdW5pY28pIGxheWVyXG4gICAgICAgIHZhciB2YWx1ZSA9IGF0dHJpYnV0ZXNbcmVsRmllbGROYW1lXSA/IGF0dHJpYnV0ZXNbcmVsRmllbGROYW1lXSA6IGF0dHJpYnV0ZXNbcmVsRmllbGRMYWJlbF07XG4gICAgICAgIGZpZWxkLnZhbHVlID0gdmFsdWU7XG4gICAgICAgIGQucmVzb2x2ZShhdHRyaWJ1dGVzKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkLnJlamVjdCgpO1xuICAgICAgfVxuICAgIH0pXG4gICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgIGQucmVqZWN0KCk7XG4gICAgfSlcbiAgICAuYWx3YXlzKGZ1bmN0aW9uKCl7XG4gICAgICBtYXBTZXJ2aWNlLnJlbW92ZUludGVyYWN0aW9uKHNlbGYuX3BpY2tJbnRlcmFjdGlvbik7XG4gICAgICBzZWxmLl9waWNrSW50ZXJhY3Rpb24gPSBudWxsO1xuICAgIH0pXG4gIH0pXG4gIHJldHVybiBkLnByb21pc2UoKTtcbn07XG5cbnByb3RvLl9nZXREZWZhdWx0VmFsdWUgPSBmdW5jdGlvbihmaWVsZCl7XG4gIHZhciBkZWZhdWx0VmFsdWUgPSBudWxsO1xuICBpZiAoZmllbGQuaW5wdXQgJiYgZmllbGQuaW5wdXQub3B0aW9ucyAmJiBmaWVsZC5pbnB1dC5vcHRpb25zLmRlZmF1bHQpe1xuICAgIGRlZmF1bHRWYWx1ZSA9IGZpZWxkLmlucHV0Lm9wdGlvbnMuZGVmYXVsdDtcbiAgfVxuICBlbHNlIGlmICh0aGlzLl9pc1NlbGVjdChmaWVsZCkpe1xuICAgIGRlZmF1bHRWYWx1ZSA9IGZpZWxkLmlucHV0Lm9wdGlvbnMudmFsdWVzWzBdLmtleTtcbiAgfVxuICAvKmVsc2Uge1xuICAgIGRlZmF1bHRWYWx1ZSA9IHRoaXMuX2RlZmF1bHRzW2ZpZWxkLnR5cGVdO1xuICB9Ki9cbiAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbn07XG5cbnByb3RvLl9nZXRsYXllclBpY2tlckxheWVyTmFtZSA9IGZ1bmN0aW9uKGxheWVySWQpe1xuICBtYXBTZXJ2aWNlID0gR1VJLmdldENvbXBvbmVudCgnbWFwJykuZ2V0U2VydmljZSgpO1xuICB2YXIgbGF5ZXIgPSBtYXBTZXJ2aWNlLmdldFByb2plY3QoKS5nZXRMYXllckJ5SWQobGF5ZXJJZCk7XG4gIGlmIChsYXllcil7XG4gICAgcmV0dXJuIGxheWVyLmdldE5hbWUoKTtcbiAgfVxuICByZXR1cm4gXCJcIjtcbn07XG5cbnByb3RvLl9zaG91bGRTaG93UmVsYXRpb24gPSBmdW5jdGlvbihyZWxhdGlvbil7XG4gIHJldHVybiB0cnVlO1xufTtcblxuLy8gcGVyIGRlZmluaXJlIGkgdmFsb3JpIGRpIGRlZmF1bHQgbmVsIGNhc28gc2kgdHJhdHRhIGRpIHVuIG51b3ZvIGluc2VyaW1lbnRvXG5wcm90by5fc2V0dXBGaWVsZHMgPSBmdW5jdGlvbigpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIFxuICB2YXIgZmllbGRzID0gXy5maWx0ZXIodGhpcy5zdGF0ZS5maWVsZHMsZnVuY3Rpb24oZmllbGQpe1xuICAgIC8vIHR1dHRpIGkgY2FtcGkgZWNjZXR0byBsYSBQSyAoc2Ugbm9uIG51bGxhKVxuICAgIGlmIChzZWxmLnBrICYmIGZpZWxkLnZhbHVlPT1udWxsKXtcbiAgICAgIHJldHVybiAoKGZpZWxkLm5hbWUgIT0gc2VsZi5waykpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG4gIFxuICBfLmZvckVhY2goZmllbGRzLGZ1bmN0aW9uKGZpZWxkKXtcbiAgICBpZihfLmlzTmlsKGZpZWxkLnZhbHVlKSl7XG4gICAgICB2YXIgZGVmYXVsdFZhbHVlID0gc2VsZi5fZ2V0RGVmYXVsdFZhbHVlKGZpZWxkKTtcbiAgICAgIGlmIChkZWZhdWx0VmFsdWUpe1xuICAgICAgICBmaWVsZC52YWx1ZSA9IGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICBcbiAgaWYgKHRoaXMuc3RhdGUucmVsYXRpb25zKXtcbiAgICB2YXIgcmVsYXRpb25zID0gdGhpcy5zdGF0ZS5yZWxhdGlvbnM7XG4gICAgXy5mb3JFYWNoKHJlbGF0aW9ucyxmdW5jdGlvbihyZWxhdGlvbil7XG4gICAgICBfLmZvckVhY2gocmVsYXRpb24uZWxlbWVudHMsZnVuY3Rpb24oZWxlbWVudCl7XG4gICAgICAgIF8uZm9yRWFjaChyZWxhdGlvbi5maWVsZHMsZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgIGlmKF8uaXNOaWwoZmllbGQudmFsdWUpKXtcbiAgICAgICAgICAgIHZhciBkZWZhdWx0VmFsdWUgPSBzZWxmLl9nZXREZWZhdWx0VmFsdWUoZmllbGQpO1xuICAgICAgICAgICAgaWYgKGRlZmF1bHRWYWx1ZSl7XG4gICAgICAgICAgICAgIGZpZWxkLnZhbHVlID0gZGVmYXVsdFZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cbn07XG5cbnByb3RvLl9zZXR1cFBhbmVsID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgcGFuZWwgPSB0aGlzLmludGVybmFsQ29tcG9uZW50ID0gbmV3IHRoaXMuX2Zvcm1QYW5lbCh7XG4gICAgZm9ybTogdGhpc1xuICB9KTtcbiAgaWYgKHRoaXMub3B0aW9ucy5idXR0b25zKSB7XG4gICAgcGFuZWwuYnV0dG9ucyA9IHRoaXMub3B0aW9ucy5idXR0b25zO1xuICB9XG4gIFxuICBcbiAgdmFyIGVsZW1lbnRzQm94ZXMgPSB7fTtcbiAgXG4gIF8uZm9yRWFjaCh0aGlzLnN0YXRlLnJlbGF0aW9ucyxmdW5jdGlvbihyZWxhdGlvbil7XG4gICAgXy5mb3JFYWNoKHJlbGF0aW9uLmVsZW1lbnRzLGZ1bmN0aW9uKGVsZW1lbnQpe1xuICAgICAgdmFyIGJveGlkID0gc2VsZi5nZXRVbmlxdWVSZWxhdGlvbkVsZW1lbnRpZChyZWxhdGlvbixlbGVtZW50KTtcbiAgICAgIGVsZW1lbnRzQm94ZXNbYm94aWRdID0ge1xuICAgICAgICBjb2xsYXBzZWQ6IHRydWVcbiAgICAgIH1cbiAgICB9KVxuICB9KVxuICB0aGlzLnN0YXRlLmVsZW1lbnRzQm94ZXMgPSBlbGVtZW50c0JveGVzO1xuICBwYW5lbC5zdGF0ZSA9IHRoaXMuc3RhdGU7XG4gIHJldHVybiBwYW5lbDtcbn07XG5cbnByb3RvLmdldFVuaXF1ZVJlbGF0aW9uRWxlbWVudGlkID0gZnVuY3Rpb24ocmVsYXRpb24sZWxlbWVudCl7XG4gIHJldHVybiByZWxhdGlvbi5uYW1lKydfJytlbGVtZW50LmlkO1xufTtcblxucHJvdG8uX2dldEZpZWxkID0gZnVuY3Rpb24oZmllbGROYW1lKXtcbiAgdmFyIGZpZWxkID0gbnVsbDtcbiAgXy5mb3JFYWNoKHRoaXMuc3RhdGUuZmllbGRzLGZ1bmN0aW9uKGYpe1xuICAgIGlmIChmLm5hbWUgPT0gZmllbGROYW1lKXtcbiAgICAgIGZpZWxkID0gZjtcbiAgICB9XG4gIH0pXG4gIHJldHVybiBmaWVsZDtcbn07XG5cbnByb3RvLl9hZGRSZWxhdGlvbkVsZW1lbnQgPSBmdW5jdGlvbihyZWxhdGlvbikge1xuICB2YXIgZWxlbWVudCA9IHRoaXMucHJvdmlkZXIuY3JlYXRlUmVsYXRpb25FbGVtZW50KHJlbGF0aW9uKTtcbiAgdmFyIGVsZW1lbnRCb3hJZCA9IHRoaXMuZ2V0VW5pcXVlUmVsYXRpb25FbGVtZW50aWQocmVsYXRpb24sZWxlbWVudCk7XG4gIFZ1ZS5zZXQodGhpcy5zdGF0ZS5lbGVtZW50c0JveGVzLGVsZW1lbnRCb3hJZCx7Y29sbGFwc2VkOmZhbHNlfSk7XG4gIHJlbGF0aW9uLmVsZW1lbnRzLnB1c2goZWxlbWVudCk7XG59O1xuXG5wcm90by5fcmVtb3ZlUmVsYXRpb25FbGVtZW50ID0gZnVuY3Rpb24ocmVsYXRpb24sZWxlbWVudCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgXy5mb3JFYWNoKHJlbGF0aW9uLmVsZW1lbnRzLGZ1bmN0aW9uKF9lbGVtZW50LGlkeFRvUmVtb3ZlKXtcbiAgICBpZiAoX2VsZW1lbnQuaWQgPT0gZWxlbWVudC5pZCkge1xuICAgICAgcmVsYXRpb24uZWxlbWVudHMuc3BsaWNlKGlkeFRvUmVtb3ZlLDEpO1xuICAgICAgZGVsZXRlIHNlbGYuc3RhdGUuZWxlbWVudHNCb3hlcy5lbG1lbnRCb3hJZDtcbiAgICB9XG4gIH0pXG59O1xuXG5wcm90by5fZ2V0UmVsYXRpb25GaWVsZCA9IGZ1bmN0aW9uKGZpZWxkTmFtZSxyZWxhdGlvbk5hbWUpe1xuICB2YXIgZmllbGQgPSBudWxsO1xuICBfLmZvckVhY2godGhpcy5zdGF0ZS5yZWxhdGlvbnMsZnVuY3Rpb24ocmVsYXRpb24sbmFtZSl7XG4gICAgaWYgKHJlbGF0aW9uTmFtZSA9PSBuYW1lKXtcbiAgICAgIF8uZm9yRWFjaChyZWxhdGlvbi5maWVsZHMsZnVuY3Rpb24oZil7XG4gICAgICAgIGlmIChmLm5hbWUgPT0gZmllbGROYW1lKXtcbiAgICAgICAgICBmaWVsZCA9IGY7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICB9KVxuICByZXR1cm4gZmllbGQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgRm9ybTogRm9ybSxcbiAgRm9ybVBhbmVsOiBGb3JtUGFuZWxcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2PlxcbiAgPHZhbGlkYXRvciBuYW1lPVxcXCJ2YWxpZGF0aW9uXFxcIj5cXG4gICAgPGZvcm0gbm92YWxpZGF0ZSBjbGFzcz1cXFwiZm9ybS1ob3Jpem9udGFsIGczdy1mb3JtXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJib3ggYm94LXByaW1hcnlcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYm94LWhlYWRlciB3aXRoLWJvcmRlclxcXCI+XFxuICAgICAgICAgIDxoMyBjbGFzcz1cXFwiYm94LXRpdGxlXFxcIj5BdHRyaWJ1dGkgZWxlbWVudG88L2gzPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJib3gtdG9vbHMgcHVsbC1yaWdodFxcXCI+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJib3gtYm9keVxcXCI+XFxuICAgICAgICAgIDx0ZW1wbGF0ZSB2LWZvcj1cXFwiZmllbGQgaW4gc3RhdGUuZmllbGRzXFxcIj5cXG4gICAgICAgICAgPGRpdiB2LWlmPVxcXCJpc1Zpc2libGUoZmllbGQpXFxcIiBjbGFzcz1cXFwiZm9ybS1ncm91cCBoYXMtZmVlZGJhY2tcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbCA6Zm9yPVxcXCJmaWVsZC5uYW1lXFxcIiBjbGFzcz1cXFwiY29sLXNtLTQgY29udHJvbC1sYWJlbFxcXCI+e3sgZmllbGQubGFiZWwgfX08c3BhbiB2LWlmPVxcXCJmaWVsZC52YWxpZGF0ZSAmJiBmaWVsZC52YWxpZGF0ZS5yZXF1aXJlZFxcXCI+Kjwvc3Bhbj48L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImNvbC1zbS04XFxcIj5cXG4gICAgICAgICAgICAgIDxpbnB1dCB2LWlmPVxcXCJpc1NpbXBsZShmaWVsZClcXFwiIDpmaWVsZD1cXFwiZmllbGQubmFtZVxcXCIgdi12YWxpZGF0ZT1cXFwiZmllbGQudmFsaWRhdGVcXFwiIHYtZGlzYWJsZWQ9XFxcIiFpc0VkaXRhYmxlKGZpZWxkKVxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgdi1tb2RlbD1cXFwiZmllbGQudmFsdWVcXFwiIDppZD1cXFwiZmllbGQubmFtZVxcXCIgOnBsYWNlaG9sZGVyPVxcXCJmaWVsZC5pbnB1dC5sYWJlbFxcXCI+XFxuICAgICAgICAgICAgICA8dGV4dGFyZWEgdi1pZj1cXFwiaXNUZXh0YXJlYShmaWVsZClcXFwiIDpmaWVsZD1cXFwiZmllbGQubmFtZVxcXCIgdi12YWxpZGF0ZT1cXFwiZmllbGQudmFsaWRhdGVcXFwiIHYtZGlzYWJsZWQ9XFxcIiFpc0VkaXRhYmxlKGZpZWxkKVxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgdi1tb2RlbD1cXFwiZmllbGQudmFsdWVcXFwiIDppZD1cXFwiZmllbGQubmFtZVxcXCIgOnBsYWNlaG9sZGVyPVxcXCJmaWVsZC5pbnB1dC5sYWJlbFxcXCI+XFxuICAgICAgICAgICAgICA8L3RleHRhcmVhPlxcbiAgICAgICAgICAgICAgPHNlbGVjdCB2LWlmPVxcXCJpc1NlbGVjdChmaWVsZClcXFwiIDpmaWVsZD1cXFwiZmllbGQubmFtZVxcXCIgdi12YWxpZGF0ZT1cXFwiZmllbGQudmFsaWRhdGVcXFwiIHYtZGlzYWJsZWQ9XFxcIiFpc0VkaXRhYmxlKGZpZWxkKVxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgdi1tb2RlbD1cXFwiZmllbGQudmFsdWVcXFwiIDppZD1cXFwiZmllbGQubmFtZVxcXCIgOnBsYWNlaG9sZGVyPVxcXCJmaWVsZC5pbnB1dC5sYWJlbFxcXCI+XFxuICAgICAgICAgICAgICAgIDxvcHRpb24gdi1mb3I9XFxcInZhbHVlIGluIGZpZWxkLmlucHV0Lm9wdGlvbnMudmFsdWVzXFxcIiB2YWx1ZT1cXFwie3sgdmFsdWUua2V5IH19XFxcIj57eyB2YWx1ZS52YWx1ZSB9fTwvb3B0aW9uPlxcbiAgICAgICAgICAgICAgPC9zZWxlY3Q+XFxuICAgICAgICAgICAgICA8ZGl2IHYtaWY9XFxcImlzTGF5ZXJQaWNrZXIoZmllbGQpXFxcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiIEBjbGljaz1cXFwicGlja0xheWVyKGZpZWxkKVxcXCIgOmZpZWxkPVxcXCJmaWVsZC5uYW1lXFxcIiB2LXZhbGlkYXRlPVxcXCJmaWVsZC52YWxpZGF0ZVxcXCIgdi1kaXNhYmxlZD1cXFwiIWlzRWRpdGFibGUoZmllbGQpXFxcIiBvbmZvY3VzPVxcXCJibHVyKClcXFwiIGRhdGEtdG9nZ2xlPVxcXCJ0b29sdGlwXFxcIiB0aXRsZT1cXFwiT3R0aWVuaSBpbCBkYXRvIGRhIHVuIGVsZW1lbnRvIGRlbCBsYXllciAne3sgbGF5ZXJQaWNrZXJQbGFjZUhvbGRlcihmaWVsZCkgfX0nXFxcIiB2LW1vZGVsPVxcXCJmaWVsZC52YWx1ZVxcXCIgOmlkPVxcXCJmaWVsZC5uYW1lXFxcIiA6cGxhY2Vob2xkZXI9XFxcIidbJytsYXllclBpY2tlclBsYWNlSG9sZGVyKGZpZWxkKSsnXSdcXFwiPlxcbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1zY3JlZW5zaG90IGZvcm0tY29udHJvbC1mZWVkYmFja1xcXCI+PC9pPlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC90ZW1wbGF0ZT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgdi1mb3I9XFxcInJlbGF0aW9uIGluIHN0YXRlLnJlbGF0aW9uc1xcXCIgc3R5bGU9XFxcIm1hcmdpbi10b3A6MTBweFxcXCI+XFxuICAgICAgICA8ZGl2IHYtaWY9XFxcInNob3dSZWxhdGlvbihyZWxhdGlvbilcXFwiIHRyYW5zaXRpb249XFxcImV4cGFuZFxcXCI+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImJveCBib3gtZGVmYXVsdFxcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYm94LWhlYWRlciB3aXRoLWJvcmRlclxcXCI+XFxuICAgICAgICAgICAgICA8aDMgY2xhc3M9XFxcImJveC10aXRsZVxcXCI+e3sgcmVsYXRpb24gfCByZWxhdGlvbnBsdXJhbCB9fTwvaDM+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYm94LWJvZHlcXFwiPlxcbiAgICAgICAgICAgICAgPHRhYmxlIHYtaWY9XFxcInJlbGF0aW9uLmVsZW1lbnRzLmxlbmd0aFxcXCIgY2xhc3M9XFxcInRhYmxlIHRhYmxlLXN0cmlwZWRcXFwiPlxcbiAgICAgICAgICAgICAgICA8dGhlYWQ+XFxuICAgICAgICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgICAgICAgPHRoIHYtZm9yPVxcXCJmaWVsZCBpbiBmaWVsZHNTdWJzZXQocmVsYXRpb24uZmllbGRzKVxcXCI+e3tmaWVsZC5sYWJlbH19PC90aD5cXG4gICAgICAgICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgICAgICAgICA8dGJvZHk+XFxuICAgICAgICAgICAgICAgICAgPHRlbXBsYXRlIHYtZm9yPVxcXCJlbGVtZW50IGluIHJlbGF0aW9uLmVsZW1lbnRzXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDx0ciBjbGFzcz1cXFwiYXR0cmlidXRlcy1wcmV2aWV3XFxcIiBAY2xpY2s9XFxcInRvZ2dsZUVsZW1lbnRCb3gocmVsYXRpb24sZWxlbWVudClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICA8dGQgdi1mb3I9XFxcInJlbGZpZWxkIGluIGZpZWxkc1N1YnNldChlbGVtZW50LmZpZWxkcylcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPnt7cmVsZmllbGQudmFsdWV9fTwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIHYtaWY9XFxcImlzUmVsYXRpb25FbGVtZW50RGVsZXRhYmxlKHJlbGF0aW9uLGVsZW1lbnQpXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbiBnbHlwaGljb24tdHJhc2ggbGluayB0cmFzaFxcXCIgQGNsaWNrLnN0b3AucHJldmVudD1cXFwicmVtb3ZlUmVsYXRpb25FbGVtZW50KHJlbGF0aW9uLGVsZW1lbnQpXFxcIj0+PC9pPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLW9wdGlvbi1ob3Jpem9udGFsIGxpbmsgbW9yZWxpbmtcXFwiPjwvaT5cXG4gICAgICAgICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICAgICAgICAgICAgICA8dHIgdi1zaG93PVxcXCIhY29sbGFwc2VFbGVtZW50Qm94KHJlbGF0aW9uLGVsZW1lbnQpXFxcIiBjbGFzcz1cXFwicXVlcnlyZXN1bHRzLWZlYXR1cmVib3hcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICA8dGQgOmNvbHNwYW49XFxcImZpZWxkc1N1YnNldExlbmd0aChlbGVtZW50LmZpZWxkcykrMVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHRlbXBsYXRlIHYtZm9yPVxcXCJmaWVsZCBpbiBlbGVtZW50LmZpZWxkc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IHYtaWY9XFxcImlzVmlzaWJsZShmaWVsZClcXFwiIGNsYXNzPVxcXCJmb3JtLWdyb3VwIGhhcy1mZWVkYmFja1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCA6Zm9yPVxcXCJmaWVsZC5uYW1lXFxcIiBjbGFzcz1cXFwiY29sLXNtLTQgY29udHJvbC1sYWJlbFxcXCI+e3sgZmllbGQubGFiZWwgfX08c3BhbiB2LWlmPVxcXCJmaWVsZC52YWxpZGF0ZSAmJiBmaWVsZC52YWxpZGF0ZS5yZXF1aXJlZFxcXCI+Kjwvc3Bhbj48L2xhYmVsPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjb2wtc20tOFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHYtaWY9XFxcImlzU2ltcGxlKGZpZWxkKVxcXCIgOmZpZWxkPVxcXCJmaWVsZC5uYW1lXFxcIiB2LXZhbGlkYXRlPVxcXCJmaWVsZC52YWxpZGF0ZVxcXCIgdi1kaXNhYmxlZD1cXFwiIWlzRWRpdGFibGUoZmllbGQpXFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiB2LW1vZGVsPVxcXCJmaWVsZC52YWx1ZVxcXCIgOmlkPVxcXCJmaWVsZC5uYW1lXFxcIiA6cGxhY2Vob2xkZXI9XFxcImZpZWxkLmlucHV0LmxhYmVsXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgdi1pZj1cXFwiaXNUZXh0YXJlYShmaWVsZClcXFwiIDpmaWVsZD1cXFwiZmllbGQubmFtZVxcXCIgdi12YWxpZGF0ZT1cXFwiZmllbGQudmFsaWRhdGVcXFwiIHYtZGlzYWJsZWQ9XFxcIiFpc0VkaXRhYmxlKGZpZWxkKVxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgdi1tb2RlbD1cXFwiZmllbGQudmFsdWVcXFwiIDppZD1cXFwiZmllbGQubmFtZVxcXCIgOnBsYWNlaG9sZGVyPVxcXCJmaWVsZC5pbnB1dC5sYWJlbFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC90ZXh0YXJlYT5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c2VsZWN0IHYtaWY9XFxcImlzU2VsZWN0KGZpZWxkKVxcXCIgOmZpZWxkPVxcXCJmaWVsZC5uYW1lXFxcIiB2LXZhbGlkYXRlPVxcXCJmaWVsZC52YWxpZGF0ZVxcXCIgdi1kaXNhYmxlZD1cXFwiIWlzRWRpdGFibGUoZmllbGQpXFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiB2LW1vZGVsPVxcXCJmaWVsZC52YWx1ZVxcXCIgOmlkPVxcXCJmaWVsZC5uYW1lXFxcIiA6cGxhY2Vob2xkZXI9XFxcImZpZWxkLmlucHV0LmxhYmVsXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIHYtZm9yPVxcXCJ2YWx1ZSBpbiBmaWVsZC5pbnB1dC5vcHRpb25zLnZhbHVlc1xcXCIgdmFsdWU9XFxcInt7IHZhbHVlLmtleSB9fVxcXCI+e3sgdmFsdWUudmFsdWUgfX08L29wdGlvbj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NlbGVjdD5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IHYtaWY9XFxcImlzTGF5ZXJQaWNrZXIoZmllbGQpXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiBAY2xpY2s9XFxcInBpY2tMYXllcihmaWVsZClcXFwiIDpmaWVsZD1cXFwiZmllbGQubmFtZVxcXCIgdi12YWxpZGF0ZT1cXFwiZmllbGQudmFsaWRhdGVcXFwiIHYtZGlzYWJsZWQ9XFxcIiFpc0VkaXRhYmxlKGZpZWxkKVxcXCIgb25mb2N1cz1cXFwiYmx1cigpXFxcIiBkYXRhLXRvZ2dsZT1cXFwidG9vbHRpcFxcXCIgdGl0bGU9XFxcIk90dGllbmkgaWwgZGF0byBkYSB1biBlbGVtZW50byBkZWwgbGF5ZXIgJ3t7IGxheWVyUGlja2VyUGxhY2VIb2xkZXIoZmllbGQpIH19J1xcXCIgdi1tb2RlbD1cXFwiZmllbGQudmFsdWVcXFwiIDppZD1cXFwiZmllbGQubmFtZVxcXCIgOnBsYWNlaG9sZGVyPVxcXCInWycrbGF5ZXJQaWNrZXJQbGFjZUhvbGRlcihmaWVsZCkrJ10nXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXNjcmVlbnNob3QgZm9ybS1jb250cm9sLWZlZWRiYWNrXFxcIj48L2k+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC90ZW1wbGF0ZT5cXG4gICAgICAgICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICAgICAgICAgICAgPC90ZW1wbGF0ZT5cXG4gICAgICAgICAgICAgICAgPC90Ym9keT5cXG4gICAgICAgICAgICAgIDwvdGFibGU+XFxuICAgICAgICAgICAgICA8ZGl2IHYtaWY9XFxcImNhbkFkZFJlbGF0aW9uRWxlbWVudHMocmVsYXRpb24pXFxcIiBjbGFzcz1cXFwicm93XFxcIiBzdHlsZT1cXFwibWFyZ2luOjBweFxcXCI+PGkgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcGx1cy1zaWduIHB1bGwtcmlnaHQgYnRuLWFkZFxcXCIgQGNsaWNrPVxcXCJhZGRSZWxhdGlvbkVsZW1lbnQocmVsYXRpb24pXFxcIj48L2k+PC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjb2wtc20tb2Zmc2V0LTQgY29sLXNtLThcXFwiPlxcbiAgICAgICAgICA8ZGl2IHYtaWY9XFxcImhhc0ZpZWxkc1JlcXVpcmVkXFxcIiBzdHlsZT1cXFwibWFyZ2luLWJvdHRvbToxMHB4XFxcIj5cXG4gICAgICAgICAgICA8c3Bhbj4qIENhbXBpIHJpY2hpZXN0aTwvc3Bhbj5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDxzcGFuIHYtZm9yPVxcXCJidXR0b24gaW4gYnV0dG9uc1xcXCI+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYnRuIFxcXCIgOmNsYXNzPVxcXCJbYnV0dG9uLmNsYXNzXVxcXCIgQGNsaWNrLnN0b3AucHJldmVudD1cXFwiZXhlYyhidXR0b24uY2JrKVxcXCIgdi1kaXNhYmxlZD1cXFwiIWJ0bkVuYWJsZWQoYnV0dG9uKVxcXCI+e3sgYnV0dG9uLnRpdGxlIH19PC9idXR0b24+XFxuICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Zvcm0+XFxuICA8L3ZhbGlkYXRvcj5cXG48L2Rpdj5cXG5cIjtcbiIsInZhciBub29wID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLm5vb3A7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgQ29tcG9uZW50c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnZ3VpL2NvbXBvbmVudHNyZWdpc3RyeScpO1xuXG4vLyByYXBwcmVzZW50YSBsJ2ludGVyZmFjY2lhIGdsb2JhbGUgZGVsbCdBUEkgZGVsbGEgR1VJLiBcbi8vIG1ldG9kaSBkZXZvbm8gZXNzZXJlIGltcGxlbWVudGF0aSAoZGVmaW5pdGkpIGRhbGwnYXBwbGljYXppb25lIG9zcGl0ZVxuLy8gbCdhcHAgb3NwaXRlIGRvdnJlYmJlIGNoaWFtYXJlIGFuY2hlIGxhIGZ1bnppb25lIEdVSS5yZWFkeSgpIHF1YW5kbyBsYSBVSSDDqCBwcm9udGFcbmZ1bmN0aW9uIEdVSSgpe1xuICB0aGlzLnJlYWR5ID0gZmFsc2U7XG4gIC8vIHVybCBkZWxsZSByaXNvcnNlIChpbW1hZ2luaSwgZWNjLilcbiAgdGhpcy5nZXRSZXNvdXJjZXNVcmwgPSBub29wO1xuICAvLyBzaG93IGEgVnVlIGZvcm1cbiAgdGhpcy5zaG93Rm9ybSA9IG5vb3A7XG4gIHRoaXMuY2xvc2VGb3JtID0gbm9vcDtcbiAgXG4gIC8vIG1vc3RyYSB1bmEgbGlzdGEgZGkgb2dnZXR0aSAoZXMuIGxpc3RhIGRpIHJpc3VsdGF0aSlcbiAgdGhpcy5zaG93TGlzdGluZyA9IG5vb3A7XG4gIHRoaXMuY2xvc2VMaXN0aW5nID0gbm9vcDtcbiAgdGhpcy5oaWRlTGlzdGluZyA9IG5vb3A7XG4gIFxuICAvLyBvcHRpb25zIGNvbnRlcnLDoCBpIHZhcmkgZGF0aSBzdWkgcmlzdWx0YXRpLiBTaWN1cmFtZW50ZSBhdnLDoCBsYSBwcnByaWV0w6Agb3B0aW9ucy5mZWF0dXJlc1xuICAvLyBuZWwgY2FzbyBkaSBxdWVyeUJ5TG9jYXRpb24gYXZyw6AgYW5jaGUgb3B0aW9ucy5jb29yZGluYXRlXG4gIHRoaXMuc2hvd1F1ZXJ5UmVzdWx0cyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHt9O1xuICB0aGlzLmhpZGVRdWVyeVJlc3VsdHMgPSBub29wO1xuXG4gIC8qIHBhbmVsICovXG4gIHRoaXMuc2hvd1BhbmVsID0gbm9vcDtcbiAgdGhpcy5oaWRlUGFuZWwgPSBub29wO1xuXG4gIC8vbWV0b2RpIGNvbXBvbmVudGVcbiAgLy8gYWdnaXVuZ2UgKGUgcmVnaXN0cmEpIHVuIGNvbXBvbmVudGUgaW4gdW4gcGxhY2Vob2xkZXIgZGVsIHRlbXBsYXRlIC0gTWV0b2RvIGltcGxlbWVudGF0byBkYWwgdGVtcGxhdGVcbiAgdGhpcy5hZGRDb21wb25lbnQgPSBmdW5jdGlvbihjb21wb25lbnQscGxhY2Vob2xkZXIpIHt9O1xuICB0aGlzLnJlbW92ZUNvbXBvbmVudCA9IGZ1bmN0aW9uKGlkKSB7fTtcbiAgLy8gcmVnaXN0cmEgZ2xvYmFsbWVudGUgdW4gY29tcG9uZW50ZSAobm9uIGxlZ2F0byBhZCB1bm8gc3BlY2lmaWNvIHBsYWNlaG9sZGVyLiBFcy4gY29tcG9uZW50ZSBwZXIgbW9zdHJhcmUgcmlzdWx0YXRpIGludGVycm9nYXppb24pXG4gIHRoaXMuc2V0Q29tcG9uZW50ID0gZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgQ29tcG9uZW50c1JlZ2lzdHJ5LnJlZ2lzdGVyQ29tcG9uZW50KGNvbXBvbmVudCk7XG4gIH07XG4gIHRoaXMuZ2V0Q29tcG9uZW50ID0gZnVuY3Rpb24oaWQpIHtcbiAgICByZXR1cm4gQ29tcG9uZW50c1JlZ2lzdHJ5LmdldENvbXBvbmVudChpZCk7XG4gIH07XG4gIC8vZmluZSBtZXRvZGkgY29tcG9uZW50ZVxuXG4gIHRoaXMucmVhZHkgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuZW1pdCgncmVhZHknKTtcbiAgICB0aGlzLnJlYWR5ID0gdHJ1ZTtcbiAgfTtcbiAgXG4gIHRoaXMuZ3VpUmVzaXplZCA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5lbWl0KCdndWlyZXNpemVkJyk7XG4gIH07XG5cbiAgLyogc3Bpbm5lciAqL1xuICBHVUkuc2hvd1NwaW5uZXIgPSBmdW5jdGlvbihvcHRpb25zKXt9O1xuXG4gIEdVSS5oaWRlU3Bpbm5lciA9IGZ1bmN0aW9uKGlkKXt9O1xuXG4gIFxuICB0aGlzLm5vdGlmeSA9IG5vb3A7XG4gIHRoaXMuZGlhbG9nID0gbm9vcDtcbn1cblxuaW5oZXJpdChHVUksRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgR1VJO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXY+XFxuICBMaXN0YSBkaSBvZ2dldHRpXFxuPC9kaXY+XFxuXCI7XG4iLCJ2YXIgcmVzb2x2ZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZXNvbHZlO1xudmFyIHJlamVjdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZWplY3Q7XG52YXIgR1VJID0gcmVxdWlyZSgnZ3VpL2d1aScpO1xuLy92YXIgTWFwU2VydmljZSA9IHJlcXVpcmUoJ2NvcmUvbWFwL21hcHNlcnZpY2UnKTtcblxudmFyIExpc3RQYW5lbENvbXBvbmVudCA9IFZ1ZS5leHRlbmQoe1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9saXN0cGFuZWwuaHRtbCcpLFxuICBtZXRob2RzOiB7XG4gICAgZXhlYzogZnVuY3Rpb24oY2JrKXtcbiAgICAgIHZhciByZWxhdGlvbnMgPSB0aGlzLnN0YXRlLnJlbGF0aW9ucyB8fCBudWxsO1xuICAgICAgY2JrKHRoaXMuc3RhdGUuZmllbGRzLHJlbGF0aW9ucyk7XG4gICAgICBHVUkuY2xvc2VGb3JtKCk7XG4gICAgfVxuICB9XG59KTtcblxuXG5mdW5jdGlvbiBMaXN0UGFuZWwob3B0aW9ucyl7XG4gIC8vIHByb3ByaWV0w6AgbmVjZXNzYXJpZS4gSW4gZnV0dXJvIGxlIG1ldHRlcm1vIGluIHVuYSBjbGFzc2UgUGFuZWwgZGEgY3VpIGRlcml2ZXJhbm5vIHR1dHRpIGkgcGFubmVsbGkgY2hlIHZvZ2xpb25vIGVzc2VyZSBtb3N0cmF0aSBuZWxsYSBzaWRlYmFyXG4gIHRoaXMucGFuZWxDb21wb25lbnQgPSBudWxsO1xuICB0aGlzLm9wdGlvbnMgPSAgb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5pZCA9IG9wdGlvbnMuaWQgfHwgbnVsbDsgLy8gaWQgZGVsIGZvcm1cbiAgdGhpcy5uYW1lID0gb3B0aW9ucy5uYW1lIHx8IG51bGw7IC8vIG5vbWUgZGVsIGZvcm1cbiAgXG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgbGlzdDogb3B0aW9ucy5saXN0IHx8IFtdXG4gIH1cbiAgXG4gIHRoaXMuX2xpc3RQYW5lbENvbXBvbmVudCA9IG9wdGlvbnMubGlzdFBhbmVsQ29tcG9uZW50IHx8IExpc3RQYW5lbENvbXBvbmVudDtcbn1cblxudmFyIHByb3RvID0gTGlzdFBhbmVsLnByb3RvdHlwZTtcblxuLy8gdmllbmUgcmljaGlhbWF0byBkYWxsYSB0b29sYmFyIHF1YW5kbyBpbCBwbHVnaW4gY2hpZWRlIGRpIG1vc3RyYXJlIHVuIHByb3ByaW8gcGFubmVsbG8gbmVsbGEgR1VJIChHVUkuc2hvd1BhbmVsKVxucHJvdG8ub25TaG93ID0gZnVuY3Rpb24oY29udGFpbmVyKXtcbiAgdmFyIHBhbmVsID0gdGhpcy5fc2V0dXBQYW5lbCgpO1xuICB0aGlzLl9tb3VudFBhbmVsKHBhbmVsLGNvbnRhaW5lcik7XG4gIHJldHVybiByZXNvbHZlKHRydWUpO1xufTtcblxuLy8gcmljaGlhbWF0byBxdWFuZG8gbGEgR1VJIGNoaWVkZSBkaSBjaGl1ZGVyZSBpbCBwYW5uZWxsby4gU2Ugcml0b3JuYSBmYWxzZSBpbCBwYW5uZWxsbyBub24gdmllbmUgY2hpdXNvXG5wcm90by5vbkNsb3NlID0gZnVuY3Rpb24oKXtcbiAgdGhpcy5wYW5lbENvbXBvbmVudC4kZGVzdHJveSh0cnVlKTtcbiAgdGhpcy5wYW5lbENvbXBvbmVudCA9IG51bGw7XG4gIHJldHVybiByZXNvbHZlKHRydWUpO1xufTtcblxucHJvdG8uX3NldHVwUGFuZWwgPSBmdW5jdGlvbigpe1xuICB2YXIgcGFuZWwgPSB0aGlzLnBhbmVsQ29tcG9uZW50ID0gbmV3IHRoaXMuX2xpc3RQYW5lbENvbXBvbmVudCh7XG4gICAgcGFuZWw6IHRoaXNcbiAgfSk7XG4gIHBhbmVsLnN0YXRlID0gdGhpcy5zdGF0ZTtcbiAgcmV0dXJuIHBhbmVsXG59O1xuXG5wcm90by5fbW91bnRQYW5lbCA9IGZ1bmN0aW9uKHBhbmVsLGNvbnRhaW5lcil7XG4gIHBhbmVsLiRtb3VudCgpLiRhcHBlbmRUbyhjb250YWluZXIpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIExpc3RQYW5lbENvbXBvbmVudDogTGlzdFBhbmVsQ29tcG9uZW50LFxuICBMaXN0UGFuZWw6IExpc3RQYW5lbFxufVxuIiwidmFyIFJlc2V0Q29udHJvbCA9IHJlcXVpcmUoJ2czdy1vbDMvc3JjL2NvbnRyb2xzL3Jlc2V0Y29udHJvbCcpO1xudmFyIFF1ZXJ5Q29udHJvbCA9IHJlcXVpcmUoJ2czdy1vbDMvc3JjL2NvbnRyb2xzL3F1ZXJ5Y29udHJvbCcpO1xudmFyIFpvb21Cb3hDb250cm9sID0gcmVxdWlyZSgnZzN3LW9sMy9zcmMvY29udHJvbHMvem9vbWJveGNvbnRyb2wnKTtcblxudmFyIE9MQ29udHJvbCA9IHJlcXVpcmUoJ2czdy1vbDMvc3JjL2NvbnRyb2xzL29sY29udHJvbCcpO1xuXG52YXIgQ29udHJvbHNGYWN0b3J5ID0ge1xuICBjcmVhdGU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB2YXIgY29udHJvbDtcbiAgICB2YXIgQ29udHJvbENsYXNzID0gQ29udHJvbHNGYWN0b3J5LkNPTlRST0xTW29wdGlvbnMudHlwZV07XG4gICAgaWYgKENvbnRyb2xDbGFzcykge1xuICAgICAgY29udHJvbCA9IG5ldyBDb250cm9sQ2xhc3Mob3B0aW9ucyk7XG4gICAgfVxuICAgIHJldHVybiBjb250cm9sO1xuICB9XG59O1xuXG5Db250cm9sc0ZhY3RvcnkuQ09OVFJPTFMgPSB7XG4gICdyZXNldCc6IFJlc2V0Q29udHJvbCxcbiAgJ3pvb21ib3gnOiBab29tQm94Q29udHJvbCxcbiAgJ3F1ZXJ5JzogUXVlcnlDb250cm9sLFxuICAnem9vbSc6IE9MQ29udHJvbCxcbiAgJ3NjYWxlbGluZSc6IE9MQ29udHJvbCxcbiAgJ292ZXJ2aWV3JzogT0xDb250cm9sXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xzRmFjdG9yeTtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgR1VJID0gcmVxdWlyZSgnZ3VpL2d1aScpO1xudmFyIEFwcGxpY2F0aW9uU2VydmljZSA9IHJlcXVpcmUoJ2NvcmUvYXBwbGljYXRpb25zZXJ2aWNlJyk7XG52YXIgUHJvamVjdHNSZWdpc3RyeSA9IHJlcXVpcmUoJ2NvcmUvcHJvamVjdC9wcm9qZWN0c3JlZ2lzdHJ5Jyk7XG52YXIgUHJvamVjdFR5cGVzID0gcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3R0eXBlcycpO1xudmFyIEdlb21ldHJ5VHlwZXMgPSByZXF1aXJlKCdjb3JlL2dlb21ldHJ5L2dlb21ldHJ5JykuR2VvbWV0cnlUeXBlcztcbnZhciBvbDNoZWxwZXJzID0gcmVxdWlyZSgnZzN3LW9sMy9zcmMvZzN3Lm9sMycpLmhlbHBlcnM7XG52YXIgV01TTGF5ZXIgPSByZXF1aXJlKCdjb3JlL21hcC9sYXllci93bXNsYXllcicpO1xudmFyIENvbnRyb2xzRmFjdG9yeSA9IHJlcXVpcmUoJ2d1aS9tYXAvY29udHJvbC9mYWN0b3J5Jyk7XG52YXIgUXVlcnlTZXJ2aWNlID0gcmVxdWlyZSgnY29yZS9xdWVyeS9xdWVyeXNlcnZpY2UnKTtcblxuZnVuY3Rpb24gTWFwU2VydmljZShwcm9qZWN0KXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmNvbmZpZztcbiAgdGhpcy52aWV3ZXI7XG4gIHRoaXMudGFyZ2V0O1xuICB0aGlzLl9tYXBDb250cm9scyA9IFtdLFxuICB0aGlzLl9tYXBMYXllcnMgPSBbXTtcbiAgdGhpcy5tYXBCYXNlTGF5ZXJzID0ge307XG4gIHRoaXMubGF5ZXJzRXh0cmFQYXJhbXMgPSB7fTtcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgIGJib3g6IFtdLFxuICAgICAgcmVzb2x1dGlvbjogbnVsbCxcbiAgICAgIGNlbnRlcjogbnVsbCxcbiAgICAgIGxvYWRpbmc6IGZhbHNlXG4gIH07XG4gIHRoaXMuY29uZmlnID0gQXBwbGljYXRpb25TZXJ2aWNlLmdldENvbmZpZygpO1xuICBcbiAgdmFyIHJvdXRlclNlcnZpY2UgPSBBcHBsaWNhdGlvblNlcnZpY2UuZ2V0Um91dGVyU2VydmljZSgpO1xuICByb3V0ZXJTZXJ2aWNlLmFkZFJvdXRlKCdtYXAvez9xdWVyeX0nLGZ1bmN0aW9uKHF1ZXJ5KXtcbiAgICB2YXIgcXVlcnkgPSBxdWVyeSB8fCB7fTtcbiAgICBpZiAocXVlcnkuY2VudGVyKSB7XG4gICAgICBjb25zb2xlLmxvZygnQ2VudHJhIG1hcHBhIHN1OiAnK3F1ZXJ5LmNlbnRlcik7XG4gICAgfVxuICB9KTtcbiAgXG4gIHRoaXMuX2hvd01hbnlBcmVMb2FkaW5nID0gMDtcbiAgdGhpcy5faW5jcmVtZW50TG9hZGVycyA9IGZ1bmN0aW9uKCl7XG4gICAgaWYgKHRoaXMuX2hvd01hbnlBcmVMb2FkaW5nID09IDApe1xuICAgICAgdGhpcy5lbWl0KCdsb2Fkc3RhcnQnKTtcbiAgICAgIEdVSS5zaG93U3Bpbm5lcih7XG4gICAgICAgIGNvbnRhaW5lcjogJCgnI21hcC1zcGlubmVyJyksXG4gICAgICAgIGlkOiAnbWFwbG9hZHNwaW5uZXInLFxuICAgICAgICBzdHlsZTogJ2JsdWUnXG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhpcy5faG93TWFueUFyZUxvYWRpbmcgKz0gMTtcbiAgfTtcbiAgXG4gIHRoaXMuX2RlY3JlbWVudExvYWRlcnMgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX2hvd01hbnlBcmVMb2FkaW5nIC09IDE7XG4gICAgaWYgKHRoaXMuX2hvd01hbnlBcmVMb2FkaW5nID09IDApe1xuICAgICAgdGhpcy5lbWl0KCdsb2FkZW5kJyk7XG4gICAgICBHVUkuaGlkZVNwaW5uZXIoJ21hcGxvYWRzcGlubmVyJyk7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5faW50ZXJhY3Rpb25zU3RhY2sgPSBbXTtcbiAgaWYoIV8uaXNOaWwocHJvamVjdCkpIHtcbiAgICB0aGlzLnByb2plY3QgPSBwcm9qZWN0O1xuICB9XG4gIGVsc2Uge1xuICAgIHRoaXMucHJvamVjdCA9IFByb2plY3RzUmVnaXN0cnkuZ2V0Q3VycmVudFByb2plY3QoKTtcbiAgfVxuXG4gIFxuICB0aGlzLnNldHRlcnMgPSB7XG4gICAgc2V0TWFwVmlldzogZnVuY3Rpb24oYmJveCxyZXNvbHV0aW9uLGNlbnRlcil7XG4gICAgICB0aGlzLnN0YXRlLmJib3ggPSBiYm94O1xuICAgICAgdGhpcy5zdGF0ZS5yZXNvbHV0aW9uID0gcmVzb2x1dGlvbjtcbiAgICAgIHRoaXMuc3RhdGUuY2VudGVyID0gY2VudGVyO1xuICAgICAgdGhpcy51cGRhdGVNYXBMYXllcnModGhpcy5tYXBMYXllcnMpO1xuICAgIH0sXG4gICAgc2V0dXBWaWV3ZXI6IGZ1bmN0aW9uKGluaXRpYWxSZXNvbHV0aW9uKXtcbiAgICAgIC8vJHNjcmlwdChcImh0dHA6Ly9lcHNnLmlvL1wiK1Byb2plY3RTZXJ2aWNlLnN0YXRlLnByb2plY3QuY3JzK1wiLmpzXCIpO1xuICAgICAgcHJvajQuZGVmcyhcIkVQU0c6XCIrc2VsZi5wcm9qZWN0LnN0YXRlLmNycyx0aGlzLnByb2plY3Quc3RhdGUucHJvajQpO1xuICAgICAgaWYgKHNlbGYudmlld2VyKSB7XG4gICAgICAgIHNlbGYudmlld2VyLmRlc3Ryb3koKTtcbiAgICAgICAgc2VsZi52aWV3ZXIgPSBudWxsO1xuICAgICAgfVxuICAgICAgc2VsZi5fc2V0dXBWaWV3ZXIoaW5pdGlhbFJlc29sdXRpb24pO1xuICAgICAgc2VsZi5zZXR1cENvbnRyb2xzKCk7XG4gICAgICBzZWxmLnNldHVwTGF5ZXJzKCk7XG4gICAgICBzZWxmLmVtaXQoJ3ZpZXdlcnNldCcpO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuX3NldHVwVmlld2VyID0gZnVuY3Rpb24oaW5pdGlhbFJlc29sdXRpb24pe1xuICAgIHZhciBleHRlbnQgPSB0aGlzLnByb2plY3Quc3RhdGUuZXh0ZW50O1xuICAgIHZhciBwcm9qZWN0aW9uID0gdGhpcy5nZXRQcm9qZWN0aW9uKCk7XG4gICAgXG4gICAgLyp2YXIgY29uc3RyYWluX2V4dGVudDtcbiAgICBpZiAodGhpcy5jb25maWcuY29uc3RyYWludGV4dGVudCkge1xuICAgICAgdmFyIGV4dGVudCA9IHRoaXMuY29uZmlnLmNvbnN0cmFpbnRleHRlbnQ7XG4gICAgICB2YXIgZHggPSBleHRlbnRbMl0tZXh0ZW50WzBdO1xuICAgICAgdmFyIGR5ID0gZXh0ZW50WzNdLWV4dGVudFsxXTtcbiAgICAgIHZhciBkeDQgPSBkeC80O1xuICAgICAgdmFyIGR5NCA9IGR5LzQ7XG4gICAgICB2YXIgYmJveF94bWluID0gZXh0ZW50WzBdICsgZHg0O1xuICAgICAgdmFyIGJib3hfeG1heCA9IGV4dGVudFsyXSAtIGR4NDtcbiAgICAgIHZhciBiYm94X3ltaW4gPSBleHRlbnRbMV0gKyBkeTQ7XG4gICAgICB2YXIgYmJveF95bWF4ID0gZXh0ZW50WzNdIC0gZHk0O1xuICAgICAgXG4gICAgICBjb25zdHJhaW5fZXh0ZW50ID0gW2Jib3hfeG1pbixiYm94X3ltaW4sYmJveF94bWF4LGJib3hfeW1heF07XG4gICAgfSovXG4gICAgXG4gICAgdGhpcy52aWV3ZXIgPSBvbDNoZWxwZXJzLmNyZWF0ZVZpZXdlcih7XG4gICAgICBpZDogdGhpcy50YXJnZXQsXG4gICAgICB2aWV3OiB7XG4gICAgICAgIHByb2plY3Rpb246IHByb2plY3Rpb24sXG4gICAgICAgIC8qY2VudGVyOiB0aGlzLmNvbmZpZy5pbml0Y2VudGVyIHx8IG9sLmV4dGVudC5nZXRDZW50ZXIoZXh0ZW50KSxcbiAgICAgICAgem9vbTogdGhpcy5jb25maWcuaW5pdHpvb20gfHwgMCxcbiAgICAgICAgZXh0ZW50OiB0aGlzLmNvbmZpZy5jb25zdHJhaW50ZXh0ZW50IHx8IGV4dGVudCxcbiAgICAgICAgbWluWm9vbTogdGhpcy5jb25maWcubWluem9vbSB8fCAwLCAvLyBkZWZhdWx0IGRpIE9MMyAzLjE2LjBcbiAgICAgICAgbWF4Wm9vbTogdGhpcy5jb25maWcubWF4em9vbSB8fCAyOCAvLyBkZWZhdWx0IGRpIE9MMyAzLjE2LjAqL1xuICAgICAgICBjZW50ZXI6IG9sLmV4dGVudC5nZXRDZW50ZXIoZXh0ZW50KSxcbiAgICAgICAgZXh0ZW50OiBleHRlbnQsXG4gICAgICAgIC8vbWluWm9vbTogMCwgLy8gZGVmYXVsdCBkaSBPTDMgMy4xNi4wXG4gICAgICAgIC8vbWF4Wm9vbTogMjggLy8gZGVmYXVsdCBkaSBPTDMgMy4xNi4wXG4gICAgICAgIG1heFJlc29sdXRpb246IGluaXRpYWxSZXNvbHV0aW9uXG4gICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgaWYgKHRoaXMuY29uZmlnLmJhY2tncm91bmRfY29sb3IpIHtcbiAgICAgICQoJyMnK3RoaXMudGFyZ2V0KS5jc3MoJ2JhY2tncm91bmQtY29sb3InLHRoaXMuY29uZmlnLmJhY2tncm91bmRfY29sb3IpOztcbiAgICB9XG4gICAgXG4gICAgJCh0aGlzLnZpZXdlci5tYXAuZ2V0Vmlld3BvcnQoKSkucHJlcGVuZCgnPGRpdiBpZD1cIm1hcC1zcGlubmVyXCIgc3R5bGU9XCJwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDowcHg7XCI+PC9kaXY+Jyk7XG4gICAgXG4gICAgdGhpcy52aWV3ZXIubWFwLmdldEludGVyYWN0aW9ucygpLmZvckVhY2goZnVuY3Rpb24oaW50ZXJhY3Rpb24pe1xuICAgICAgc2VsZi5fd2F0Y2hJbnRlcmFjdGlvbihpbnRlcmFjdGlvbik7XG4gICAgfSk7XG4gICAgXG4gICAgdGhpcy52aWV3ZXIubWFwLmdldEludGVyYWN0aW9ucygpLm9uKCdhZGQnLGZ1bmN0aW9uKGludGVyYWN0aW9uKXtcbiAgICAgIHNlbGYuX3dhdGNoSW50ZXJhY3Rpb24oaW50ZXJhY3Rpb24uZWxlbWVudCk7XG4gICAgfSlcbiAgICBcbiAgICB0aGlzLnZpZXdlci5tYXAuZ2V0SW50ZXJhY3Rpb25zKCkub24oJ3JlbW92ZScsZnVuY3Rpb24oaW50ZXJhY3Rpb24pe1xuICAgICAgLy9zZWxmLl9vblJlbW92ZUludGVyYWN0aW9uKGludGVyYWN0aW9uKTtcbiAgICB9KTtcbiAgXG4gICAgXG4gICAgdGhpcy52aWV3ZXIubWFwLmdldFZpZXcoKS5zZXRSZXNvbHV0aW9uKGluaXRpYWxSZXNvbHV0aW9uKTtcbiAgICBcbiAgICB0aGlzLnZpZXdlci5tYXAub24oJ21vdmVlbmQnLGZ1bmN0aW9uKGUpe1xuICAgICAgc2VsZi5fc2V0TWFwVmlldygpO1xuICAgIH0pO1xuXG4gICAgLy9BTCBNT01FTlRPIExBU0NJTyBDT1PDjCBQT0kgVkVESUFNT1xuICAgIFF1ZXJ5U2VydmljZS5zZXRNYXBTZXJ2aWNlKHRoaXMpO1xuXG4gICAgdGhpcy5lbWl0KCdyZWFkeScpO1xuICB9O1xuICBcbiAgdGhpcy5wcm9qZWN0Lm9uKCdwcm9qZWN0c3dpdGNoJyxmdW5jdGlvbigpe1xuICAgIHNlbGYuc2V0dXBMYXllcnMoKTtcbiAgfSk7XG4gIFxuICB0aGlzLnByb2plY3Qub25hZnRlcignc2V0TGF5ZXJzVmlzaWJsZScsZnVuY3Rpb24obGF5ZXJzSWRzKXtcbiAgICB2YXIgbWFwTGF5ZXJzID0gXy5tYXAobGF5ZXJzSWRzLGZ1bmN0aW9uKGxheWVySWQpe1xuICAgICAgdmFyIGxheWVyID0gc2VsZi5wcm9qZWN0LmdldExheWVyQnlJZChsYXllcklkKTtcbiAgICAgIHJldHVybiBzZWxmLmdldE1hcExheWVyRm9yTGF5ZXIobGF5ZXIpO1xuICAgIH0pXG4gICAgc2VsZi51cGRhdGVNYXBMYXllcnMoc2VsZi5nZXRNYXBMYXllcnMoKSk7XG4gIH0pO1xuICBcbiAgdGhpcy5wcm9qZWN0Lm9uYWZ0ZXIoJ3NldEJhc2VMYXllcicsZnVuY3Rpb24oKXtcbiAgICBzZWxmLnVwZGF0ZU1hcExheWVycyhzZWxmLm1hcEJhc2VMYXllcnMpO1xuICB9KTtcbiAgXG4gIGJhc2UodGhpcyk7XG59O1xuXG5pbmhlcml0KE1hcFNlcnZpY2UsRzNXT2JqZWN0KTtcblxudmFyIHByb3RvID0gTWFwU2VydmljZS5wcm90b3R5cGU7XG5cbi8vIHJlbmRlIHF1ZXN0byBtYXBzZXJ2aWNlIHNsYXZlIGRpIHVuIGFsdHJvIE1hcFNlcnZpY2VcbnByb3RvLnNsYXZlT2YgPSBmdW5jdGlvbihtYXBTZXJ2aWNlLCBzYW1lTGF5ZXJzKXtcbiAgLy8gc2UgaW1wb3N0YXJlIGkgbGF5ZXIgaW5pemlhbGkgdWd1YWxpIGEgcXVlbGxpIGRlbCBtYXBTZXJ2aWNlIG1hc3RlclxuICB2YXIgc2FtZUxheWVycyA9IHNhbWVMYXllcnMgfHwgZmFsc2U7XG59O1xuXG5wcm90by5zZXRMYXllcnNFeHRyYVBhcmFtcyA9IGZ1bmN0aW9uKHBhcmFtcyx1cGRhdGUpe1xuICB0aGlzLmxheWVyc0V4dHJhUGFyYW1zID0gXy5hc3NpZ24odGhpcy5sYXllcnNFeHRyYVBhcmFtcyxwYXJhbXMpO1xuICB0aGlzLmVtaXQoJ2V4dHJhUGFyYW1zU2V0JyxwYXJhbXMsdXBkYXRlKTtcbn07XG5cbnByb3RvLmdldFByb2plY3QgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMucHJvamVjdDtcbn07XG5cbnByb3RvLmdldE1hcCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy52aWV3ZXIubWFwO1xufTtcblxucHJvdG8uZ2V0UHJvamVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZXh0ZW50ID0gdGhpcy5wcm9qZWN0LnN0YXRlLmV4dGVudDtcbiAgdmFyIHByb2plY3Rpb24gPSBuZXcgb2wucHJvai5Qcm9qZWN0aW9uKHtcbiAgICBjb2RlOiBcIkVQU0c6XCIrdGhpcy5wcm9qZWN0LnN0YXRlLmNycyxcbiAgICBleHRlbnQ6IGV4dGVudFxuICB9KTtcbiAgcmV0dXJuIHByb2plY3Rpb247XG59O1xuXG5wcm90by5nZXRWaWV3ZXJFbGVtZW50ID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMudmlld2VyLm1hcC5nZXRUYXJnZXRFbGVtZW50KCk7XG59O1xuXG5wcm90by5nZXRWaWV3cG9ydCA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLnZpZXdlci5tYXAuZ2V0Vmlld3BvcnQoKTtcbn07XG5cbnByb3RvLmdldFJlc29sdXRpb24gPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudmlld2VyLm1hcC5nZXRWaWV3KCkuZ2V0UmVzb2x1dGlvbigpO1xufTtcblxucHJvdG8uZ2V0RXBzZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy52aWV3ZXIubWFwLmdldFZpZXcoKS5nZXRQcm9qZWN0aW9uKCkuZ2V0Q29kZSgpO1xufTtcblxucHJvdG8uZ2V0R2V0RmVhdHVyZUluZm9VcmxGb3JMYXllciA9IGZ1bmN0aW9uKGxheWVyLGNvb3JkaW5hdGVzLHJlc29sdXRpb24sZXBzZyxwYXJhbXMpIHtcbiAgdmFyIG1hcExheWVyID0gdGhpcy5nZXRNYXBMYXllckZvckxheWVyKGxheWVyKTtcbiAgcmV0dXJuIG1hcExheWVyLmdldEdldEZlYXR1cmVJbmZvVXJsKGNvb3JkaW5hdGVzLHJlc29sdXRpb24sZXBzZyxwYXJhbXMpO1xufTtcblxucHJvdG8uc2V0dXBDb250cm9scyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIG1hcCA9IHNlbGYudmlld2VyLm1hcDtcbiAgaWYgKHRoaXMuY29uZmlnICYmIHRoaXMuY29uZmlnLm1hcGNvbnRyb2xzKSB7XG4gICAgXy5mb3JFYWNoKHRoaXMuY29uZmlnLm1hcGNvbnRyb2xzLGZ1bmN0aW9uKGNvbnRyb2xUeXBlKXtcbiAgICAgIHZhciBjb250cm9sO1xuICAgICAgc3dpdGNoIChjb250cm9sVHlwZSkge1xuICAgICAgICBjYXNlICdyZXNldCc6XG4gICAgICAgICAgaWYgKCFpc01vYmlsZS5hbnkpIHtcbiAgICAgICAgICAgIGNvbnRyb2wgPSBDb250cm9sc0ZhY3RvcnkuY3JlYXRlKHtcbiAgICAgICAgICAgICAgdHlwZTogY29udHJvbFR5cGVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZWxmLmFkZENvbnRyb2woY29udHJvbCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3pvb20nOlxuICAgICAgICAgIGNvbnRyb2wgPSBDb250cm9sc0ZhY3RvcnkuY3JlYXRlKHtcbiAgICAgICAgICAgIHR5cGU6IGNvbnRyb2xUeXBlLFxuICAgICAgICAgICAgem9vbUluTGFiZWw6IFwiXFx1ZTk4YVwiLFxuICAgICAgICAgICAgem9vbU91dExhYmVsOiBcIlxcdWU5OGJcIlxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHNlbGYuYWRkQ29udHJvbChjb250cm9sKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnem9vbWJveCc6IFxuICAgICAgICAgIGlmICghaXNNb2JpbGUuYW55KSB7XG4gICAgICAgICAgICBjb250cm9sID0gQ29udHJvbHNGYWN0b3J5LmNyZWF0ZSh7XG4gICAgICAgICAgICAgIHR5cGU6IGNvbnRyb2xUeXBlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnRyb2wub24oJ3pvb21lbmQnLGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgICBzZWxmLnZpZXdlci5maXQoZS5leHRlbnQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgc2VsZi5hZGRDb250cm9sKGNvbnRyb2wpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICd6b29tdG9leHRlbnQnOlxuICAgICAgICAgIGNvbnRyb2wgPSBDb250cm9sc0ZhY3RvcnkuY3JlYXRlKHtcbiAgICAgICAgICAgIHR5cGU6IGNvbnRyb2xUeXBlLFxuICAgICAgICAgICAgbGFiZWw6ICBcIlxcdWU5OGNcIixcbiAgICAgICAgICAgIGV4dGVudDogc2VsZi5jb25maWcuY29uc3RyYWludGV4dGVudFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHNlbGYuYWRkQ29udHJvbChjb250cm9sKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncXVlcnknOlxuICAgICAgICAgIGNvbnRyb2wgPSBDb250cm9sc0ZhY3RvcnkuY3JlYXRlKHtcbiAgICAgICAgICAgIHR5cGU6IGNvbnRyb2xUeXBlXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgY29udHJvbC5vbigncGlja2VkJyxmdW5jdGlvbihlKXtcbiAgICAgICAgICAgIHZhciBjb29yZGluYXRlcyA9IGUuY29vcmRpbmF0ZXM7XG4gICAgICAgICAgICB2YXIgc2hvd1F1ZXJ5UmVzdWx0cyA9IEdVSS5zaG93UmVzdWx0c0ZhY3RvcnkoJ3F1ZXJ5Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBsYXllcnMgPSBzZWxmLnByb2plY3QuZ2V0TGF5ZXJzKHtcbiAgICAgICAgICAgICAgUVVFUllBQkxFOiB0cnVlLFxuICAgICAgICAgICAgICBTRUxFQ1RFRE9SQUxMOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy9mYWNjaW8gcXVlcnkgYnkgbG9jYXRpb24gc3UgaSBsYXllcnMgc2VsZXppb25hdGkgbyB0dXR0aVxuICAgICAgICAgICAgdmFyIHF1ZXJ5UmVzdWx0c1BhbmVsID0gc2hvd1F1ZXJ5UmVzdWx0cygnaW50ZXJyb2dhemlvbmUnKTtcbiAgICAgICAgICAgIFF1ZXJ5U2VydmljZS5xdWVyeUJ5TG9jYXRpb24oY29vcmRpbmF0ZXMsIGxheWVycylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdHMpe1xuICAgICAgICAgICAgICBxdWVyeVJlc3VsdHNQYW5lbC5zZXRRdWVyeVJlc3BvbnNlKHJlc3VsdHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgc2VsZi5hZGRDb250cm9sKGNvbnRyb2wpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdzY2FsZWxpbmUnOlxuICAgICAgICAgIGNvbnRyb2wgPSBDb250cm9sc0ZhY3RvcnkuY3JlYXRlKHtcbiAgICAgICAgICAgIHR5cGU6IGNvbnRyb2xUeXBlLFxuICAgICAgICAgICAgcG9zaXRpb246ICdicidcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBzZWxmLmFkZENvbnRyb2woY29udHJvbCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ292ZXJ2aWV3JzpcbiAgICAgICAgICB2YXIgb3ZlcnZpZXdQcm9qZWN0R2lkID0gc2VsZi5wcm9qZWN0LmdldE92ZXJ2aWV3UHJvamVjdEdpZCgpO1xuICAgICAgICAgIGlmIChvdmVydmlld1Byb2plY3RHaWQpIHtcbiAgICAgICAgICAgIFByb2plY3RzUmVnaXN0cnkuZ2V0UHJvamVjdChvdmVydmlld1Byb2plY3RHaWQpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihwcm9qZWN0KXtcbiAgICAgICAgICAgICAgdmFyIG92ZXJWaWV3TWFwTGF5ZXJzID0gc2VsZi5nZXRPdmVydmlld01hcExheWVycyhwcm9qZWN0KTtcbiAgICAgICAgICAgICAgY29udHJvbCA9IENvbnRyb2xzRmFjdG9yeS5jcmVhdGUoe1xuICAgICAgICAgICAgICAgIHR5cGU6IGNvbnRyb2xUeXBlLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAnYmwnLFxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ29sLW92ZXJ2aWV3bWFwIG9sLWN1c3RvbS1vdmVydmlld21hcCcsXG4gICAgICAgICAgICAgICAgY29sbGFwc2VMYWJlbDogJCgnPHNwYW4gY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLW1lbnUtbGVmdFwiPjwvc3Bhbj4nKVswXSxcbiAgICAgICAgICAgICAgICBsYWJlbDogJCgnPHNwYW4gY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLW1lbnUtcmlnaHRcIj48L3NwYW4+JylbMF0sXG4gICAgICAgICAgICAgICAgY29sbGFwc2VkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBsYXllcnM6IG92ZXJWaWV3TWFwTGF5ZXJzLFxuICAgICAgICAgICAgICAgIHZpZXc6IG5ldyBvbC5WaWV3KHtcbiAgICAgICAgICAgICAgICAgIHByb2plY3Rpb246IHNlbGYuZ2V0UHJvamVjdGlvbigpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHNlbGYuYWRkQ29udHJvbChjb250cm9sKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cbn07XG5cbnByb3RvLmFkZENvbnRyb2wgPSBmdW5jdGlvbihjb250cm9sKXtcbiAgdGhpcy52aWV3ZXIubWFwLmFkZENvbnRyb2woY29udHJvbCk7XG4gIHRoaXMuX21hcENvbnRyb2xzLnB1c2goY29udHJvbCk7XG59O1xuXG5wcm90by5hZGRNYXBMYXllciA9IGZ1bmN0aW9uKG1hcExheWVyKSB7XG4gIHRoaXMuX21hcExheWVycy5wdXNoKG1hcExheWVyKTtcbn07XG5cbnByb3RvLmdldE1hcExheWVycyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5fbWFwTGF5ZXJzO1xufTtcblxucHJvdG8uZ2V0TWFwTGF5ZXJGb3JMYXllciA9IGZ1bmN0aW9uKGxheWVyKXtcbiAgdmFyIG1hcExheWVyO1xuICB2YXIgbXVsdGlsYXllcklkID0gJ2xheWVyXycrbGF5ZXIuc3RhdGUubXVsdGlsYXllcjtcbiAgXy5mb3JFYWNoKHRoaXMuZ2V0TWFwTGF5ZXJzKCksZnVuY3Rpb24oX21hcExheWVyKXtcbiAgICBpZiAoX21hcExheWVyLmdldElkKCkgPT0gbXVsdGlsYXllcklkKSB7XG4gICAgICBtYXBMYXllciA9IF9tYXBMYXllcjtcbiAgICB9XG4gIH0pXG4gIHJldHVybiBtYXBMYXllcjtcbn07XG5cbnByb3RvLnNldHVwQmFzZUxheWVycyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKCF0aGlzLnByb2plY3Quc3RhdGUuYmFzZWxheWVycyl7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5tYXBCYXNlTGF5ZXJzID0ge307XG4gIFxuICB2YXIgaW5pdEJhc2VMYXllciA9IFByb2plY3RzUmVnaXN0cnkuY29uZmlnLmluaXRiYXNlbGF5ZXI7XG4gIHZhciBiYXNlTGF5ZXJzQXJyYXkgPSB0aGlzLnByb2plY3Quc3RhdGUuYmFzZWxheWVycztcbiAgXG4gIF8uZm9yRWFjaChiYXNlTGF5ZXJzQXJyYXksZnVuY3Rpb24oYmFzZUxheWVyKXtcbiAgICB2YXIgdmlzaWJsZSA9IHRydWU7XG4gICAgaWYgKHNlbGYucHJvamVjdC5zdGF0ZS5pbml0YmFzZWxheWVyKSB7XG4gICAgICB2aXNpYmxlID0gYmFzZUxheWVyLmlkID09IChzZWxmLnByb2plY3Quc3RhdGUuaW5pdGJhc2VsYXllcik7XG4gICAgfVxuICAgIGlmIChiYXNlTGF5ZXIuZml4ZWQpIHtcbiAgICAgIHZpc2libGUgPSBiYXNlTGF5ZXIuZml4ZWQ7XG4gICAgfVxuICAgIGJhc2VMYXllci52aXNpYmxlID0gdmlzaWJsZTtcbiAgfSlcbiAgXG4gIGJhc2VMYXllcnNBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGxheWVyKXsgICAgIFxuICAgIHZhciBjb25maWcgPSB7XG4gICAgICB1cmw6IHNlbGYucHJvamVjdC5nZXRXbXNVcmwoKSxcbiAgICAgIGlkOiBsYXllci5pZCxcbiAgICAgIHRpbGVkOiB0cnVlXG4gICAgfTtcbiAgICBcbiAgICB2YXIgbWFwTGF5ZXIgPSBuZXcgV01TTGF5ZXIoY29uZmlnKTtcbiAgICBzZWxmLnJlZ2lzdGVyTGlzdGVuZXJzKG1hcExheWVyKTtcbiAgICBcbiAgICBtYXBMYXllci5hZGRMYXllcihsYXllcik7XG4gICAgc2VsZi5tYXBCYXNlTGF5ZXJzW2xheWVyLmlkXSA9IG1hcExheWVyO1xuICB9KTtcbiAgXG4gIF8uZm9yRWFjaChfLnZhbHVlcyh0aGlzLm1hcEJhc2VMYXllcnMpLnJldmVyc2UoKSxmdW5jdGlvbihtYXBMYXllcil7XG4gICAgc2VsZi52aWV3ZXIubWFwLmFkZExheWVyKG1hcExheWVyLmdldE9MTGF5ZXIoKSk7XG4gICAgbWFwTGF5ZXIudXBkYXRlKHNlbGYuc3RhdGUpO1xuICB9KVxufTtcblxucHJvdG8uc2V0dXBMYXllcnMgPSBmdW5jdGlvbigpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMudmlld2VyLnJlbW92ZUxheWVycygpO1xuICB0aGlzLnNldHVwQmFzZUxheWVycygpO1xuICB0aGlzLl9yZXNldCgpO1xuICB2YXIgbGF5ZXJzID0gdGhpcy5wcm9qZWN0LmdldExheWVycygpO1xuICAvL3JhZ2dydXBwbyBwZXIgdmFsb3JlIGRlbCBtdWx0aWxheWVyIGNvbiBjaGlhdmUgdmFsb3JlIG11bHRpbGF5ZXIgZSB2YWxvcmUgYXJyYXlcbiAgdmFyIG11bHRpTGF5ZXJzID0gXy5ncm91cEJ5KGxheWVycyxmdW5jdGlvbihsYXllcil7XG4gICAgcmV0dXJuIGxheWVyLnN0YXRlLm11bHRpbGF5ZXI7XG4gIH0pO1xuICBfLmZvckVhY2gobXVsdGlMYXllcnMsZnVuY3Rpb24obGF5ZXJzLGlkKXtcbiAgICB2YXIgbXVsdGlsYXllcklkID0gJ2xheWVyXycraWRcbiAgICB2YXIgdGlsZWQgPSBsYXllcnNbMF0uc3RhdGUudGlsZWQ7XG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgIHVybDogc2VsZi5wcm9qZWN0LmdldFdtc1VybCgpLFxuICAgICAgaWQ6IG11bHRpbGF5ZXJJZCxcbiAgICAgIHRpbGVkOiB0aWxlZFxuICAgIH07XG4gICAgdmFyIG1hcExheWVyID0gbmV3IFdNU0xheWVyKGNvbmZpZyxzZWxmLmxheWVyc0V4dHJhUGFyYW1zKTtcbiAgICBzZWxmLmFkZE1hcExheWVyKG1hcExheWVyKTtcbiAgICBzZWxmLnJlZ2lzdGVyTGlzdGVuZXJzKG1hcExheWVyKTtcbiAgICBfLmZvckVhY2gobGF5ZXJzLnJldmVyc2UoKSxmdW5jdGlvbihsYXllcil7XG4gICAgICBtYXBMYXllci5hZGRMYXllcihsYXllcik7XG4gICAgfSk7XG4gIH0pXG4gIFxuICBfLmZvckVhY2godGhpcy5nZXRNYXBMYXllcnMoKS5yZXZlcnNlKCksZnVuY3Rpb24obWFwTGF5ZXIpe1xuICAgIHNlbGYudmlld2VyLm1hcC5hZGRMYXllcihtYXBMYXllci5nZXRPTExheWVyKCkpO1xuICAgIG1hcExheWVyLnVwZGF0ZShzZWxmLnN0YXRlLHNlbGYubGF5ZXJzRXh0cmFQYXJhbXMpO1xuICB9KVxuICByZXR1cm4gdGhpcy5tYXBMYXllcnM7XG59O1xuXG5wcm90by5nZXRPdmVydmlld01hcExheWVycyA9IGZ1bmN0aW9uKHByb2plY3QpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgcHJvamVjdExheWVycyA9IHByb2plY3QuZ2V0TGF5ZXJzKHtcbiAgICAnVklTSUJMRSc6IHRydWVcbiAgfSk7XG5cbiAgdmFyIG11bHRpTGF5ZXJzID0gXy5ncm91cEJ5KHByb2plY3RMYXllcnMsZnVuY3Rpb24obGF5ZXIpe1xuICAgIHJldHVybiBsYXllci5zdGF0ZS5tdWx0aWxheWVyO1xuICB9KTtcbiAgXG4gIHZhciBvdmVydmlld01hcExheWVycyA9IFtdO1xuICBfLmZvckVhY2gobXVsdGlMYXllcnMsZnVuY3Rpb24obGF5ZXJzLGlkKXtcbiAgICB2YXIgbXVsdGlsYXllcklkID0gJ292ZXJ2aWV3X2xheWVyXycraWRcbiAgICB2YXIgdGlsZWQgPSBsYXllcnNbMF0uc3RhdGUudGlsZWQ7XG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgIHVybDogcHJvamVjdC5nZXRXbXNVcmwoKSxcbiAgICAgIGlkOiBtdWx0aWxheWVySWQsXG4gICAgICB0aWxlZDogdGlsZWRcbiAgICB9O1xuICAgIHZhciBtYXBMYXllciA9IG5ldyBXTVNMYXllcihjb25maWcpO1xuICAgIF8uZm9yRWFjaChsYXllcnMucmV2ZXJzZSgpLGZ1bmN0aW9uKGxheWVyKXtcbiAgICAgIG1hcExheWVyLmFkZExheWVyKGxheWVyKTtcbiAgICB9KTtcbiAgICBvdmVydmlld01hcExheWVycy5wdXNoKG1hcExheWVyLmdldE9MTGF5ZXIodHJ1ZSkpO1xuICB9KVxuICBcbiAgcmV0dXJuIG92ZXJ2aWV3TWFwTGF5ZXJzLnJldmVyc2UoKTtcbn07XG5cbnByb3RvLnVwZGF0ZU1hcExheWVycyA9IGZ1bmN0aW9uKG1hcExheWVycykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIF8uZm9yRWFjaChtYXBMYXllcnMsZnVuY3Rpb24obWFwTGF5ZXIpe1xuICAgIG1hcExheWVyLnVwZGF0ZShzZWxmLnN0YXRlLHNlbGYubGF5ZXJzRXh0cmFQYXJhbXMpO1xuICB9KVxufTtcblxucHJvdG8ucmVnaXN0ZXJMaXN0ZW5lcnMgPSBmdW5jdGlvbihtYXBMYXllcil7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgbWFwTGF5ZXIub24oJ2xvYWRzdGFydCcsZnVuY3Rpb24oKXtcbiAgICBzZWxmLl9pbmNyZW1lbnRMb2FkZXJzKCk7XG4gIH0pO1xuICBtYXBMYXllci5vbignbG9hZGVuZCcsZnVuY3Rpb24oKXtcbiAgICBzZWxmLl9kZWNyZW1lbnRMb2FkZXJzKGZhbHNlKTtcbiAgfSk7XG4gIFxuICB0aGlzLm9uKCdleHRyYVBhcmFtc1NldCcsZnVuY3Rpb24oZXh0cmFQYXJhbXMsdXBkYXRlKXtcbiAgICBpZiAodXBkYXRlKSB7XG4gICAgICBtYXBMYXllci51cGRhdGUodGhpcy5zdGF0ZSxleHRyYVBhcmFtcyk7XG4gICAgfVxuICB9KVxufTtcblxucHJvdG8uc2V0VGFyZ2V0ID0gZnVuY3Rpb24oZWxJZCl7XG4gIHRoaXMudGFyZ2V0ID0gZWxJZDtcbn07XG5cbnByb3RvLmFkZEludGVyYWN0aW9uID0gZnVuY3Rpb24oaW50ZXJhY3Rpb24pe1xuICB0aGlzLl91bnNldENvbnRyb2xzKCk7XG4gIHRoaXMudmlld2VyLm1hcC5hZGRJbnRlcmFjdGlvbihpbnRlcmFjdGlvbik7XG4gIGludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbn07XG5cbnByb3RvLnJlbW92ZUludGVyYWN0aW9uID0gZnVuY3Rpb24oaW50ZXJhY3Rpb24pe1xuICB0aGlzLnZpZXdlci5tYXAucmVtb3ZlSW50ZXJhY3Rpb24oaW50ZXJhY3Rpb24pO1xufTtcblxuLy8gZW1ldHRvIGV2ZW50byBxdWFuZG8gdmllbmUgYXR0aXZhdGEgdW4gaW50ZXJhemlvbmUgZGkgdGlwbyBQb2ludGVyICh1dGlsZSBhZCBlcy4gcGVyIGRpc2F0dGl2YXJlL3JpYXR0aXZhcmUgaSB0b29sIGRpIGVkaXRpbmcpXG5wcm90by5fd2F0Y2hJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKGludGVyYWN0aW9uKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaW50ZXJhY3Rpb24ub24oJ2NoYW5nZTphY3RpdmUnLGZ1bmN0aW9uKGUpe1xuICAgIGlmICgoZS50YXJnZXQgaW5zdGFuY2VvZiBvbC5pbnRlcmFjdGlvbi5Qb2ludGVyKSAmJiBlLnRhcmdldC5nZXRBY3RpdmUoKSkge1xuICAgICAgc2VsZi5lbWl0KCdwb2ludGVySW50ZXJhY3Rpb25TZXQnLGUudGFyZ2V0KTtcbiAgICB9XG4gIH0pXG59O1xuXG5wcm90by5nb1RvID0gZnVuY3Rpb24oY29vcmRpbmF0ZXMsem9vbSl7XG4gIHZhciB6b29tID0gem9vbSB8fCA2O1xuICB0aGlzLnZpZXdlci5nb1RvKGNvb3JkaW5hdGVzLHpvb20pO1xufTtcblxucHJvdG8uZ29Ub1dHUzg0ID0gZnVuY3Rpb24oY29vcmRpbmF0ZXMsem9vbSl7XG4gIHZhciBjb29yZGluYXRlcyA9IG9sLnByb2oudHJhbnNmb3JtKGNvb3JkaW5hdGVzLCdFUFNHOjQzMjYnLCdFUFNHOicrdGhpcy5wcm9qZWN0LnN0YXRlLmNycyk7XG4gIHRoaXMuZ29Ubyhjb29yZGluYXRlcyx6b29tKTtcbn07XG5cbnByb3RvLmV4dGVudFRvV0dTODQgPSBmdW5jdGlvbihleHRlbnQpe1xuICByZXR1cm4gb2wucHJvai50cmFuc2Zvcm1FeHRlbnQoZXh0ZW50LCdFUFNHOicrdGhpcy5wcm9qZWN0LnN0YXRlLmNycywnRVBTRzo0MzI2Jyk7XG59O1xuXG5wcm90by5oaWdobGlnaHRHZW9tZXRyeSA9IGZ1bmN0aW9uKGdlb21ldHJ5T2JqLG9wdGlvbnMpe1xuICB2YXIgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciB6b29tID0gb3B0aW9ucy56b29tIHx8IHRydWU7XG4gIFxuICB2YXIgdmlldyA9IHRoaXMudmlld2VyLm1hcC5nZXRWaWV3KCk7XG4gIFxuICB2YXIgZ2VvbWV0cnk7XG4gIGlmIChnZW9tZXRyeU9iaiBpbnN0YW5jZW9mIG9sLmdlb20uR2VvbWV0cnkpe1xuICAgIGdlb21ldHJ5ID0gZ2VvbWV0cnlPYmo7XG4gIH1cbiAgZWxzZSB7XG4gICAgZm9ybWF0ID0gbmV3IG9sLmZvcm1hdC5HZW9KU09OO1xuICAgIGdlb21ldHJ5ID0gZm9ybWF0LnJlYWRHZW9tZXRyeShnZW9tZXRyeU9iaik7XG4gIH1cbiAgXG4gIHZhciBnZW9tZXRyeVR5cGUgPSBnZW9tZXRyeS5nZXRUeXBlKCk7XG4gIGlmIChnZW9tZXRyeVR5cGUgPT0gJ1BvaW50Jykge1xuICAgIHRoaXMudmlld2VyLmdvVG8oZ2VvbWV0cnkuZ2V0Q29vcmRpbmF0ZXMoKSk7XG4gIH1cbiAgZWxzZSB7XG4gICAgaWYgKHpvb20pIHtcbiAgICAgIHRoaXMudmlld2VyLmZpdChnZW9tZXRyeSxvcHRpb25zKTtcbiAgICB9XG4gIH1cblxuICB2YXIgZHVyYXRpb24gPSBvcHRpb25zLmR1cmF0aW9uIHx8IDQwMDA7XG4gIFxuICBpZiAob3B0aW9ucy5mcm9tV0dTODQpIHtcbiAgICBnZW9tZXRyeS50cmFuc2Zvcm0oJ0VQU0c6NDMyNicsJ0VQU0c6JytQcm9qZWN0U2VydmljZS5zdGF0ZS5wcm9qZWN0LmNycyk7XG4gIH1cbiAgXG4gIHZhciBmZWF0dXJlID0gbmV3IG9sLkZlYXR1cmUoe1xuICAgIGdlb21ldHJ5OiBnZW9tZXRyeVxuICB9KTtcbiAgdmFyIHNvdXJjZSA9IG5ldyBvbC5zb3VyY2UuVmVjdG9yKCk7XG4gIHNvdXJjZS5hZGRGZWF0dXJlcyhbZmVhdHVyZV0pO1xuICB2YXIgbGF5ZXIgPSBuZXcgb2wubGF5ZXIuVmVjdG9yKHtcbiAgICBzb3VyY2U6IHNvdXJjZSxcbiAgICBzdHlsZTogZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICB2YXIgc3R5bGVzID0gW107XG4gICAgICB2YXIgZ2VvbWV0cnlUeXBlID0gZmVhdHVyZS5nZXRHZW9tZXRyeSgpLmdldFR5cGUoKTtcbiAgICAgIGlmIChnZW9tZXRyeVR5cGUgPT0gJ0xpbmVTdHJpbmcnKSB7XG4gICAgICAgIHZhciBzdHlsZSA9IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgICAgICAgIGNvbG9yOiAncmdiKDI1NSwyNTUsMCknLFxuICAgICAgICAgICAgd2lkdGg6IDRcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICBzdHlsZXMucHVzaChzdHlsZSk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChnZW9tZXRyeVR5cGUgPT0gJ1BvaW50Jyl7XG4gICAgICAgIHZhciBzdHlsZSA9IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgICAgaW1hZ2U6IG5ldyBvbC5zdHlsZS5DaXJjbGUoe1xuICAgICAgICAgICAgcmFkaXVzOiA2LFxuICAgICAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgICAgICBjb2xvcjogJ3JnYigyNTUsMjU1LDApJyxcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSksXG4gICAgICAgICAgekluZGV4OiBJbmZpbml0eVxuICAgICAgICB9KTtcbiAgICAgICAgc3R5bGVzLnB1c2goc3R5bGUpO1xuICAgICAgfVxuICAgICAgXG4gICAgICByZXR1cm4gc3R5bGVzO1xuICAgIH1cbiAgfSlcbiAgbGF5ZXIuc2V0TWFwKHRoaXMudmlld2VyLm1hcCk7XG4gIFxuICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgbGF5ZXIuc2V0TWFwKG51bGwpO1xuICB9LGR1cmF0aW9uKTtcbn07XG5cbnByb3RvLnJlZnJlc2hNYXAgPSBmdW5jdGlvbigpe1xuICBfLmZvckVhY2godGhpcy5tYXBMYXllcnMsZnVuY3Rpb24od21zTGF5ZXIpe1xuICAgIHdtc0xheWVyLmdldE9MTGF5ZXIoKS5nZXRTb3VyY2UoKS51cGRhdGVQYXJhbXMoe1widGltZVwiOiBEYXRlLm5vdygpfSk7XG4gIH0pXG59O1xuXG5wcm90by5yZXNpemUgPSBmdW5jdGlvbih3aWR0aCxoZWlnaHQpIHtcbiAgaWYgKCF0aGlzLnZpZXdlcikge1xuICAgIHZhciBpbml0aWFsRXh0ZW50ID0gdGhpcy5wcm9qZWN0LnN0YXRlLmV4dGVudDtcbiAgICB2YXIgeFJlcyA9IG9sLmV4dGVudC5nZXRXaWR0aChpbml0aWFsRXh0ZW50KSAvIHdpZHRoO1xuICAgIHZhciB5UmVzID0gb2wuZXh0ZW50LmdldEhlaWdodChpbml0aWFsRXh0ZW50KSAvIGhlaWdodDtcbiAgICB2YXIgcmVzID0gTWF0aC5tYXgoeFJlcyx5UmVzKTtcbiAgICB0aGlzLnNldHVwVmlld2VyKHJlcyk7XG4gIH1cbiAgdGhpcy5nZXRNYXAoKS51cGRhdGVTaXplKCk7XG4gIHRoaXMuX3NldE1hcFZpZXcoKTtcbn07XG5cbnByb3RvLl9yZXNldCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9tYXBMYXllcnMgPSBbXTtcbn07XG5cbnByb3RvLl91bnNldENvbnRyb2xzID0gZnVuY3Rpb24oKSB7XG4gIF8uZm9yRWFjaCh0aGlzLl9tYXBDb250cm9scyxmdW5jdGlvbihjb250cm9sKXtcbiAgICBpZiAoY29udHJvbC50b2dnbGUpIHtcbiAgICAgIGNvbnRyb2wudG9nZ2xlKGZhbHNlKTtcbiAgICB9XG4gIH0pXG59O1xuXG5wcm90by5fc2V0TWFwVmlldyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBiYm94ID0gdGhpcy52aWV3ZXIuZ2V0QkJPWCgpO1xuICB2YXIgcmVzb2x1dGlvbiA9IHRoaXMudmlld2VyLmdldFJlc29sdXRpb24oKTtcbiAgdmFyIGNlbnRlciA9IHRoaXMudmlld2VyLmdldENlbnRlcigpO1xuICB0aGlzLnNldE1hcFZpZXcoYmJveCxyZXNvbHV0aW9uLGNlbnRlcik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcFNlcnZpY2VcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGlkPVxcXCJtYXBcXFwiIHN0eWxlPVxcXCJ3aWR0aDoxMDAlO2hlaWdodDoxMDAlXFxcIj48L2Rpdj5cXG5cIjtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIG1lcmdlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLm1lcmdlO1xudmFyIHQgPSByZXF1aXJlKCdjb3JlL2kxOG4vaTE4bi5zZXJ2aWNlJykudDtcbnZhciByZXNvbHZlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlc29sdmU7XG52YXIgR1VJID0gcmVxdWlyZSgnZ3VpL2d1aScpOyAgIFxudmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJ2d1aS92dWUvY29tcG9uZW50Jyk7XG52YXIgUm91dGVyU2VydmljZSA9IHJlcXVpcmUoJ2NvcmUvcm91dGVyJyk7XG52YXIgb2wzaGVscGVycyA9IHJlcXVpcmUoJ2czdy1vbDMvc3JjL2czdy5vbDMnKS5oZWxwZXJzO1xudmFyIE1hcHNSZWdpc3RyeSA9IHJlcXVpcmUoJ2NvcmUvbWFwL21hcHNyZWdpc3RyeScpO1xudmFyIE1hcFNlcnZpY2UgPSByZXF1aXJlKCcuLi9tYXBzZXJ2aWNlJyk7XG5cbnZhciB2dWVDb21wb25lbnRPcHRpb25zID0ge1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9tYXAuaHRtbCcpLFxuICByZWFkeTogZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXG4gICAgdmFyIG1hcFNlcnZpY2UgPSB0aGlzLiRvcHRpb25zLm1hcFNlcnZpY2U7XG4gICAgXG4gICAgbWFwU2VydmljZS5zZXRUYXJnZXQodGhpcy4kZWwuaWQpO1xuICAgIFxuICAgIC8vIHF1ZXN0byBzZXJ2ZSBwZXIgcXVhbmRvIHZpZW5lIGNhbWJpYXRvIHByb2dldHRvL3Zpc3RhIGNhcnRvZ3JhZmljYSwgaW4gY3VpIHZpZW5lIHJpY3JlYXRvIGlsIHZpZXdlciAoZSBxdWluZGkgbGEgbWFwcGEpXG4gICAgbWFwU2VydmljZS5vbmFmdGVyKCdzZXR1cFZpZXdlcicsZnVuY3Rpb24oKXtcbiAgICAgIG1hcFNlcnZpY2Uuc2V0VGFyZ2V0KHNlbGYuJGVsLmlkKTtcbiAgICB9KTtcbiAgfVxufVxuXG52YXIgSW50ZXJuYWxDb21wb25lbnQgPSBWdWUuZXh0ZW5kKHZ1ZUNvbXBvbmVudE9wdGlvbnMpO1xuXG5WdWUuY29tcG9uZW50KCdnM3ctbWFwJywgdnVlQ29tcG9uZW50T3B0aW9ucyk7XG5cbmZ1bmN0aW9uIE1hcENvbXBvbmVudChvcHRpb25zKXtcbiAgYmFzZSh0aGlzLG9wdGlvbnMpO1xuICB0aGlzLmlkID0gXCJtYXAtY29tcG9uZW50XCI7XG4gIHRoaXMudGl0bGUgPSBcIkNhdGFsb2dvIGRhdGlcIjtcbiAgdGhpcy5fc2VydmljZSA9IG5ldyBNYXBTZXJ2aWNlO1xuICBtZXJnZSh0aGlzLCBvcHRpb25zKTtcbiAgdGhpcy5pbnRlcm5hbENvbXBvbmVudCA9IG5ldyBJbnRlcm5hbENvbXBvbmVudCh7XG4gICAgbWFwU2VydmljZTogdGhpcy5fc2VydmljZVxuICB9KTtcbn07XG5cbmluaGVyaXQoTWFwQ29tcG9uZW50LCBDb21wb25lbnQpO1xudmFyIHByb3RvID0gTWFwQ29tcG9uZW50LnByb3RvdHlwZTtcblxucHJvdG8ubGF5b3V0ID0gZnVuY3Rpb24od2lkdGgsaGVpZ2h0KSB7XG4gICQoXCIjbWFwXCIpLmhlaWdodChoZWlnaHQpO1xuICAkKFwiI21hcFwiKS53aWR0aCh3aWR0aCk7XG4gIHRoaXMuX3NlcnZpY2UucmVzaXplKHdpZHRoLGhlaWdodCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9ICBNYXBDb21wb25lbnQ7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIHJlc29sdmVkVmFsdWUgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykucmVzb2x2ZTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xuXG52YXIgUGFuZWwgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIHRoaXMuaW50ZXJuYWxQYW5lbCA9IG51bGw7XG4gIHZhciBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5pZCA9IG9wdGlvbnMuaWQgfHwgbnVsbDtcbiAgdGhpcy50aXRsZSA9IG9wdGlvbnMudGl0bGUgfHwgJyc7XG59O1xuXG5pbmhlcml0KFBhbmVsLCBHM1dPYmplY3QpO1xuXG52YXIgcHJvdG8gPSBQYW5lbC5wcm90b3R5cGU7XG5cbnByb3RvLmdldElkID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuaWQ7XG59O1xuXG5wcm90by5nZXRUaXRsZSA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLnRpdGxlO1xufTtcblxuLyogSE9PS1MgKi9cblxuLypcbiAqIElsIG1ldG9kbyBwZXJtZXR0ZSBhbCBwYW5uZWxsbyBkaSBtb250YXJzaSBuZWwgRE9NXG4gKiBwYXJlbnQ6IGVsZW1lbnRvIERPTSBwYWRyZSwgc3UgY3VpIGluc2VyaXJzaTtcbiAqIHJpdG9ybmEgdW5hIHByb21pc2UsIHJpc29sdGEgbmVsIG1vbWVudG8gaW4gY3VpIHNhcsOgIHRlcm1pbmF0byBpbCBtb250YWdnaW9cbiovXG5cbi8vIFNPTk8gRFVFIFRJUE9MT0dJRSBESSBNT05UQUdHSU8gQ09OIElMIFFVQUxFIElMIFBBTk5FTExPXG4vLyBDSEUgVkVSUkEnIE1PTlRBVE8gQUwgVk9MTyBDT04gSUwgTUVUT0RPIE1PVU5UIEEgU0VDT05EQSBERUwgVElQTyBESSBQQU5ORUxMTyBSSUNISUVTVE9cblxuLy8gcmljaGlhbWF0byBxdWFuZG8gbGEgR1VJIGNoaWVkZSBkaSBjaGl1ZGVyZSBpbCBwYW5uZWxsby4gU2Ugcml0b3JuYSBmYWxzZSBpbCBwYW5uZWxsbyBub24gdmllbmUgY2hpdXNvXG5cbnByb3RvLm1vdW50ID0gZnVuY3Rpb24ocGFyZW50KSB7XG4gIHZhciBwYW5lbCA9IHRoaXMuaW50ZXJuYWxQYW5lbDtcbiAgcGFuZWwuJG1vdW50KCkuJGFwcGVuZFRvKHBhcmVudCk7XG4gICQocGFyZW50KS5sb2NhbGl6ZSgpO1xuICByZXR1cm4gcmVzb2x2ZWRWYWx1ZSh0cnVlKTtcbn07XG5cbi8qXG4gKiBNZXRvZG8gcmljaGlhbWF0byBxdWFuZG8gc2kgdnVvbGUgcmltdW92ZXJlIGlsIHBhbmVsbG8uXG4gKiBSaXRvcm5hIHVuYSBwcm9tZXNzYSBjaGUgc2Fyw6Agcmlzb2x0YSBuZWwgbW9tZW50byBpbiBjdWkgaWwgcGFubmVsbG8gYXZyw6AgY29tcGxldGF0byBsYSBwcm9wcmlhIHJpbW96aW9uZSAoZWQgZXZlbnR1YWxlIHJpbGFzY2lvIGRpIHJpc29yc2UgZGlwZW5kZW50aSlcbiovXG5wcm90by51bm1vdW50ID0gZnVuY3Rpb24oKXtcbiAgdmFyIHBhbmVsID0gdGhpcy5pbnRlcm5hbFBhbmVsO1xuICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gIHBhbmVsLiRkZXN0cm95KHRydWUpO1xuICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG59O1xuXG4vKlxuICogTWV0b2RvIChvcHppb25hbGUpIGNoZSBvZmZyZSBsJ29wcG9ydHVuaXTDoCBkaSByaWNhbGNvbGFyZSBwcm9wcmlldMOgIGRpcGVuZGVudGkgZGFsbGUgZGltZW5zaW9uaSBkZWwgcGFkcmVcbiAqIHBhcmVudEhlaWdodDogbnVvdmEgYWx0ZXp6YSBkZWwgcGFyZW50XG4gKiBwYXJlbnRXaWR0aDogbnVvdmEgbGFyZ2hlenphIGRlbCBwYXJlbnRcbiAqIHJpY2hpYW1hdG8gb2duaSB2b2x0YSBjaGUgaWwgcGFyZW50IHN1YmlzY2UgdW4gcmlkaW1lbnNpb25hbWVudG9cbiovXG5wcm90by5vblJlc2l6ZSA9IGZ1bmN0aW9uKHBhcmVudFdpZHRoLHBhcmVudEhlaWdodCl7fTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFBhbmVsO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgR1VJID0gcmVxdWlyZSgnZ3VpL2d1aScpO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgQ29tcG9uZW50c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnZ3VpL2NvbXBvbmVudHNyZWdpc3RyeScpO1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNyZWdpc3RyeScpO1xuXG5mdW5jdGlvbiBRdWVyeVJlc3VsdHNTZXJ2aWNlKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5fYWN0aW9ucyA9IHtcbiAgICAnem9vbXRvJzogUXVlcnlSZXN1bHRzU2VydmljZS56b29tVG9FbGVtZW50LFxuICAgICdnb3RvZ2VvbWV0cnknOiBRdWVyeVJlc3VsdHNTZXJ2aWNlLmdvVG9HZW9tZXRyeVxuICB9O1xuICBcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHRoaXMuY2xlYXJTdGF0ZSgpO1xuICB9O1xuICBcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICBsYXllcnM6IFtdLFxuICAgIHF1ZXJ5OiB7fSxcbiAgICBxdWVyeXRpdGxlOiBcIlwiLFxuICAgIGxvYWRpbmc6IHRydWVcbiAgfTtcbiAgXG4gIHRoaXMuc2V0dGVycyA9IHtcbiAgICBzZXRRdWVyeVJlc3BvbnNlOiBmdW5jdGlvbihxdWVyeVJlc3BvbnNlKSB7XG4gICAgICB0aGlzLnN0YXRlLmxheWVycyA9IFtdO1xuICAgICAgdGhpcy5zdGF0ZS5xdWVyeSA9IHF1ZXJ5UmVzcG9uc2UucXVlcnk7XG4gICAgICB0aGlzLl9kaWdlc3RGZWF0dXJlc0ZvckxheWVycyhxdWVyeVJlc3BvbnNlLmRhdGEpO1xuICAgICAgdGhpcy5zdGF0ZS5sb2FkaW5nID0gZmFsc2U7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5jbGVhclN0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgIGxheWVyczogW10sXG4gICAgICBxdWVyeToge30sXG4gICAgICBxdWVyeXRpdGxlOiBcIlwiLFxuICAgICAgbG9hZGluZzogdHJ1ZVxuICAgIH07XG4gIH07XG4gIFxuICB0aGlzLnNldFRpdGxlID0gZnVuY3Rpb24ocXVlcnl0aXRsZSkge1xuICAgIHRoaXMuc3RhdGUucXVlcnl0aXRsZSA9IHF1ZXJ5dGl0bGUgfHwgXCJcIjtcbiAgfTtcbiAgXG4gIHRoaXMucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNsZWFyU3RhdGUoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX2RpZ2VzdEZlYXR1cmVzRm9yTGF5ZXJzID0gZnVuY3Rpb24oZmVhdHVyZXNGb3JMYXllcnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXy5mb3JFYWNoKGZlYXR1cmVzRm9yTGF5ZXJzLGZ1bmN0aW9uKGZlYXR1cmVzRm9yTGF5ZXIpe1xuICAgICAgdmFyIGxheWVyID0gZmVhdHVyZXNGb3JMYXllci5sYXllcjtcbiAgICAgIGlmIChmZWF0dXJlc0ZvckxheWVyLmZlYXR1cmVzLmxlbmd0aCkge1xuICAgICAgICB2YXIgbGF5ZXJPYmogPSB7XG4gICAgICAgICAgdGl0bGU6IGxheWVyLnN0YXRlLnRpdGxlLFxuICAgICAgICAgIGlkOiBsYXllci5zdGF0ZS5pZCxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiBzZWxmLl9wYXJzZUF0dHJpYnV0ZXMobGF5ZXIuZ2V0QXR0cmlidXRlcygpLGZlYXR1cmVzRm9yTGF5ZXIuZmVhdHVyZXNbMF0uZ2V0UHJvcGVydGllcygpKSwgLy8gcHJlbmRvIHNvbG8gZ2xpIGF0dHJpYnV0aSBlZmZldHRpdmFtZW50ZSByaXRvcm5hdGkgZGFsIFdNUyAodXNhbmRvIGxhIHByaW1hIGZlYXR1cmUgZGlzcG9uaWJpbGUpXG4gICAgICAgICAgZmVhdHVyZXM6IFtdXG4gICAgICAgIH07XG4gICAgICAgIF8uZm9yRWFjaChmZWF0dXJlc0ZvckxheWVyLmZlYXR1cmVzLGZ1bmN0aW9uKGZlYXR1cmUpeyAgICAgIFxuICAgICAgICAgIHZhciBmZWF0dXJlT2JqID0ge1xuICAgICAgICAgICAgaWQ6IGZlYXR1cmUuZ2V0SWQoKSxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IGZlYXR1cmUuZ2V0UHJvcGVydGllcygpLFxuICAgICAgICAgICAgZ2VvbWV0cnk6IGZlYXR1cmUuZ2V0R2VvbWV0cnkoKVxuICAgICAgICAgIH1cbiAgICAgICAgICBsYXllck9iai5mZWF0dXJlcy5wdXNoKGZlYXR1cmVPYmopO1xuICAgICAgICB9KVxuICAgICAgICBzZWxmLnN0YXRlLmxheWVycy5wdXNoKGxheWVyT2JqKTtcbiAgICAgIH1cbiAgICB9KVxuICB9O1xuICBcbiAgdGhpcy5fcGFyc2VBdHRyaWJ1dGVzID0gZnVuY3Rpb24obGF5ZXJBdHRyaWJ1dGVzLGZlYXR1cmVBdHRyaWJ1dGVzKSB7XG4gICAgdmFyIGZlYXR1cmVBdHRyaWJ1dGVzTmFtZXMgPSBfLmtleXMoZmVhdHVyZUF0dHJpYnV0ZXMpO1xuICAgIGlmIChsYXllckF0dHJpYnV0ZXMubGVuZ3RoKSB7XG4gICAgICB2YXIgZmVhdHVyZUF0dHJpYnV0ZXNOYW1lcyA9IF8ua2V5cyhmZWF0dXJlQXR0cmlidXRlcyk7XG4gICAgICByZXR1cm4gXy5maWx0ZXIobGF5ZXJBdHRyaWJ1dGVzLGZ1bmN0aW9uKGF0dHJpYnV0ZSl7XG4gICAgICAgIHJldHVybiBmZWF0dXJlQXR0cmlidXRlc05hbWVzLmluZGV4T2YoYXR0cmlidXRlLm5hbWUpID4gLTE7XG4gICAgICB9KVxuICAgIH1cbiAgICAvLyBzZSBsYXllci5hdHRyaWJ1dGVzIMOoIHZ1b3RvIChlcy4gcXVhbmRvIGwnaW50ZXJyb2dhemlvbmUgw6ggdmVyc28gdW4gbGF5ZXIgZXN0ZXJubyBkaSBjdWkgbm9uIHNvIGkgY2FtcGkpIGNvc3RydWlzY28gbGEgc3RydXR0dXJhIFwiZml0dGl6aWFcIiB1c2FuZG8gbCdhdHRyaWJ1dG8gc2lhIG9jbWUgbmFtZSBjaGUgY29tZSBsYWJlbFxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIF8ubWFwKGZlYXR1cmVBdHRyaWJ1dGVzTmFtZXMsZnVuY3Rpb24oZmVhdHVyZUF0dHJpYnV0ZXNOYW1lKXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBuYW1lOiBmZWF0dXJlQXR0cmlidXRlc05hbWUsXG4gICAgICAgICAgbGFiZWw6IGZlYXR1cmVBdHRyaWJ1dGVzTmFtZVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgfVxuICBcbiAgdGhpcy50cmlnZ2VyID0gZnVuY3Rpb24oYWN0aW9uLGxheWVyLGZlYXR1cmUpIHtcbiAgICB2YXIgYWN0aW9uTWV0aG9kID0gdGhpcy5fYWN0aW9uc1thY3Rpb25dO1xuICAgIGlmIChhY3Rpb25NZXRob2QpIHtcbiAgICAgIGFjdGlvbk1ldGhvZChsYXllcixmZWF0dXJlKTtcbiAgICB9XG4gIH07XG4gIFxuICBiYXNlKHRoaXMpO1xufTtcblxuUXVlcnlSZXN1bHRzU2VydmljZS56b29tVG9FbGVtZW50ID0gZnVuY3Rpb24obGF5ZXIsZmVhdHVyZSkge1xuICBjb25zb2xlLmxvZyhmZWF0dXJlLmdlb21ldHJ5KTtcbn07XG5cblF1ZXJ5UmVzdWx0c1NlcnZpY2UuZ29Ub0dlb21ldHJ5ID0gZnVuY3Rpb24obGF5ZXIsZmVhdHVyZSkge1xuICBpZiAoZmVhdHVyZS5nZW9tZXRyeSkge1xuICAgIEdVSS5oaWRlUXVlcnlSZXN1bHRzKCk7XG4gICAgdmFyIG1hcFNlcnZpY2UgPSBDb21wb25lbnRzUmVnaXN0cnkuZ2V0Q29tcG9uZW50KCdtYXAnKS5nZXRTZXJ2aWNlKCk7XG4gICAgbWFwU2VydmljZS5oaWdobGlnaHRHZW9tZXRyeShmZWF0dXJlLmdlb21ldHJ5KTtcbiAgfVxufTtcblxuLy8gTWFrZSB0aGUgcHVibGljIHNlcnZpY2UgZW4gRXZlbnQgRW1pdHRlclxuaW5oZXJpdChRdWVyeVJlc3VsdHNTZXJ2aWNlLCBHM1dPYmplY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFF1ZXJ5UmVzdWx0c1NlcnZpY2U7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPCEtLTxkaXYgaWQ9XFxcInNlYXJjaC1yZXN1bHRzXFxcIj5cXG4gIDxkaXYgdi1mb3I9XFxcImxheWVyIGluIHN0YXRlLmxheWVyc1xcXCIgc3R5bGU9XFxcImN1cnNvcjpwb2ludGVyXFxcIj5cXG4gICAgPGg0Pnt7IGxheWVyLnRpdGxlIH19PC9oND5cXG4gICAgPHA+TnVtZXJvIGRpIGZlYXR1cmVzOiB7eyBsYXllci5mZWF0dXJlcy5sZW5ndGggfX08L3A+XFxuICA8L2Rpdj5cXG48L2Rpdj4tLT5cXG48ZGl2IGlkPVxcXCJzZWFyY2gtcmVzdWx0c1xcXCIgY2xhc3M9XFxcInF1ZXJ5cmVzdWx0cy1jb250YWluZXJcXFwiPlxcbiAgPGgzPlJpc3VsdGF0aSB7e3N0YXRlLnF1ZXJ5dGl0bGUgfCBsb3dlcmNhc2V9fTwvaDM+XFxuICA8ZGl2IHYtc2hvdz1cXFwic3RhdGUubG9hZGluZ1xcXCIgY2xhc3M9XFxcImJhci1sb2FkZXJcXFwiPjwvZGl2PlxcbiAgPHVsIHYtaWY9XFxcImhhc1Jlc3VsdHMoKVxcXCIgY2xhc3M9XFxcInF1ZXJ5cmVzdWx0c1xcXCIgaWQ9XFxcInF1ZXJ5cmVzdWx0c1xcXCI+XFxuICAgIDxsaSB2LWlmPVxcXCJsYXllckhhc0ZlYXR1cmVzKGxheWVyKVxcXCIgdi1mb3I9XFxcImxheWVyIGluIHN0YXRlLmxheWVyc1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiYm94IGJveC1wcmltYXJ5XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImJveC1oZWFkZXIgd2l0aC1ib3JkZXJcXFwiPlxcbiAgICAgICAgICA8aDMgY2xhc3M9XFxcImJveC10aXRsZVxcXCI+e3sgbGF5ZXIudGl0bGUgfX0gKHt7bGF5ZXIuZmVhdHVyZXMubGVuZ3RofX0pPC9oMz5cXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYm94LXRvb2xzIHB1bGwtcmlnaHRcXFwiPlxcbiAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tYm94LXRvb2xcXFwiIGRhdGEtd2lkZ2V0PVxcXCJjb2xsYXBzZVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLW1pbnVzXFxcIj48L2k+PC9idXR0b24+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJib3gtYm9keVxcXCI+XFxuICAgICAgICAgIDx0YWJsZSBjbGFzcz1cXFwidGFibGUgdGFibGUtc3RyaXBlZFxcXCI+XFxuICAgICAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgICA8dGggdi1mb3I9XFxcImF0dHJpYnV0ZSBpbiBhdHRyaWJ1dGVzU3Vic2V0KGxheWVyLmF0dHJpYnV0ZXMpXFxcIj57e2F0dHJpYnV0ZS5sYWJlbH19PC90aD5cXG4gICAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICAgICAgPC90aGVhZD5cXG4gICAgICAgICAgICA8dGJvZHk+XFxuICAgICAgICAgICAgICA8dGVtcGxhdGUgdi1mb3I9XFxcImZlYXR1cmUgaW4gbGF5ZXIuZmVhdHVyZXNcXFwiPlxcbiAgICAgICAgICAgICAgICA8dHIgY2xhc3M9XFxcImF0dHJpYnV0ZXMtcHJldmlld1xcXCIgQGNsaWNrPVxcXCJ0b2dnbGVGZWF0dXJlQm94KGxheWVyLGZlYXR1cmUpXFxcIj5cXG4gICAgICAgICAgICAgICAgICA8dGQgdi1mb3I9XFxcImF0dHJpYnV0ZSBpbiBhdHRyaWJ1dGVzU3Vic2V0KGxheWVyLmF0dHJpYnV0ZXMpXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPnt7ZmVhdHVyZS5hdHRyaWJ1dGVzW2F0dHJpYnV0ZS5uYW1lXX19PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPCEtLTxzcGFuIHYtaWY9XFxcImlzU2ltcGxlKGxheWVyLGZlYXR1cmUsYXR0cmlidXRlKVxcXCI+e3tmZWF0dXJlLmF0dHJpYnV0ZXNbYXR0cmlidXRlLm5hbWVdfX08L3NwYW4+LS0+XFxuICAgICAgICAgICAgICAgICAgICA8IS0tPHNwYW4gdi1pZj1cXFwiaXNSb3V0ZShsYXllcixmZWF0dXJlLGF0dHJpYnV0ZSlcXFwiIGNsYXNzPVxcXCJsaW5rIGRhc2hib2FyZGxpbmtcXFwiIEBjbGljaz1cXFwiZ290byhsYXllcixmZWF0dXJlLmF0dHJpYnV0ZXNbYXR0cmlidXRlLm5hbWVdKVxcXCI+e3sgZmVhdHVyZS5hdHRyaWJ1dGVzW2F0dHJpYnV0ZS5uYW1lXSB9fTwvc3Bhbj4tLT5cXG4gICAgICAgICAgICAgICAgICAgIDwhLS08aW1nIHYtaWY9XFxcImlzUGhvdG8obGF5ZXIsZmVhdHVyZSxhdHRyaWJ1dGUpXFxcIiBkYXRhLXVybD1cXFwie3tnZXRQaG90b1VybChmZWF0dXJlLmF0dHJpYnV0ZXNbYXR0cmlidXRlLm5hbWVdKX19XFxcIiBzdHlsZT1cXFwibWF4LXdpZHRoOjUwcHhcXFwiIDpzcmM9XFxcImdldFBob3RvVXJsKGZlYXR1cmUuYXR0cmlidXRlc1thdHRyaWJ1dGUubmFtZV0sdGh1bWIpXFxcIiAvPi0tPlxcbiAgICAgICAgICAgICAgICAgICAgPCEtLTxhIHYtaWY9XFxcImlzTGluayhsYXllcixmZWF0dXJlLGF0dHJpYnV0ZSlcXFwiIGhyZWY9XFxcImxheWVyLmZlYXR1cmUuYXR0cmlidXRlc1thdHRyaWJ1dGUubmFtZV1cXFwiIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLWxpbmtcXFwiPjwvYT4tLT5cXG4gICAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgICAgIDx0ZD48c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1vcHRpb24taG9yaXpvbnRhbCBsaW5rIG1vcmVsaW5rXFxcIj48L3NwYW4+PC90ZD5cXG4gICAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICAgICAgICA8dHIgdi1zaG93PVxcXCJjb2xsYXBzZUZlYXR1cmVCb3gobGF5ZXIsZmVhdHVyZSlcXFwiIGNsYXNzPVxcXCJxdWVyeXJlc3VsdHMtZmVhdHVyZWJveFxcXCI+XFxuICAgICAgICAgICAgICAgIDx0ZCA6Y29sc3Bhbj1cXFwiYXR0cmlidXRlc1N1YnNldExlbmd0aChsYXllci5hdHRyaWJ1dGVzKSsxXFxcIj5cXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhY3Rpb24tYnV0dG9ucy1jb250YWluZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiB2LWlmPVxcXCJnZW9tZXRyeUF2YWlsYWJsZShmZWF0dXJlKVxcXCIgY2xhc3M9XFxcImFjdGlvbi1idXR0b24gaGludC0tdG9wLXJpZ2h0XFxcIiBhcmlhLWxhYmVsPVxcXCJWaXN1YWxpenphIHN1bGxhIG1hcHBhXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImFjdGlvbi1idXR0b24taWNvbiBnbHlwaGljb24gZ2x5cGhpY29uLW1hcC1tYXJrZXJcXFwiIEBjbGljaz1cXFwidHJpZ2dlcignZ290b2dlb21ldHJ5JyxsYXllcixmZWF0dXJlKVxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cXFwiYWN0aW9uLWJ1dHRvbiBoaW50LS10b3AtcmlnaHRcXFwiIGFyaWEtbGFiZWw9XFxcIkxpbmsgYWxsJ2VsZW1lbnRvXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImFjdGlvbi1idXR0b24taWNvbiBnbHlwaGljb24gZ2x5cGhpY29uLWxpbmtcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2Pi0tPlxcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgIDx0YWJsZT5cXG4gICAgICAgICAgICAgICAgICAgIDx0ciB2LWZvcj1cXFwiYXR0cmlidXRlIGluIGxheWVyLmF0dHJpYnV0ZXNcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XFxcImF0dHItbGFiZWxcXFwiPnt7YXR0cmlidXRlLmxhYmVsfX08L3RkPlxcbiAgICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XFxcImF0dHItdmFsdWVcXFwiPnt7ZmVhdHVyZS5hdHRyaWJ1dGVzW2F0dHJpYnV0ZS5uYW1lXX19PC90ZD5cXG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICAgICAgICAgICAgPC90YWJsZT5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICAgICAgICA8L3RlbXBsYXRlPlxcbiAgICAgICAgICAgIDwvdGJvZHk+XFxuICAgICAgICAgIDwvdGFibGU+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9saT5cXG4gIDwvdWw+XFxuICA8c3BhbiB2LWlmPVxcXCIhaGFzUmVzdWx0cygpXFxcIj5OZXNzdW4gcmlzdWx0YXRvPC9zcGFuPlxcbjwvZGl2PlxcblxcblwiO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgbWVyZ2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykubWVyZ2U7XG52YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnZ3VpL3Z1ZS9jb21wb25lbnQnKTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xudmFyIFF1ZXJ5UmVzdWx0c1NlcnZpY2UgPSByZXF1aXJlKCdndWkvcXVlcnlyZXN1bHRzL3F1ZXJ5cmVzdWx0c3NlcnZpY2UnKTtcblxudmFyIHZ1ZUNvbXBvbmVudE9wdGlvbnMgPSB7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL3F1ZXJ5cmVzdWx0cy5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0ZTogdGhpcy4kb3B0aW9ucy5xdWVyeVJlc3VsdHNTZXJ2aWNlLnN0YXRlLFxuICAgICAgbGF5ZXJzRmVhdHVyZXNCb3hlczoge30sXG4gICAgfVxuICB9LFxuICByZXBsYWNlOiBmYWxzZSxcbiAgbWV0aG9kczoge1xuICAgIGxheWVySGFzRmVhdHVyZXM6IGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgICBpZiAobGF5ZXIuZmVhdHVyZXMpIHtcbiAgICAgICAgcmV0dXJuIGxheWVyLmZlYXR1cmVzLmxlbmd0aCA+IDA7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbiAgICBoYXNSZXN1bHRzOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnN0YXRlLmxheWVycy5sZW5ndGg7XG4gICAgfSxcbiAgICBnZW9tZXRyeUF2YWlsYWJsZTogZnVuY3Rpb24oZmVhdHVyZSkge1xuICAgICAgcmV0dXJuIGZlYXR1cmUuZ2VvbWV0cnkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSxcbiAgICBhdHRyaWJ1dGVzU3Vic2V0OiBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG4gICAgICB2YXIgZW5kID0gTWF0aC5taW4oMyxhdHRyaWJ1dGVzLmxlbmd0aCk7XG4gICAgICByZXR1cm4gYXR0cmlidXRlcy5zbGljZSgwLGVuZCk7XG4gICAgfSxcbiAgICBhdHRyaWJ1dGVzU3Vic2V0TGVuZ3RoOiBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG4gICAgICByZXR1cm4gdGhpcy5hdHRyaWJ1dGVzU3Vic2V0KGF0dHJpYnV0ZXMpLmxlbmd0aDtcbiAgICB9LFxuICAgIGNvbGxhcHNlRmVhdHVyZUJveDogZnVuY3Rpb24obGF5ZXIsZmVhdHVyZSkge1xuICAgICAgdmFyIGNvbGxhcHNlZCA9IHRydWU7XG4gICAgICB2YXIgYm94aWQgPSBsYXllci5pZCsnXycrZmVhdHVyZS5pZDtcbiAgICAgIGlmICh0aGlzLmxheWVyc0ZlYXR1cmVzQm94ZXNbYm94aWRdKSB7XG4gICAgICAgIGNvbGxhcHNlZCA9IHRoaXMubGF5ZXJzRmVhdHVyZXNCb3hlc1tib3hpZF0uY29sbGFwc2VkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNvbGxhcHNlZDtcbiAgICB9LFxuICAgIHRvZ2dsZUZlYXR1cmVCb3g6IGZ1bmN0aW9uKGxheWVyLGZlYXR1cmUpIHtcbiAgICAgIHZhciBib3hpZCA9IGxheWVyLmlkKydfJytmZWF0dXJlLmlkO1xuICAgICAgdGhpcy5sYXllcnNGZWF0dXJlc0JveGVzW2JveGlkXS5jb2xsYXBzZWQgPSAhdGhpcy5sYXllcnNGZWF0dXJlc0JveGVzW2JveGlkXS5jb2xsYXBzZWQ7XG4gICAgfSxcbiAgICB0cmlnZ2VyOiBmdW5jdGlvbihhY3Rpb24sbGF5ZXIsZmVhdHVyZSkge1xuICAgICAgdGhpcy4kb3B0aW9ucy5xdWVyeVJlc3VsdHNTZXJ2aWNlLnRyaWdnZXIoYWN0aW9uLGxheWVyLGZlYXR1cmUpO1xuICAgIH1cbiAgfVxufTtcblxuLy8gc2UgbG8gdm9nbGlvIGlzdGFuemlhcmUgbWFudWFsbWVudGVcbnZhciBJbnRlcm5hbENvbXBvbmVudCA9IFZ1ZS5leHRlbmQodnVlQ29tcG9uZW50T3B0aW9ucyk7XG5cbmZ1bmN0aW9uIFF1ZXJ5UmVzdWx0c0NvbXBvbmVudChvcHRpb25zKXtcbiAgYmFzZSh0aGlzLG9wdGlvbnMpO1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuaWQgPSBcInF1ZXJ5cmVzdWx0c1wiO1xuICB0aGlzLnRpdGxlID0gXCJRdWVyeSBSZXN1bHRzXCI7XG4gIHRoaXMuX3NlcnZpY2UgPSBuZXcgUXVlcnlSZXN1bHRzU2VydmljZSgpO1xuICAvL3VzYXRvIHF1YW5kbyDDqCBzdGF0byBkaXN0cnV0dG9cbiAgdGhpcy5zZXRJbnRlcm5hbENvbXBvbmVudCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaW50ZXJuYWxDb21wb25lbnQgPSBuZXcgSW50ZXJuYWxDb21wb25lbnQoe1xuICAgICAgcXVlcnlSZXN1bHRzU2VydmljZTogdGhpcy5fc2VydmljZVxuICAgIH0pO1xuICAgIHRoaXMuY3JlYXRlTGF5ZXJzRmVhdHVyZXNCb3hlcygpO1xuICAgIHRoaXMuaW50ZXJuYWxDb21wb25lbnQucXVlcnl0aXRsZSA9IHRoaXMuX3NlcnZpY2Uuc3RhdGUucXVlcnl0aXRsZTtcbiAgfVxuICBcbiAgdGhpcy5fc2VydmljZS5vbmFmdGVyKCdzZXRRdWVyeVJlc3BvbnNlJyxmdW5jdGlvbigpe1xuICAgIHNlbGYuY3JlYXRlTGF5ZXJzRmVhdHVyZXNCb3hlcygpO1xuICB9KVxuICBtZXJnZSh0aGlzLCBvcHRpb25zKTtcbiAgXG4gIHRoaXMuY3JlYXRlTGF5ZXJzRmVhdHVyZXNCb3hlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBsYXllcnNGZWF0dXJlc0JveGVzID0ge31cbiAgICB2YXIgbGF5ZXJzID0gdGhpcy5fc2VydmljZS5zdGF0ZS5sYXllcnM7XG4gICAgXy5mb3JFYWNoKGxheWVycyxmdW5jdGlvbihsYXllcil7XG4gICAgICBfLmZvckVhY2gobGF5ZXIuZmVhdHVyZXMsZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICAgIHZhciBib3hpZCA9IGxheWVyLmlkKydfJytmZWF0dXJlLmlkXG4gICAgICAgIGxheWVyc0ZlYXR1cmVzQm94ZXNbYm94aWRdID0ge1xuICAgICAgICAgIGNvbGxhcHNlZDogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KVxuICAgIHRoaXMuaW50ZXJuYWxDb21wb25lbnQubGF5ZXJzRmVhdHVyZXNCb3hlcyA9IGxheWVyc0ZlYXR1cmVzQm94ZXM7XG4gIH07XG59O1xuXG5pbmhlcml0KFF1ZXJ5UmVzdWx0c0NvbXBvbmVudCwgQ29tcG9uZW50KTtcblxubW9kdWxlLmV4cG9ydHMgPSBRdWVyeVJlc3VsdHNDb21wb25lbnQ7XG5cbi8qXG5cbnZhciByZXNvbHZlZFZhbHVlID0gcmVxdWlyZSgnZzN3L2NvcmUvdXRpbHMnKS5yZXNvbHZlZFZhbHVlO1xudmFyIGluaGVyaXQgPSByZXF1aXJlKCdnM3cvY29yZS91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2czdy9jb3JlL3V0aWxzJykuYmFzZTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdnM3cvY29yZS9nM3dvYmplY3QnKTtcbnZhciBHVUkgPSByZXF1aXJlKCdnM3cvZ3VpL2d1aScpO1xudmFyIEFwaVNlcnZpY2UgPSByZXF1aXJlKCdnM3cvY29yZS9hcGlzZXJ2aWNlJyk7XG52YXIgUHJvamVjdFNlcnZpY2UgPSByZXF1aXJlKCdnM3cvY29yZS9wcm9qZWN0c2VydmljZScpLlByb2plY3RTZXJ2aWNlO1xudmFyIE1hcFNlcnZpY2UgPSByZXF1aXJlKCdnM3cvY29yZS9tYXBzZXJ2aWNlJyk7XG52YXIgUm91dGVyU2VydmljZSA9IHJlcXVpcmUoJ2czdy9jb3JlL3JvdXRlcicpO1xuXG52YXIgVHBsU2VydmljZSA9IHJlcXVpcmUoJy4vdHBsc2VydmljZScpO1xuXG52YXIgRmllbGRzID0ge307XG5GaWVsZHMuU1RSSU5HID0gJ3N0cmluZyc7XG5GaWVsZHMuSU5URUdFUiA9ICdpbnRlZ2VyJztcbkZpZWxkcy5GTE9BVCA9ICdmbG9hdCc7XG5cblxuRmllbGRzLnNpbXBsZUZpZWxkVHlwZXMgPSBbRmllbGRzLlNUUklORyxGaWVsZHMuSU5URUdFUixGaWVsZHMuRkxPQVRdO1xuRmllbGRzLkxJTksgPSAnbGluayc7XG5GaWVsZHMuUEhPVE8gPSAncGhvdG8nO1xuRmllbGRzLlBPSU5UTElOSyA9ICdwb2ludGxpbmsnO1xuRmllbGRzLlJPVVRFID0gJ3JvdXRlJztcblxudmFyIEZpZWxkc1J1bGVzID0ge1xuICB2YXJpYW50aToge1xuICAgIGlkOiBGaWVsZHMuUk9VVEVcbiAgfSxcbiAgcGFsaW5lOiB7XG4gICAgaWQ6IEZpZWxkcy5ST1VURVxuICB9XG59O1xuXG5mdW5jdGlvbiBnZXRGaWVsZFR5cGUobGF5ZXIsZmVhdHVyZSxhdHRyaWJ1dGUpIHtcbiAgdmFyIGZpZWxkVHlwZUZyb21SdWxlcyA9IF8uZ2V0KEZpZWxkc1J1bGVzLGxheWVyLmlkKycuJythdHRyaWJ1dGUubmFtZSk7XG4gIGlmIChmaWVsZFR5cGVGcm9tUnVsZXMpIHtcbiAgICByZXR1cm4gZmllbGRUeXBlRnJvbVJ1bGVzO1xuICB9XG4gIFxuICB2YXIgVVJMUGF0dGVybiA9IC9eKGh0dHBzPzpcXC9cXC9bXlxcc10rKS9nO1xuICB2YXIgUGhvdG9QYXR0ZXJuID0gL1teXFxzXSsuKHBuZ3xqcGd8anBlZykkL2c7XG4gIHZhciB2YWx1ZSA9IGZlYXR1cmUuYXR0cmlidXRlc1thdHRyaWJ1dGUubmFtZV0udG9TdHJpbmcoKTtcbiAgXG4gIHZhciBleHRlbnNpb24gPSB2YWx1ZS5zcGxpdCgnLicpLnBvcCgpO1xuICBpZiAodmFsdWUubWF0Y2goVVJMUGF0dGVybikpIHtcbiAgICByZXR1cm4gRmllbGRzLkxJTks7XG4gIH1cbiAgXG4gIGlmICh2YWx1ZS5tYXRjaChQaG90b1BhdHRlcm4pKSB7XG4gICAgcmV0dXJuIEZpZWxkcy5QSE9UTztcbiAgfVxuICBcbiAgaWYgKEZpZWxkcy5zaW1wbGVGaWVsZFR5cGVzLmluZGV4T2YoYXR0cmlidXRlLnR5cGUpID4gLTEpIHtcbiAgICByZXR1cm4gYXR0cmlidXRlLnR5cGU7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGlzU2ltcGxlKGxheWVyLGZlYXR1cmUsYXR0cmlidXRlKSB7XG4gIHZhciBmaWVsZFR5cGUgPSBnZXRGaWVsZFR5cGUobGF5ZXIsZmVhdHVyZSxhdHRyaWJ1dGUpO1xuICByZXR1cm4gRmllbGRzLnNpbXBsZUZpZWxkVHlwZXMuaW5kZXhPZihmaWVsZFR5cGUpID4gLTE7XG59O1xuXG5mdW5jdGlvbiBpc0xpbmsobGF5ZXIsZmVhdHVyZSxhdHRyaWJ1dGUpIHtcbiAgdmFyIGZpZWxkVHlwZSA9IGdldEZpZWxkVHlwZShsYXllcixmZWF0dXJlLGF0dHJpYnV0ZSk7XG4gIHJldHVybiBGaWVsZHMuTElOSyA9PSBmaWVsZFR5cGU7XG59O1xuXG5mdW5jdGlvbiBpc1Bob3RvKGxheWVyLGZlYXR1cmUsYXR0cmlidXRlKSB7XG4gIHZhciBmaWVsZFR5cGUgPSBnZXRGaWVsZFR5cGUobGF5ZXIsZmVhdHVyZSxhdHRyaWJ1dGUpO1xuICByZXR1cm4gRmllbGRzLlBIT1RPID09IGZpZWxkVHlwZTtcbn07XG5cbmZ1bmN0aW9uIGlzUm91dGUobGF5ZXIsZmVhdHVyZSxhdHRyaWJ1dGUpIHtcbiAgdmFyIGZpZWxkVHlwZSA9IGdldEZpZWxkVHlwZShsYXllcixmZWF0dXJlLGF0dHJpYnV0ZSk7XG4gIHJldHVybiBGaWVsZHMuUk9VVEUgPT0gZmllbGRUeXBlO1xufTtcblxudmFyIFRwbFF1ZXJ5UmVzdWx0c0NvbXBvbmVudCA9IFZ1ZS5leHRlbmQoe1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi90cGxxdWVyeXJlc3VsdHMuaHRtbCcpLFxuICBkYXRhOiBmdW5jdGlvbigpe1xuICAgIHJldHVybiB7XG4gICAgICBsb3R0bzogbnVsbCxcbiAgICAgIGRheTogbnVsbCxcbiAgICAgIHRlcnJpdG9yaWFsX2RldGFpbHM6IHt9LFxuICAgICAgbGF5ZXJzOiBbXSxcbiAgICAgIGJhc2VQaG90b1VybDogJydcbiAgICB9XG4gIH0sXG4gIHJlYWR5OiBmdW5jdGlvbigpe1xuICAgIHRyeSB7XG4gICAgICB2YXIgdmlld2VyID0gbmV3IFZpZXdlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndHBsLW1hcHF1ZXJ5cmVzdWx0cycpLCB7XG4gICAgICAgIHVybDogJ2RhdGEtdXJsJyxcbiAgICAgICAgekluZGV4OiAxMDAwMFxuICAgICAgfSk7XG4gICAgfVxuICAgIGNhdGNoKGVycil7XG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgbGF5ZXJIYXNGZWF0dXJlczogZnVuY3Rpb24obGF5ZXIpIHtcbiAgICAgIGlmIChsYXllci5mZWF0dXJlcykge1xuICAgICAgICByZXR1cm4gbGF5ZXIuZmVhdHVyZXMubGVuZ3RoID4gMDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuICAgIGNhbGNLbTogZnVuY3Rpb24obWV0ZXJzKSB7XG4gICAgICByZXR1cm4gTWF0aC5yb3VuZDEwKChtZXRlcnMvMTAwMCksLTIpO1xuICAgIH0sXG4gICAgc2hvd0ZlYXR1cmU6IGZ1bmN0aW9uKGZlYXR1cmUpIHtcbiAgICAgIEdVSS5oaWRlTGlzdGluZygpO1xuICAgICAgTWFwU2VydmljZS5oaWdobGlnaHRHZW9tZXRyeShmZWF0dXJlLmdlb21ldHJ5LHt6b29tOiB0cnVlfSk7XG4gICAgfSxcbiAgICBoYXNHZW9tZXRyeTogZnVuY3Rpb24oZmVhdHVyZSkge1xuICAgICAgcmV0dXJuIF8uaXNOaWwoZmVhdHVyZS5nZXRHZW9tZXRyeSk7XG4gICAgfSxcbiAgICBpc1NpbXBsZTogZnVuY3Rpb24obGF5ZXIsZmVhdHVyZSxhdHRyaWJ1dGUpIHtcbiAgICAgIHJldHVybiBpc1NpbXBsZShsYXllcixmZWF0dXJlLGF0dHJpYnV0ZSk7XG4gICAgfSxcbiAgICBpc1Bob3RvOiBmdW5jdGlvbihsYXllcixmZWF0dXJlLGF0dHJpYnV0ZSkge1xuICAgICAgcmV0dXJuIGlzUGhvdG8obGF5ZXIsZmVhdHVyZSxhdHRyaWJ1dGUpO1xuICAgIH0sXG4gICAgaXNMaW5rOiBmdW5jdGlvbihsYXllcixmZWF0dXJlLGF0dHJpYnV0ZSkge1xuICAgICAgcmV0dXJuIGlzTGluayhsYXllcixmZWF0dXJlLGF0dHJpYnV0ZSk7XG4gICAgfSxcbiAgICBpc1JvdXRlOiBmdW5jdGlvbihsYXllcixmZWF0dXJlLGF0dHJpYnV0ZSkge1xuICAgICAgcmV0dXJuIGlzUm91dGUobGF5ZXIsZmVhdHVyZSxhdHRyaWJ1dGUpO1xuICAgIH0sXG4gICAgZ2V0UGhvdG9Vcmw6IGZ1bmN0aW9uKHBhdGgsdGh1bWIpIHtcbiAgICAgIHZhciBwYXRoc3BsaXQgPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgICB2YXIgcGhvdG9OYW1lID0gcGF0aHNwbGl0W3BhdGhzcGxpdC5sZW5ndGggLSAxXTtcbiAgICAgIHZhciBwaG90b1NwbGl0ID0gcGhvdG9OYW1lLnNwbGl0KCdfJykuc2xpY2UoMSk7XG4gICAgICB2YXIgcHJlZml4ID0gJ2ZvdG8nO1xuICAgICAgaWYgKHRodW1iKSB7XG4gICAgICAgIHByZWZpeCA9ICd0aHVtYic7XG4gICAgICB9XG4gICAgICB2YXIgdGh1bWJOYW1lID0gcHJlZml4K1wiX1wiK3Bob3RvU3BsaXQuam9pbignXycpO1xuICAgICAgcmV0dXJuIHRoaXMuYmFzZVBob3RvVXJsICsgJy8nICsgdGh1bWJOYW1lO1xuICAgIH0sXG4gICAgZ2V0TGFiZWw6IGZ1bmN0aW9uKGxheWVyTmFtZSl7XG4gICAgICByZXR1cm4gdGhpcy5sYWJlbHNfdGVycml0b3Jpb1tsYXllck5hbWVdLmRlbm9taW5hemlvbmU7XG4gICAgfSxcbiAgICBnZXRPckJsYW5rOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICB2YXIgdmFsdWUgPSBfLmdldCh0aGlzLHBhdGgpO1xuICAgICAgcmV0dXJuICh2YWx1ZSAmJiB2YWx1ZSAhPSAnJykgPyB2YWx1ZSA6ICctJztcbiAgICB9LFxuICAgIGdvdG86IGZ1bmN0aW9uKGxheWVyLHZhbHVlKSB7XG4gICAgICBzd2l0Y2ggKGxheWVyLmlkKSB7XG4gICAgICAgIGNhc2UgJ3ZhcmlhbnRpJzpcbiAgICAgICAgICBHVUkuaGlkZUxpc3RpbmcoKTtcbiAgICAgICAgICB2YXIgbG90dG8gPSB0aGlzLmxvdHRvO1xuICAgICAgICAgIHZhciBkYXkgPSB0aGlzLmRheTtcbiAgICAgICAgICBSb3V0ZXJTZXJ2aWNlLmdvdG8oJ2Rhc2hib2FyZC9jb3JzZXZhcmlhbnRlLycrdmFsdWUrJz9kYXk9Jyt0aGlzLmRheSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3BhbGluZSc6XG4gICAgICAgICAgR1VJLmhpZGVMaXN0aW5nKCk7XG4gICAgICAgICAgdmFyIGRheSA9IHRoaXMuZGF5O1xuICAgICAgICAgIFJvdXRlclNlcnZpY2UuZ290bygnZGFzaGJvYXJkL2Zlcm1hdGEvJyt2YWx1ZSsnP2RheT0nK2RheSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfSxcbiAgICBzaG93VmFyaWFudGU6IGZ1bmN0aW9uKGlkX3ZhcmlhbnRlKSB7XG4gICAgICBHVUkuaGlkZUxpc3RpbmcoKTtcbiAgICAgIHZhciBsb3R0byA9IHRoaXMubG90dG87XG4gICAgICB2YXIgZGF5ID0gdGhpcy5kYXk7XG4gICAgICBSb3V0ZXJTZXJ2aWNlLmdvdG8oJ2Rhc2hib2FyZC92YXJpYW50aS8nK3RoaXMubG90dG8rJy8jIyMvJytpZF92YXJpYW50ZSsnP2RheT0nK3RoaXMuZGF5KTtcbiAgICB9LFxuICAgIHNob3dGZXJtYXRhOiBmdW5jdGlvbihpZF9mZXJtYXRhKSB7XG4gICAgICBHVUkuaGlkZUxpc3RpbmcoKTtcbiAgICAgIHZhciBkYXkgPSB0aGlzLmRheTtcbiAgICAgIFJvdXRlclNlcnZpY2UuZ290bygnZGFzaGJvYXJkL2Zlcm1hdGEvJytpZF9mZXJtYXRhKyc/ZGF5PScrZGF5KTtcbiAgICB9XG4gIH1cbn0pXG5cbnZhciBUcGxRdWVyeVJlc3VsdHNQYW5lbCA9IGZ1bmN0aW9uKGNvbnRleHQpe1xuICB0aGlzLnBhbmVsQ29tcG9uZW50ID0gbnVsbDtcbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgXG4gIHRoaXMub25TaG93ID0gZnVuY3Rpb24oY29udGFpbmVyKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHBhbmVsID0gdGhpcy5wYW5lbENvbXBvbmVudCA9IG5ldyBUcGxRdWVyeVJlc3VsdHNDb21wb25lbnQoKTtcbiAgICBwYW5lbC5sYXllcnMgPSBbXTtcbiAgICBwYW5lbC5sYWJlbHNfdGVycml0b3JpbyA9IG51bGw7XG4gICAgXG4gICAgdmFyIGxheWVyRGF0YSA9IF8ua2V5QnkoY29udGV4dC5sYXllcnNSZXN1bHRzLCdpZCcpO1xuICAgIFxuICAgIHZhciB0ZXJyaXRvcmlhbF9kZXRhaWxzID0ge307XG4gICAgdmFyIGxheWVyc19sYWJlbHNfdGVycml0b3JpbyA9IFsncHJvdmluY2UnLCdjb211bmknLCdiYWNpbmknLCdsb2NhbGl0YSddO1xuICAgIFxuICAgIF8uZm9yRWFjaChsYXllcnNfbGFiZWxzX3RlcnJpdG9yaW8sZnVuY3Rpb24obGF5ZXJOYW1lKXtcbiAgICAgIGlmIChsYXllckRhdGFbbGF5ZXJOYW1lXS5mZWF0dXJlcyAmJiBsYXllckRhdGFbbGF5ZXJOYW1lXS5mZWF0dXJlcy5sZW5ndGgpIHtcbiAgICAgICAgdGVycml0b3JpYWxfZGV0YWlsc1tsYXllck5hbWVdID0gIGxheWVyRGF0YVtsYXllck5hbWVdLmZlYXR1cmVzWzBdLmF0dHJpYnV0ZXNcbiAgICAgIH1cbiAgICB9KTtcbiAgICBcbiAgICBwYW5lbC5sb3R0byA9IGNvbnRleHQubG90dG9JZDtcbiAgICBwYW5lbC5kYXkgPSBjb250ZXh0LmRheTtcbiAgICBwYW5lbC50ZXJyaXRvcmlhbF9kZXRhaWxzID0gdGVycml0b3JpYWxfZGV0YWlsczsgICBcbiAgICBcbiAgICB2YXIgbGF5ZXJzRnJvbUFwaSA9IFsndmFyaWFudGknXTtcbiAgICBcbiAgICB0aGlzLnF1ZXJ5VmFyaWFudGkodGhpcy5jb250ZXh0KVxuICAgIC50aGVuKGZ1bmN0aW9uKGZlYXR1cmVzKXtcbiAgICAgIHBhbmVsLmxheWVycy5wdXNoKHtcbiAgICAgICAgdGl0bGU6ICdWYXJpYW50aScsXG4gICAgICAgIGlkOiAndmFyaWFudGknLFxuICAgICAgICBhdHRyaWJ1dGVzOiBQcm9qZWN0U2VydmljZS5nZXRMYXllckJ5TmFtZSgndmFyaWFudGknKS5hdHRyaWJ1dGVzLFxuICAgICAgICBmZWF0dXJlczogZmVhdHVyZXNcbiAgICAgIH0pXG4gICAgfSk7XG4gICAgXG4gICAgdmFyIGV4Y2x1ZGVkTGF5ZXJzID0gXy5jb25jYXQobGF5ZXJzX2xhYmVsc190ZXJyaXRvcmlvLGxheWVyc0Zyb21BcGkpO1xuICAgIHZhciBxdWVyeWFibGVMYXllcnMgPSBfLmZpbHRlcih0aGlzLmNvbnRleHQucXVlcnlhYmxlTGF5ZXJzLGZ1bmN0aW9uKGxheWVyKXtcbiAgICAgIHJldHVybiBleGNsdWRlZExheWVycy5pbmRleE9mKGxheWVyLm5hbWUpID09IC0xO1xuICAgIH0pO1xuICAgIFxuICAgIF8uZm9yRWFjaChxdWVyeWFibGVMYXllcnMsZnVuY3Rpb24ocXVlcnlhYmxlTGF5ZXIpe1xuICAgICAgICB2YXIgZmVhdHVyZXMgPSBzZWxmLnByb2Nlc3NSZXN1bHRzKHF1ZXJ5YWJsZUxheWVyLm5hbWUsc2VsZi5jb250ZXh0KVxuICAgICAgICBwYW5lbC5sYXllcnMucHVzaCh7XG4gICAgICAgICAgdGl0bGU6IHF1ZXJ5YWJsZUxheWVyLnRpdGxlLFxuICAgICAgICAgIGlkOiBxdWVyeWFibGVMYXllci5uYW1lLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHF1ZXJ5YWJsZUxheWVyLmF0dHJpYnV0ZXMsXG4gICAgICAgICAgZmVhdHVyZXM6IGZlYXR1cmVzXG4gICAgICAgIH0pO1xuICAgIH0pXG5cbiAgICBwYW5lbC5iYXNlUGhvdG9VcmwgPSBjb250ZXh0LnVybHMuYmFzZVBob3RvVXJsO1xuICAgIFxuICAgIHBhbmVsLiRtb3VudCgpLiRhcHBlbmRUbyhjb250YWluZXIpO1xuICAgIFxuICAgIHJldHVybiByZXNvbHZlZFZhbHVlKHRydWUpO1xuICB9O1xuICBcbiAgdGhpcy5vbkNsb3NlID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLnBhbmVsQ29tcG9uZW50LiRkZXN0cm95KHRydWUpO1xuICAgIHRoaXMucGFuZWxDb21wb25lbnQgPSBudWxsO1xuICAgIHJldHVybiByZXNvbHZlZFZhbHVlKHRydWUpO1xuICB9O1xuICBcbiAgdGhpcy5wcm9jZXNzUmVzdWx0cyA9IGZ1bmN0aW9uKGxheWVyTmFtZSxjb250ZXh0KSB7XG4gICAgdmFyIGxheWVyRGF0YSA9IF8ua2V5QnkoY29udGV4dC5sYXllcnNSZXN1bHRzLCdpZCcpO1xuICAgIHZhciBmZWF0dXJlcyA9IFtdO1xuICAgIGlmIChsYXllckRhdGFbbGF5ZXJOYW1lXSkge1xuICAgICAgZmVhdHVyZXMgPSBsYXllckRhdGFbbGF5ZXJOYW1lXS5mZWF0dXJlcztcbiAgICB9XG4gICAgcmV0dXJuIGZlYXR1cmVzO1xuICB9O1xuICBcbiAgdGhpcy5xdWVyeVZhcmlhbnRpID0gZnVuY3Rpb24oY29udGV4dCl7XG4gICAgcmV0dXJuIEFwaVNlcnZpY2UuZ2V0KCdWQVJJQU5USVFVRVJZTUFQJyx7XG4gICAgICBwYXJhbXM6IHtcbiAgICAgICAgZGF5OiBjb250ZXh0LmRheSxcbiAgICAgICAgbG90dG86IGNvbnRleHQubG90dG9JZCxcbiAgICAgICAgY29vcmRzOiBjb250ZXh0LmNvb3JkaW5hdGVzLmpvaW4oJywnKSxcbiAgICAgICAgcmVzOiBjb250ZXh0LnJlc29sdXRpb25cbiAgICAgIH1cbiAgICB9KVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgIHJldHVybiBfLm1hcChyZXNwb25zZSxmdW5jdGlvbihyb3dEYXRhKXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBhdHRyaWJ1dGVzOiByb3dEYXRhXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cbn1cbmluaGVyaXQoVHBsUXVlcnlSZXN1bHRzUGFuZWwsRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBUcGxRdWVyeVJlc3VsdHNQYW5lbDtcblxuKi9cbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgR1VJID0gcmVxdWlyZSgnZ3VpL2d1aScpO1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNyZWdpc3RyeScpO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgU2VhcmNoUGFuZWwgPSByZXF1aXJlKCdndWkvc2VhcmNoL3Z1ZS9wYW5lbC9zZWFyY2hwYW5lbCcpO1xuXG5mdW5jdGlvbiBTZWFyY2hlc1NlcnZpY2UoKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICAvL3RoaXMuX3NlYXJjaFBhbmVsU2VydmljZSA9IG5ldyBTZWFyY2hQYW5lbFNlcnZpY2UoKTtcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oc2VhcmNoZXNPYmplY3QpIHtcbiAgICB2YXIgc2VhcmNoZXMgPSBzZWFyY2hlc09iamVjdCB8fCBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRQcm9qZWN0KCkuc3RhdGUuc2VhcmNoO1xuICAgIHRoaXMuc3RhdGUuc2VhcmNoZXMgPSBzZWFyY2hlcztcbiAgfTtcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICBzZWFyY2hlczogW11cbiAgfTtcblxuICB0aGlzLnNob3dTZWFyY2hQYW5lbCA9IGZ1bmN0aW9uKHBhbmVsQ29uZmlnKSB7XG4gICAgdmFyIHBhbmVsID0gIG5ldyBTZWFyY2hQYW5lbCgpOy8vIGNyZW8gcGFuZWxsbyBzZWFyY2hcbiAgICBwYW5lbC5pbml0KHBhbmVsQ29uZmlnKTsvL2luaXppYWxpenpvIHBhbm5lbGxvIHNlXG4gICAgR1VJLnNob3dQYW5lbChwYW5lbCk7XG4gICAgcmV0dXJuIHBhbmVsO1xuICB9O1xuXG4gIHRoaXMuY2xlYW5TZWFyY2hQYW5lbHMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0YXRlLnBhbmVscyA9IHt9O1xuICB9O1xuXG4gIHRoaXMuc3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuXG59O1xuXG4vLyBNYWtlIHRoZSBwdWJsaWMgc2VydmljZSBlbiBFdmVudCBFbWl0dGVyXG5pbmhlcml0KFNlYXJjaGVzU2VydmljZSwgRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBTZWFyY2hlc1NlcnZpY2U7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcz1cXFwiZzN3LXNlYXJjaC1wYW5lbCBmb3JtLWdyb3VwXFxcIj5cXG4gIDxoMz57e3RpdGxlfX08L2gzPlxcbiAgPGZvcm0gaWQ9XFxcImczdy1zZWFyY2gtZm9ybVxcXCI+XFxuICAgIDx0ZW1wbGF0ZSB2LWZvcj1cXFwiZm9ybWlucHV0IGluIGZvcm1pbnB1dHNcXFwiPlxcbiAgICAgIDxkaXYgdi1pZj1cXFwiZm9ybWlucHV0LmlucHV0LnR5cGUgPT0gJ251bWJlcmZpZWxkJ1xcXCIgY2xhc3M9XFxcImZvcm0tZ3JvdXAgbnVtZXJpY1xcXCI+XFxuICAgICAgICA8bGFiZWwgZm9yPVxcXCJ7eyBmb3JtaW5wdXQuaWQgfX0gXFxcIj57eyBmb3JtaW5wdXQubGFiZWwgfX08L2xhYmVsPlxcbiAgICAgICAgPGlucHV0IHR5cGU9XFxcIm51bWJlclxcXCIgdi1tb2RlbD1cXFwiZm9ybUlucHV0VmFsdWVzWyRpbmRleF0udmFsdWVcXFwiIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiIGlkPVxcXCJ7eyBmb3JtaW5wdXQuaWQgfX1cXFwiPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgdi1pZj1cXFwiZm9ybWlucHV0LmlucHV0LnR5cGUgPT0gJ3RleHRmaWVsZCdcXFwiIGNsYXNzPVxcXCJmb3JtLWdyb3VwIHRleHRcXFwiPlxcbiAgICAgICAgPGxhYmVsIGZvcj1cXFwie3sgZm9ybWlucHV0LmlkIH19XFxcIj57eyBmb3JtaW5wdXQubGFiZWwgfX08L2xhYmVsPlxcbiAgICAgICAgPGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHYtbW9kZWw9XFxcImZvcm1JbnB1dFZhbHVlc1skaW5kZXhdLnZhbHVlXFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiBpZD1cXFwie3sgZm9ybWlucHV0LmlkIH19XFxcIj5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC90ZW1wbGF0ZT5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5IHB1bGwtcmlnaHRcXFwiIEBjbGljaz1cXFwiZG9TZWFyY2goJGV2ZW50KVxcXCIgZGF0YS1pMThuPVxcXCJkb3NlYXJjaFxcXCI+U2VhcmNoPC9idXR0b24+XFxuICAgIDwvZGl2PlxcbiAgPC9mb3JtPlxcbjwvZGl2PlxcblwiO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBsb2NhbGl6ZSA9IHJlcXVpcmUoJ2NvcmUvaTE4bi9pMThuLnNlcnZpY2UnKS50O1xudmFyIHJlc29sdmUgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykucmVzb2x2ZTtcbnZhciBHVUkgPSByZXF1aXJlKCdndWkvZ3VpJyk7XG52YXIgUXVlcnlTZXJ2aWNlID0gcmVxdWlyZSgnY29yZS9xdWVyeS9xdWVyeXNlcnZpY2UnKTtcbnZhciBMaXN0UGFuZWwgPSByZXF1aXJlKCdndWkvbGlzdHBhbmVsJykuTGlzdFBhbmVsO1xudmFyIFBhbmVsID0gcmVxdWlyZSgnZ3VpL3BhbmVsJyk7XG52YXIgUHJvamVjdHNSZWdpc3RyeSA9IHJlcXVpcmUoJ2NvcmUvcHJvamVjdC9wcm9qZWN0c3JlZ2lzdHJ5Jyk7XG5cbi8vY29tcG9uZW50ZSB2dWUgcGFubmVsbG8gc2VhcmNoXG52YXIgU2VhcmNoUGFuZWxDb21wb25ldCA9IFZ1ZS5leHRlbmQoe1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9zZWFyY2hwYW5lbC5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0aXRsZTogXCJcIixcbiAgICAgIGZvcm1pbnB1dHM6IFtdLFxuICAgICAgZmlsdGVyT2JqZWN0OiB7fSxcbiAgICAgIGZvcm1JbnB1dFZhbHVlcyA6IFtdXG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgZG9TZWFyY2g6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgLy9hbCBtb21lbnRvIG1vbHRvIGZhcnJhZ2dpbm9zbyBtYSBkYSByaXZlZGVyZVxuICAgICAgLy9wZXIgYXNzb2NpYXppb25lIHZhbG9yZSBpbnB1dFxuICAgICAgdmFyIHNob3dRdWVyeVJlc3VsdHMgPSBHVUkuc2hvd1Jlc3VsdHNGYWN0b3J5KCdxdWVyeScpO1xuICAgICAgdmFyIHF1ZXJ5UmVzdWx0c1BhbmVsID0gc2hvd1F1ZXJ5UmVzdWx0cyhzZWxmLnRpdGxlKTtcbiAgICAgIHRoaXMuZmlsdGVyT2JqZWN0ID0gdGhpcy5maWxsRmlsdGVySW5wdXRzV2l0aFZhbHVlcyh0aGlzLmZpbHRlck9iamVjdCwgdGhpcy5mb3JtSW5wdXRWYWx1ZXMpO1xuICAgICAgUXVlcnlTZXJ2aWNlLnF1ZXJ5QnlGaWx0ZXIodGhpcy5maWx0ZXJPYmplY3QpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXN1bHRzKXtcbiAgICAgICAgcXVlcnlSZXN1bHRzUGFuZWwuc2V0UXVlcnlSZXNwb25zZShyZXN1bHRzKTtcbiAgICAgIH0pXG4gICAgfVxuICB9XG59KTtcblxuLy9jb3N0cnV0dG9yZSBkZWwgcGFubmVsbG8gZSBkZWwgc3VvIGNvbXBvbmVudGUgdnVlXG5mdW5jdGlvbiBTZWFyY2hQYW5lbCgpIHtcbiAgc2VsZiA9IHRoaXM7XG4gIHRoaXMuY29uZmlnID0ge307XG4gIHRoaXMuZmlsdGVyID0ge307XG4gIHRoaXMuaWQgPSBudWxsO1xuICB0aGlzLnF1ZXJ5bGF5ZXJpZCA9IG51bGw7XG4gIHRoaXMuaW50ZXJuYWxQYW5lbCA9IG5ldyBTZWFyY2hQYW5lbENvbXBvbmV0KCk7XG4gIC8vZnVuemlvbmUgaW5pemlhbGl6emF6aW9uZVxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcbiAgICB0aGlzLm5hbWUgPSB0aGlzLmNvbmZpZy5uYW1lIHx8IHRoaXMubmFtZTtcbiAgICB0aGlzLmlkID0gdGhpcy5jb25maWcuaWQgfHwgdGhpcy5pZDtcbiAgICB0aGlzLmZpbHRlciA9IHRoaXMuY29uZmlnLm9wdGlvbnMuZmlsdGVyIHx8IHRoaXMuZmlsdGVyO1xuICAgIHZhciBxdWVyeUxheWVySWQgPSB0aGlzLmNvbmZpZy5vcHRpb25zLnF1ZXJ5bGF5ZXJpZCB8fCB0aGlzLnF1ZXJ5bGF5ZXJpZDtcbiAgICB0aGlzLnF1ZXJ5TGF5ZXIgPSBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRQcm9qZWN0KCkuZ2V0TGF5ZXJCeUlkKHF1ZXJ5TGF5ZXJJZCk7XG4gICAgLy92YWRvIGEgcmllbXBpcmUgZ2xpIGlucHV0IGRlbCBmb3JtIGRlbCBwYW5uZWxsb1xuICAgIHRoaXMuZmlsbElucHV0c0Zvcm1Gcm9tRmlsdGVyKCk7XG4gICAgLy9jcmVvIGUgYXNzZWdubyBsJ29nZ2V0dG8gZmlsdHJvXG4gICAgdmFyIGZpbHRlck9iakZyb21Db25maWcgPSBRdWVyeVNlcnZpY2UuY3JlYXRlUXVlcnlGaWx0ZXJGcm9tQ29uZmlnKHRoaXMuZmlsdGVyKTtcbiAgICAvL2FsbGEgZmluZSBjcmVvIGwnZ2dldHRvIGZpbmFsZSBkZWwgZmlsdHJvIGRhIHBhc3NhcmUgcG9pIGFsIHByb3ZpZGVyIFFHSVNXTVMgbyBXRlMgZXRjLi4gY2hlIGNvbnRpZW5lIHNpYVxuICAgIC8vaWwgZmlsdHJvIGNoZSB1cmwsIGlsIG5vbWUgZGVsIGxheWVyIGlsIHRpcG8gZGkgc2VydmVyIGV0YyAuLlxuICAgIHRoaXMuaW50ZXJuYWxQYW5lbC5maWx0ZXJPYmplY3QgPSBRdWVyeVNlcnZpY2UuY3JlYXRlUXVlcnlGaWx0ZXJPYmplY3QodGhpcy5xdWVyeUxheWVyLCBmaWx0ZXJPYmpGcm9tQ29uZmlnKTtcbiAgICAvL3NvbHV6aW9uZSBtb21lbnRhbmVhIGFzc2Vnbm8gIGxhIGZ1bnppb25lIGRlbCBTZWFyY2hQYW5sZSBtYSBjb21lIHBhdHRlcm4gw6ggc2JhZ2xpYXRvXG4gICAgLy92b3JyZWkgZGVsZWdhcmxvIGEgU2VhcmNoZXNTZXJ2aWNlIG1hIGxvIHN0ZXNzbyBzdGFuemlhIHF1ZXN0byAobG9vcCkgY29tZSB1c2Npcm5lPz8/XG4gICAgLy9jcmVhcmUgdW4gc2VhcmNocGFuZWxzZXJ2aWNlP1xuICAgIHRoaXMuaW50ZXJuYWxQYW5lbC5maWxsRmlsdGVySW5wdXRzV2l0aFZhbHVlcyA9IHRoaXMuZmlsbEZpbHRlcklucHV0c1dpdGhWYWx1ZXM7XG4gICAgdGhpcy5pbnRlcm5hbFBhbmVsLnRpdGxlID0gdGhpcy5uYW1lO1xuICB9O1xuICAvL2Z1bnppb25lIGNoZSBwb3BvbGEgZ2xpIGlucHV0cyBjaGUgY2kgc2FyYW5ubyBuZWwgZm9ybSBkZWwgcGFubmVsbG8gcmljZXJjYVxuICAvL29sdHJlIGNvc3RydWlyZSB1biBvZ2dldHRvIGNoZSBsZWdoZXLDoCBpIHZhbG9yaSBkZWdsaSBpbnB1dHMgZGVsIGZvcm0gY29uIGdsaSBvZ2dldHRpXG4gIC8vJ29wZXJhemlvbmFsaScgZGVsIGZpbHRyb1xuICB0aGlzLmZpbGxJbnB1dHNGb3JtRnJvbUZpbHRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpZCA9IDA7XG4gICAgdmFyIGZvcm1WYWx1ZTtcbiAgICBfLmZvckVhY2godGhpcy5maWx0ZXIsZnVuY3Rpb24odixrLG9iaikge1xuICAgICAgXy5mb3JFYWNoKHYsIGZ1bmN0aW9uKGlucHV0KXtcbiAgICAgICAgLy9zZW1wcmUgbnVvdm8gb2dnZXR0b1xuICAgICAgICBmb3JtVmFsdWUgPSB7fTtcbiAgICAgICAgLy9pbnNlcmlzY28gbCdpZCBhbGwnaW5wdXRcbiAgICAgICAgaW5wdXQuaWQgPSBpZFxuICAgICAgICAvL2FnZ2l1bmdvIGlsIHRpcG8gYWwgdmFsb3JlIHBlciBmYXJlIGNvbnZlcnNpb25lIGRhIHN0cmluZ2EgYSB0aXBvIGlucHV0XG4gICAgICAgIGZvcm1WYWx1ZS50eXBlID0gaW5wdXQuaW5wdXQudHlwZTtcbiAgICAgICAgLy8vL1RFTVBPUkFORU8gISEhIERFVk8gUFJFTkRFUkUgSUwgVkVSTyBWQUxPUkUgREkgREVGQVVMVFxuICAgICAgICBmb3JtVmFsdWUudmFsdWUgPSBudWxsO1xuICAgICAgICAvL3BvcG9sbyBnbGkgaW5wdXRzOlxuICAgICAgICAvLyB2YWxvcmlcbiAgICAgICAgc2VsZi5pbnRlcm5hbFBhbmVsLmZvcm1JbnB1dFZhbHVlcy5wdXNoKGZvcm1WYWx1ZSk7XG4gICAgICAgIC8vaW5wdXRcbiAgICAgICAgc2VsZi5pbnRlcm5hbFBhbmVsLmZvcm1pbnB1dHMucHVzaChpbnB1dCk7XG4gICAgICAgIGlkKz0xO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG4gIC8vZnVuemlvbmUgY2hlIGFzc29jaWEgaSB2YWxvcmkgZGVsbCdpbnB1dHMgZm9ybSBhbCByZWxhdGl2byBvZ2dldHRvIFwib3BlcmF6aW9uZGUgZGVsIGZpbHRyb1wiXG4gIHRoaXMuZmlsbEZpbHRlcklucHV0c1dpdGhWYWx1ZXMgPSBmdW5jdGlvbihmaWx0ZXJPYmplY3QsIGZvcm1JbnB1dFZhbHVlcywgZ2xvYmFsSW5kZXgpIHtcbiAgICAvL2Z1bnppb25lIGNvbnZlcnNpb25lIGRhIHZhbG9yZSByZXN0aXR1aXRvIGRhbGwnaW5wdXQgKHNlbXByZSBzdHJpbmdhKSBhbCB2ZXJvIHRpcG8gZGkgdmFsb3JlXG4gICAgZnVuY3Rpb24gY29udmVydElucHV0VmFsdWVUb0lucHV0VHlwZSh0eXBlLCB2YWx1ZSkge1xuICAgICAgc3dpdGNoKHR5cGUpIHtcbiAgICAgICAgY2FzZSAnbnVtYmVyZmllbGQnOlxuICAgICAgICAgICAgIHZhbHVlID0gcGFyc2VJbnQodmFsdWUpO1xuICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICAvL2NpY2xvIHN1bGwnb2dnZXR0byBmaWx0cm8gY2hlIGhhIGNvbWUgY2hpYXZlIHJvb3QgJ0FORCcgbyAnT1InXG4gICAgXy5mb3JFYWNoKGZpbHRlck9iamVjdC5maWx0ZXJPYmplY3QsIGZ1bmN0aW9uKHYsaykge1xuICAgICAgLy9zY29ycm8gYXR0cmF2ZXJzbyBsJ2FycmF5IGRpIGVsZW1lbnRpIG9wZXJhemlvbmFsaSBkYSBjb25mcm9udGFyZVxuICAgICAgXy5mb3JFYWNoKHYsIGZ1bmN0aW9uKGlucHV0LCBpZHgpIHtcbiAgICAgICAgLy9lbGVtZW50byBvcGVyYXppb25hbGUgeyc9Jzp7fX1cbiAgICAgICAgXy5mb3JFYWNoKGlucHV0LCBmdW5jdGlvbih2LCBrLCBvYmopIHtcbiAgICAgICAgICAvL3ZhZG8gYSBsZWdnZXJlIGwnb2dnZXR0byBhdHRyaWJ1dG9cbiAgICAgICAgICBpZiAoXy5pc0FycmF5KHYpKSB7XG4gICAgICAgICAgICAvL3JpY2hpYW1hIGxhIGZ1bnppb25lIHJpY29yc2l2YW1lbnRlIC4uIGFuZHLDoCBiZW5lID9cbiAgICAgICAgICAgIGZpbGxGaWx0ZXJJbnB1dHNXaXRoVmFsdWVzKGlucHV0LCBmb3JtSW5wdXRWYWx1ZXMsIGlkeCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaCh2LCBmdW5jdGlvbih2LCBrLCBvYmopIHtcbiAgICAgICAgICAgICAgLy9jb25zaWRlcm8gbCdpbmRleCBnbG9iYWxlIGluIG1vZG8gY2hlIGlucHV0cyBkaSBvcGVyYXppb25pIGJvb2xlYW5lIGludGVybmVcbiAgICAgICAgICAgICAgLy92ZW5nb25vIGNvbnNpZGVyYXRlXG4gICAgICAgICAgICAgIGluZGV4ID0gKGdsb2JhbEluZGV4KSA/IGdsb2JhbEluZGV4ICsgaWR4IDogaWR4O1xuICAgICAgICAgICAgICBvYmpba10gPSBjb252ZXJ0SW5wdXRWYWx1ZVRvSW5wdXRUeXBlKGZvcm1JbnB1dFZhbHVlc1tpbmRleF0udHlwZSwgZm9ybUlucHV0VmFsdWVzW2luZGV4XS52YWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBmaWx0ZXJPYmplY3Q7XG4gIH07XG59O1xuXG5pbmhlcml0KFNlYXJjaFBhbmVsLCBQYW5lbCk7XG5tb2R1bGUuZXhwb3J0cyA9IFNlYXJjaFBhbmVsO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgaWQ9XFxcImczdy1zZWFyY2hcXFwiIGNsYXNzPVxcXCJnM3ctc2VhcmNoIGczdy10b29sc1xcXCI+XFxuICA8dWw+XFxuICAgIDxsaSB2LWZvcj1cXFwic2VhcmNoIGluIHByb2plY3Quc2VhcmNoXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzZWFyY2gtaGVhZGVyIHRvb2wtaGVhZGVyXFxcIiBAY2xpY2s9XFxcInNob3dTZWFyY2hQYW5lbChzZWFyY2gpXFxcIj5cXG4gICAgICAgIDxzcGFuIHN0eWxlPVxcXCJcXFwiPnt7IHNlYXJjaC5uYW1lIH19PC9zcGFuPlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2xpPlxcbiAgPC91bD5cXG48L2Rpdj5cXG5cIjtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIG1lcmdlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLm1lcmdlO1xudmFyIHQgPSByZXF1aXJlKCdjb3JlL2kxOG4vaTE4bi5zZXJ2aWNlJykudDtcbnZhciByZXNvbHZlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlc29sdmU7XG52YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnZ3VpL3Z1ZS9jb21wb25lbnQnKTtcbnZhciBHVUkgPSByZXF1aXJlKCdndWkvZ3VpJyk7XG52YXIgUHJvamVjdHNSZWdpc3RyeSA9IHJlcXVpcmUoJ2NvcmUvcHJvamVjdC9wcm9qZWN0c3JlZ2lzdHJ5Jyk7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBTZWFyY2hQYW5lbCA9IHJlcXVpcmUoJ2d1aS9zZWFyY2gvdnVlL3BhbmVsL3NlYXJjaHBhbmVsJyk7XG52YXIgUHJvamVjdHNSZWdpc3RyeSA9IHJlcXVpcmUoJ2NvcmUvcHJvamVjdC9wcm9qZWN0c3JlZ2lzdHJ5Jyk7XG52YXIgU2VhcmNoZXNTZXJ2aWNlID0gcmVxdWlyZSgnZ3VpL3NlYXJjaC9zZWFyY2hlc3NlcnZpY2UnKTtcblxudmFyIHZ1ZUNvbXBvbmVudE9wdGlvbnMgPSB7XG4gICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9zZWFyY2guaHRtbCcpLFxuICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgXHRyZXR1cm4ge1xuICAgIFx0ICBwcm9qZWN0OiBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRQcm9qZWN0KCkuc3RhdGVcbiAgICBcdH07XG4gICB9LFxuICAgbWV0aG9kczoge1xuICAgIHNob3dTZWFyY2hQYW5lbDogZnVuY3Rpb24oc2VhcmNoKSB7XG4gICAgICAgIHZhciBwYW5lbCA9IHRoaXMuJG9wdGlvbnMuc2VhcmNoZXNTZXJ2aWNlLnNob3dTZWFyY2hQYW5lbChzZWFyY2gpO1xuICAgIH1cbiAgfVxufTtcblxuLy8gc2UgbG8gdm9nbGlvIGlzdGFuemlhcmUgbWFudWFsbWVudGVcbnZhciBJbnRlcm5hbENvbXBvbmVudCA9IFZ1ZS5leHRlbmQodnVlQ29tcG9uZW50T3B0aW9ucyk7XG4vLyBzZSBsbyB2b2dsaW8gdXNhcmUgY29tZSBjb21wb25lbnRlIGNvbWUgZWxlbWVudG8gaHRtbFxuLy9WdWUuY29tcG9uZW50KCdnM3ctc2VhcmNoJyx2dWVDb21wb25lbnRPcHRpb25zKTtcblxuLyogQ09NUE9ORU5USSBGSUdMSSAqL1xuLyogRklORSBDT01QT05FTlRJIEZJR0xJICovXG5cbi8qIElOVEVSRkFDQ0lBIFBVQkJMSUNBICovXG5mdW5jdGlvbiBTZWFyY2hDb21wb25lbnQob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgdGhpcy5pZCA9IFwic2VhcmNoLWNvbXBvbmVudFwiO1xuICB0aGlzLnRpdGxlID0gXCJzZWFyY2hcIjtcbiAgdGhpcy5fc2VydmljZSA9IG5ldyBTZWFyY2hlc1NlcnZpY2UoKTtcbiAgdGhpcy5pbnRlcm5hbENvbXBvbmVudCA9IG5ldyBJbnRlcm5hbENvbXBvbmVudCh7XG4gICAgc2VhcmNoZXNTZXJ2aWNlOiB0aGlzLl9zZXJ2aWNlXG4gIH0pO1xuICB0aGlzLnN0YXRlLnZpc2libGUgPSBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRQcm9qZWN0KCkuc3RhdGUuc2VhcmNoLmxlbmd0aCA+IDA7XG4gIG1lcmdlKHRoaXMsIG9wdGlvbnMpO1xuICB0aGlzLmluaXRTZXJ2aWNlID0gZnVuY3Rpb24oKSB7XG4gICAgLy9pbml6aWFsaXp6byBpbCBzZXJ2aXppb1xuICAgIHRoaXMuX3NlcnZpY2UuaW5pdCgpO1xuICB9O1xufTtcblxuaW5oZXJpdChTZWFyY2hDb21wb25lbnQsIENvbXBvbmVudCk7XG5tb2R1bGUuZXhwb3J0cyA9IFNlYXJjaENvbXBvbmVudDtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG5cbmZ1bmN0aW9uIFRvb2xzU2VydmljZSgpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuY29uZmlnID0gbnVsbDtcbiAgdGhpcy5fYWN0aW9ucyA9IHt9O1xuICB0aGlzLnN0YXRlID0ge1xuICAgIHRvb2xzR3JvdXBzOiBbXVxuICB9O1xuICBcbiAgdGhpcy5zZXR0ZXJzID0ge1xuICAgIGFkZFRvb2xHcm91cDogZnVuY3Rpb24oZ3JvdXApIHtcbiAgICAgIHNlbGYuc3RhdGUudG9vbHNHcm91cHMucHVzaChncm91cCk7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5hZGRUb29scyA9IGZ1bmN0aW9uKGdyb3VwTmFtZSwgdG9vbHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGdyb3VwID0gdGhpcy5fZ2V0VG9vbHNHcm91cChncm91cE5hbWUpO1xuICAgIGlmICghZ3JvdXApIHtcbiAgICAgIGdyb3VwID0ge1xuICAgICAgICBuYW1lOiBncm91cE5hbWUsXG4gICAgICAgIHRvb2xzOiBbXVxuICAgICAgfTtcbiAgICAgIHRoaXMuYWRkVG9vbEdyb3VwKGdyb3VwKTtcbiAgICB9XG4gICAgXy5mb3JFYWNoKHRvb2xzLGZ1bmN0aW9uKHRvb2wpe1xuICAgICAgZ3JvdXAudG9vbHMucHVzaCh0b29sKTtcbiAgICAgIHNlbGYuX2FkZEFjdGlvbih0b29sKTtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMucmVtb3ZlVG9vbCA9IGZ1bmN0aW9uKHRvb2xJZCkge1xuICB9O1xuICBcbiAgdGhpcy5maXJlQWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uSWQpe1xuICAgIHZhciBhY3Rpb24gPSB0aGlzLl9hY3Rpb25zW2FjdGlvbklkXTtcbiAgICBhY3Rpb24oKTtcbiAgfTtcbiAgXG4gIHRoaXMuX2dldFRvb2xzR3JvdXAgPSBmdW5jdGlvbihncm91cE5hbWUpIHtcbiAgICB2YXIgZ3JvdXAgPSBudWxsO1xuICAgIF8uZm9yRWFjaCh0aGlzLnN0YXRlLnRvb2xzR3JvdXBzLGZ1bmN0aW9uKF9ncm91cCl7XG4gICAgICBpZiAoX2dyb3VwLm5hbWUgPT0gZ3JvdXBOYW1lKSB7XG4gICAgICAgIGdyb3VwID0gX2dyb3VwO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBncm91cDtcbiAgfTtcbiAgXG4gIHRoaXMuX2FkZEFjdGlvbiA9IGZ1bmN0aW9uKHRvb2wpIHtcbiAgICB2YXIgYWN0aW9uSWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwKSsxO1xuICAgIHRvb2wuYWN0aW9uSWQgPSBhY3Rpb25JZDtcbiAgICB0aGlzLl9hY3Rpb25zW2FjdGlvbklkXSA9IHRvb2wuYWN0aW9uO1xuICB9O1xuICBcbiAgYmFzZSh0aGlzKTtcbn1cblxuaW5oZXJpdChUb29sc1NlcnZpY2UsIEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gVG9vbHNTZXJ2aWNlO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcImczdy10b29sc1xcXCI+XFxuICA8dWw+XFxuICAgIDxsaSB2LWZvcj1cXFwiZ3JvdXAgaW4gc3RhdGUudG9vbHNHcm91cHNcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInRvb2wtaGVhZGVyXFxcIj5cXG4gICAgICAgIDxzcGFuIHN0eWxlPVxcXCJcXFwiPnt7IGdyb3VwLm5hbWUgfX08L3NwYW4+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBpZD1cXFwie3sgZ3JvdXAubmFtZSB9fS10b29sc1xcXCIgY2xhc3M9XFxcInRvb2wtYm94XFxcIj5cXG4gICAgICAgIDx0ZW1wbGF0ZSB2LWZvcj1cXFwidG9vbCBpbiBncm91cC50b29sc1xcXCI+XFxuICAgICAgICAgIDxkaXYgdi1pZj1cXFwidG9vbC50eXBlID09ICdjaGVja2JveCcgXFxcIiBjbGFzcz1cXFwiY2hlY2tib3ggdG9vbFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPjxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgQGNsaWNrPVxcXCJmaXJlQWN0aW9uKHRvb2wuYWN0aW9uSWQpXFxcIiB2YWx1ZT1cXFwiXFxcIj57eyB0b29sLm5hbWUgfX08L2xhYmVsPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwidG9vbFxcXCIgdi1lbHNlPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLWNvZ1xcXCI+PC9pPlxcbiAgICAgICAgICAgIDxzcGFuIEBjbGljaz1cXFwiZmlyZUFjdGlvbih0b29sLmFjdGlvbklkKVxcXCI+e3sgdG9vbC5uYW1lIH19PC9zcGFuPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvdGVtcGxhdGU+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvbGk+XFxuICA8L3VsPlxcbjwvZGl2PlxcblwiO1xuIiwidmFyIHQgPSByZXF1aXJlKCdjb3JlL2kxOG4vaTE4bi5zZXJ2aWNlJykudDtcbnZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIG1lcmdlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLm1lcmdlO1xudmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJ2d1aS92dWUvY29tcG9uZW50Jyk7XG52YXIgVG9vbHNTZXJ2aWNlID0gcmVxdWlyZSgnZ3VpL3Rvb2xzL3Rvb2xzc2VydmljZScpO1xuXG52YXIgSW50ZXJuYWxDb21wb25lbnQgPSBWdWUuZXh0ZW5kKHtcbiAgICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi90b29scy5odG1sJyksXG4gICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0ZTogbnVsbFxuICAgICAgfVxuICAgIH0sXG4gICAgbWV0aG9kczoge1xuICAgICAgZmlyZUFjdGlvbjogZnVuY3Rpb24oYWN0aW9uaWQpe1xuICAgICAgICB0aGlzLiRvcHRpb25zLnRvb2xzU2VydmljZS5maXJlQWN0aW9uKGFjdGlvbmlkKTtcbiAgICAgIH1cbiAgICB9XG59KTtcblxuZnVuY3Rpb24gVG9vbHNDb21wb25lbnQob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9zZXJ2aWNlID0gbmV3IFRvb2xzU2VydmljZSgpO1xuICB0aGlzLmlkID0gXCJ0b29scy1jb21wb25lbnRcIjtcbiAgdGhpcy50aXRsZSA9IFwidG9vbHNcIjtcbiAgdGhpcy5zdGF0ZS52aXNpYmxlID0gZmFsc2U7XG4gIHRoaXMuX3NlcnZpY2Uub25hZnRlcignYWRkVG9vbEdyb3VwJyxmdW5jdGlvbigpe1xuICAgIHNlbGYuc3RhdGUudmlzaWJsZSA9IHNlbGYuX3NlcnZpY2Uuc3RhdGUudG9vbHNHcm91cHMubGVuZ3RoID4gMDtcbiAgfSlcbiAgbWVyZ2UodGhpcywgb3B0aW9ucyk7XG4gIHRoaXMuaW50ZXJuYWxDb21wb25lbnQgPSBuZXcgSW50ZXJuYWxDb21wb25lbnQoe1xuICAgIHRvb2xzU2VydmljZTogdGhpcy5fc2VydmljZVxuICB9KTtcbiAgLy9zb3N0aXR1aXNjbyBsbyBzdGF0ZSBkZWwgc2Vydml6aW8gYWxsbyBzdGF0ZSBkZWwgY29tcG9uZW50ZSB2dWUgaW50ZXJub1xuICB0aGlzLmludGVybmFsQ29tcG9uZW50LnN0YXRlID0gdGhpcy5fc2VydmljZS5zdGF0ZVxufTtcblxuaW5oZXJpdChUb29sc0NvbXBvbmVudCwgQ29tcG9uZW50KTtcblxudmFyIHByb3RvID0gVG9vbHNDb21wb25lbnQucHJvdG90eXBlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRvb2xzQ29tcG9uZW50O1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgcmVzb2x2ZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZXNvbHZlO1xudmFyIHJlamVjdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZWplY3Q7XG52YXIgQmFzZUNvbXBvbmVudCA9IHJlcXVpcmUoJ2d1aS9jb21wb25lbnQnKTtcblxudmFyIENvbXBvbmVudCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgYmFzZSh0aGlzLG9wdGlvbnMpO1xufTtcblxuaW5oZXJpdChDb21wb25lbnQsIEJhc2VDb21wb25lbnQpO1xuXG52YXIgcHJvdG8gPSBDb21wb25lbnQucHJvdG90eXBlO1xuXG4vLyB2aWVuZSByaWNoaWFtYXRvIGRhbGxhIHRvb2xiYXIgcXVhbmRvIGlsIHBsdWdpbiBjaGllZGUgZGkgbW9zdHJhcmUgdW4gcHJvcHJpbyBwYW5uZWxsbyBuZWxsYSBHVUkgKEdVSS5zaG93UGFuZWwpXG5wcm90by5tb3VudCA9IGZ1bmN0aW9uKHBhcmVudCxhcHBlbmQpIHtcbiAgaWYgKCF0aGlzLmludGVybmFsQ29tcG9uZW50KSB7XG4gICAgdGhpcy5zZXRJbnRlcm5hbENvbXBvbmVudCgpO1xuICB9O1xuICBpZihhcHBlbmQpIHtcbiAgICB0aGlzLmludGVybmFsQ29tcG9uZW50LiRtb3VudCgpLiRhcHBlbmRUbyhwYXJlbnQpO1xuICB9XG4gIGVsc2Uge1xuICAgIHRoaXMuaW50ZXJuYWxDb21wb25lbnQuJG1vdW50KHBhcmVudCk7XG4gIH1cbiAgJChwYXJlbnQpLmxvY2FsaXplKCk7XG4gIHJldHVybiByZXNvbHZlKHRydWUpO1xufTtcblxuLy8gcmljaGlhbWF0byBxdWFuZG8gbGEgR1VJIGNoaWVkZSBkaSBjaGl1ZGVyZSBpbCBwYW5uZWxsby4gU2Ugcml0b3JuYSBmYWxzZSBpbCBwYW5uZWxsbyBub24gdmllbmUgY2hpdXNvXG5wcm90by51bm1vdW50ID0gZnVuY3Rpb24oKSB7XG4gIC8vIGlsIHByb2JsZW1hIGNoZSBkaXN0cnVnZ2VyZVxuICB0aGlzLmludGVybmFsQ29tcG9uZW50LiRkZXN0cm95KHRydWUpO1xuICB0aGlzLmludGVybmFsQ29tcG9uZW50ID0gbnVsbDtcbiAgcmV0dXJuIHJlc29sdmUoKTtcbn07XG5cbnByb3RvLmhpZGUgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2codGhpcy5pbnRlcm5hbENvbXBvbmVudC4kZWwpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7XG4iLCJ2YXIgZzN3ID0gZzN3IHx8IHt9O1xuXG5nM3cuY29yZSA9IHtcbiAgIEczV09iamVjdDogcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKSxcbiAgIHV0aWxzOiByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJyksXG4gICBBcHBsaWNhdGlvblNlcnZpY2U6IHJlcXVpcmUoJ2NvcmUvYXBwbGljYXRpb25zZXJ2aWNlJyksXG4gICBBcGlTZXJ2aWNlOiByZXF1aXJlKCdjb3JlL2FwaXNlcnZpY2UnKSxcbiAgIFJvdXRlcjogcmVxdWlyZSgnY29yZS9yb3V0ZXInKSxcbiAgIFByb2plY3RzUmVnaXN0cnk6IHJlcXVpcmUoJ2NvcmUvcHJvamVjdC9wcm9qZWN0c3JlZ2lzdHJ5JyksXG4gICBQcm9qZWN0OiByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdCcpLFxuICAgUXVlcnlTZXJ2aWNlOiByZXF1aXJlKCdjb3JlL3F1ZXJ5L3F1ZXJ5c2VydmljZScpLFxuICAgTWFwTGF5ZXI6IHJlcXVpcmUoJ2NvcmUvbWFwL2xheWVyL21hcGxheWVyJyksXG4gICBWZWN0b3JMYXllcjogcmVxdWlyZSgnY29yZS9tYXAvbGF5ZXIvdmVjdG9ybGF5ZXInKSxcbiAgIFdtc0xheWVyOiByZXF1aXJlKCdjb3JlL21hcC9sYXllci93bXNsYXllcicpLFxuICAgVmVjdG9yTGF5ZXJMb2FkZXI6IHJlcXVpcmUoJ2NvcmUvbWFwL2xheWVyL2xvYWRlci92ZWN0b3Jsb2FkZXJsYXllcicpLFxuICAgR2VvbWV0cnk6IHJlcXVpcmUoJ2NvcmUvZ2VvbWV0cnkvZ2VvbWV0cnknKSxcbiAgIGdlb206IHJlcXVpcmUoJ2NvcmUvZ2VvbWV0cnkvZ2VvbScpLFxuICAgUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb246IHJlcXVpcmUoJ2czdy1vbDMvc3JjL2ludGVyYWN0aW9ucy9waWNrY29vcmRpbmF0ZXNpbnRlcmFjdGlvbicpLFxuICAgUGlja0ZlYXR1cmVJbnRlcmFjdGlvbjogcmVxdWlyZSgnZzN3LW9sMy9zcmMvaW50ZXJhY3Rpb25zL3BpY2tmZWF0dXJlaW50ZXJhY3Rpb24nKSxcbiAgIGkxOG46IHJlcXVpcmUoJ2NvcmUvaTE4bi9pMThuLnNlcnZpY2UnKSxcbiAgIFBsdWdpbjogcmVxdWlyZSgnY29yZS9wbHVnaW4vcGx1Z2luJyksXG4gICBQbHVnaW5zUmVnaXN0cnk6IHJlcXVpcmUoJ2NvcmUvcGx1Z2luL3BsdWdpbnNyZWdpc3RyeScpLFxuICAgRWRpdG9yOiByZXF1aXJlKCdjb3JlL2VkaXRpbmcvZWRpdG9yJylcbn07XG5cbmczdy5ndWkgPSB7XG4gIEdVSTogcmVxdWlyZSgnZ3VpL2d1aScpLFxuICBGb3JtOiByZXF1aXJlKCdndWkvZm9ybScpLkZvcm0sXG4gIEZvcm1QYW5lbDogcmVxdWlyZSgnZ3VpL2Zvcm0nKS5Gb3JtUGFuZWwsXG4gIFBhbmVsOiByZXF1aXJlKCdndWkvcGFuZWwnKSxcbiAgdnVlOiB7XG4gICAgLy9HZW9jb2RpbmdDb21wb25lbnQ6IHJlcXVpcmUoJ2d1aS92dWUvZ2VvY29kaW5nL2dlb2NvZGluZycpLFxuICAgIFNlYXJjaENvbXBvbmVudDogcmVxdWlyZSgnZ3VpL3NlYXJjaC92dWUvc2VhcmNoJyksXG4gICAgQ2F0YWxvZ0NvbXBvbmVudDogcmVxdWlyZSgnZ3VpL2NhdGFsb2cvdnVlL2NhdGFsb2cnKSxcbiAgICBNYXBDb21wb25lbnQ6IHJlcXVpcmUoJ2d1aS9tYXAvdnVlL21hcCcpLFxuICAgIFRvb2xzQ29tcG9uZW50OiByZXF1aXJlKCdndWkvdG9vbHMvdnVlL3Rvb2xzJyksXG4gICAgUXVlcnlSZXN1bHRzQ29tcG9uZW50IDogcmVxdWlyZSgnZ3VpL3F1ZXJ5cmVzdWx0cy92dWUvcXVlcnlyZXN1bHRzJylcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNvcmU6IGczdy5jb3JlLFxuICBndWk6IGczdy5ndWlcbn07XG4iXX0=
