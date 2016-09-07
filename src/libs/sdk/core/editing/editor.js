var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolve = require('core/utils/utils').resolve;
var G3WObject = require('core/g3wobject');
var VectorLayer = require('core/map/layer/vectorlayer');
// BASE TOOLS ////
var AddFeatureTool = require('./tools/addfeaturetool');
var MoveFeatureTool = require('./tools/movepointtool');
var ModifyFeatureTool = require('./tools/modifyfeaturetool');
var DeleteFeatureTool = require('./tools/deletefeaturetool');
var PickFeatureTool = require('./tools/pickfeaturetool');
var CutLineTool = require('./tools/cutlinetool');
/// BUFFER /////
var EditBuffer = require('./editbuffer');

// Editor di vettori puntuali
function Editor(options) {

  this._mapService = options.mapService || {};
  this._vectorLayer = null;
  this._editVectorLayer = null;
  this._editBuffer = null;
  this._activeTool = null;
  this._dirty = false;
  this._newPrefix = '_new_';;
  this._featureLocks = null;
  this._started = false;

  this._setterslisteners = {
    before: {},
    after: {}
  };

  this._geometrytypes = [
    'Point',
    'LineString',
    'MultiLineString'
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
  //ACTIVE TOOL -- ISTANZA CON I SUOI METODI E ATTRIBUTI
  this._activeTool = new function() {
    this.type = null;
    this.instance = null;

    this.setTool = function(type, instance) {
      this.type = type;
      this.instance = instance;
    };

    this.getType = function() {
      return this.type;
    };

    this.getTool = function() {
      return this.instance;
    };

    this.clear = function() {
      this.type = null;
      this.instance = null;
    };
  }
  // TOOLS
  //terrà traccia dei tool attivi per quel layer vettoriale
  //ad esempio nel caso di un layer Point
  //avrà tale struttura
  /*
   this._tools = {
     addfeature: AddFeatureTool,
     movefeature: MoveFeatureTool,
     deletefeature: DeleteFeatureTool,
     editattributes: PickFeatureTool
  }
  */
  this._tools = {};
  base(this);
}

inherit(Editor, G3WObject);

module.exports = Editor;

var proto = Editor.prototype;

proto.getMapService = function() {
  return this._mapService;
};

// associa l'oggetto VectorLayer su cui si vuole fare l'editing
// inoltre setta i tipi di tools da poter collegare
// al tipo di layer sempre in base al tipo di geometria del layer
proto.setVectorLayer = function(vectorLayer) {
  //verifica il tipo di geometria del layer vettoriale
  var geometrytype = vectorLayer.geometrytype;
  //verifica se è nella tipologia di geometria compatibile con l'editor
  if (!geometrytype || ! this._isCompatibleType(geometrytype)) {
    throw Error("Vector geometry type "+geometrytype+" is not valid for editing");
  }
  //nel caso in cui la geometria riscontrata corrisponde ad una geometria valida dell'editor
  //setta i tools dell'editor relativi al tipo di geometria
  this._setToolsForVectorType(geometrytype);
  //assegno il layer vettoriale alla proprità dell'editor
  this._vectorLayer = vectorLayer;
};

// avvia la sessione di editazione con un determinato tool (es. addfeature)
proto.start = function() {
  console.log('start della classe Editor');
  // TODO: aggiungere notifica nel caso questo if non si verifichi
  var res = false;
  // se è sia stato settato il vectorLayer
  if (this._vectorLayer) {
    //prima di tutto stoppo editor
    this.stop();
    // istanzio l'editVectorLayer che è un vettore di appoggio (nuovo)
    // dove vado a fare le modifiche
    this._editVectorLayer = new VectorLayer({
      name: "editvector",
      geometrytype: this._vectorLayer.geometrytype,
    });
    //this._mapService.viewer.map.addLayer(this._editVectorLayer.getMapLayer());
    // istanzio l'EditBuffer
    this._editBuffer = new EditBuffer(this);
    //assegno all'attributo _started true;
    this._setStarted(true);
    res = true;
  }
  return res;
};

// termina l'editazione
proto.stop = function() {

  if (this.isStarted()) {
    if (this.stopTool()) {
      //distruggo l'edit buffer
      this._editBuffer.destroy();
      //lo setto a null
      this._editBuffer = null;
      //rimuovo i listeners
      this.removeAllListeners();
      //rivuovo il layer dalla mappa
      this._mapService.viewer.removeLayerByName(this._editVectorLayer.name);
      //setto editor started a false
      this._setStarted(false);
      return true;
    }
    return false;
  }
  return true;
};

//setta il tool corrent per il layer in editing
proto.setTool = function(toolType, options) {
  // al momento stopTool ritorna sempre true
  // quindi if sotto mai verificata
  if (!this.stopTool()) {
    return false;
  }
  // recupera il tool dai tols assegnati in base al tipo di tools richiesto
  // es. toolType = editattributes per editare gli attributi di una featue
  var toolClass = this._tools[toolType];
  // se esiste il tool richiesto
  if (toolClass ) {
    //creo l'istanza della classe Tool
    var toolInstance = new toolClass(this, options);
    // setto le proprità type dell'oggetto acriveTool
    // instance e type
    this._activeTool.setTool(toolType, toolInstance);
    // setto i listeners legati al tool scelto
    this._setToolSettersListeners(toolInstance);
    // faccio partire (chiamando il metodo run dell'istanza tool) il tool
    toolInstance.run();
    return true;
  }
};
// funzione chiamata da fuori (verosimilmente da pluginservice)
// al fine di interrompere l'editing sul layer
proto.stopTool = function() {
  //verifica se esiste l'istanza del tool (come attiva)
  // e se se nella stop del tool (che non fa altro che rimuovere le interaction dalla mappa)
  // si è verificato o meno un errore (tale funzione al momento ritorna true)
  if (this._activeTool.instance && !this._activeTool.instance.stop()) {
    return false;
  }
  // se non è verificata la condizione sopra (dovuta ad esempio alla non istanziazione di nessus tool)
  // si chiama il metodo clea
  // dell'active Tool che setta il type e l'instace a null (al momento si verifica sempre)
  this._activeTool.clear();
  return true;
};
// ritorna l'activeTool
proto.getActiveTool = function() {
  return this._activeTool;
};

proto.isStarted = function() {
  return this._started;
};

proto.hasActiveTool = function() {
  return !_.isNull(this._activeTool.instance);
};

proto.isToolActive = function(toolType) {
  if (this._activeTool.toolType) {
    return this._activeTool.toolType == toolType;
  }
  return false;
};

proto.commit = function(newFeatures) {
  this._editBuffer.commit(newFeatures);
};

proto.undoAll = function() {
  this._editBuffer.undoAll();
};

proto.setFeatureLocks = function(featureLocks) {
  this._featureLocks = featureLocks;
};

proto.getFeatureLocks = function() {
  return this._featureLocks;
};

proto.getFeatureLockIds = function() {
  return _.map(this._featureLocks,function(featurelock) {
    return featurelock.lockid;
  });
};

proto.getFeatureLocksLockIds = function(featureLocks) {
  var featureLocks = featureLocks || this._featureLocks;
  return _.map(featureLocks,function(featurelock) {
    return featurelock.lockid;
  });
};

proto.getFeatureLocksFeatureIds = function(featureLocks) {
  var featureLocks = featureLocks || this._featureLocks;
  return _.map(featureLocks,function(featurelock) {
    return featurelock.featureid;
  });
};

proto.getFeatureLockIdsForFeatureIds = function(fids) {
  var featurelocksForFids = _.filter(this._featureLocks,function(featurelock) {
    return _.includes(fids,featurelock.featureid);
  });

  return this.getFeatureLocksLockIds(featurelocksForFids);
};

proto.getEditedFeatures = function() {
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

proto.setFieldsWithValues = function(feature,fields,relations) {
  var attributes = {};
  _.forEach(fields,function(field) {
    attributes[field.name] = field.value;
  });

  var relationsAttributes = null;
  if (relations) {
    var relationsAttributes = {};
    _.forEach(relations,function(relation) {
      var attributes = {};
      _.forEach(relation.fields,function(field) {
        attributes[field.name] = field.value;
      });
      relationsAttributes[relation.name] = attributes;
    });
  }
  feature.setProperties(attributes);
  this._editBuffer.updateFields(feature,relationsAttributes);
};

proto.setFields = function(feature,fields) {
  feature.setProperties(fields);
  this._editBuffer.updateFields(feature);
};

proto.getRelationsWithValues = function(feature) {
  var fid = feature.getId();
  if (this._vectorLayer.hasRelations()) {
    var fieldsPromise;
    // se non ha fid vuol dire che Ã¨ nuovo e senza attributi, quindi prendo i fields vuoti
    if (!fid) {
      fieldsPromise = this._vectorLayer.getRelationsWithValues();
    }
    // se per caso ha un fid ma Ã¨ un vettoriale nuovo
    else if (!this._vectorLayer.getFeatureById(fid)) {
      // se questa feature, ancora non presente nel vectorLayer, ha comunque i valori delle FKs popolate, allora le estraggo
      if (this._vectorLayer.featureHasRelationsFksWithValues(feature)) {
        var fks = this._vectorLayer.getRelationsFksWithValuesForFeature(feature);
        fieldsPromise = this._vectorLayer.getRelationsWithValuesFromFks(fks);
      }
      // altrimenti prendo i fields vuoti
      else {
        fieldsPromise = this._vectorLayer.getRelationsWithValues();
      }
    }
    // se invece è un vettoriale preesistente controllo intanto se ha dati delle relazioni giÃ  editati
    else {
      var hasEdits = this._editBuffer.areFeatureRelationsEdited(fid);
      if (hasEdits) {
        var relations = this._vectorLayer.getRelations();
        var relationsAttributes = this._editBuffer.getRelationsAttributes(fid);
        _.forEach(relationsAttributes,function(relation) {
          _.forEach(relations[relationKey].fields,function(field) {
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
  var element = {};
  element.fields = _.cloneDeep(this._vectorLayer.getRelationFields(relation));
  element.id = this.generateId();
  return element;
};

proto.getRelationPkFieldIndex = function(relationName) {
  return this._vectorLayer.getRelationPkFieldIndex(relationName);
};

proto.getField = function(name,fields) {
  var fields = fields || this.getVectorLayer().getFieldsWithValues();
  var field = null;
  _.forEach(fields,function(f) {
    if (f.name == name) {
      field = f;
    }
  });
  return field;
};

proto.isDirty = function() {
  return this._dirty;
};
// METODI CHE SOVRASCRIVONO ONAFTER, ONBEFORE, ONBEFOREASYNC DELL'OGGETTO G3WOBJECT
// la loro funzione è quella di settare la propriteà dell'editor
// _setterslisteners in modo corretto da poter poi essere sfruttata dal metodd
// _setToolSettersListeners  --- !!!! DA COMPLETARE LA SPIEGAZIONE !!!----

proto.onafter = function(setter,listener) {
  this._onaftertoolaction(setter,listener);
};

// permette di inserire un setter listener sincrono prima che venga effettuata una operazione da un tool (es. addfeature)
proto.onbefore = function(setter,listener) {
  this._onbeforetoolaction(setter,listener, false);
};

// come onbefore() ma per listener asincroni
proto.onbeforeasync = function(setter, listener) {
  this._onbeforetoolaction(setter,listener,true);
};

proto._onaftertoolaction = function(setter, listener) {
  if (!_.get(this._setterslisteners.after,setter)) {
    this._setterslisteners.after[setter] = [];
  }
  this._setterslisteners.after[setter].push({
    fnc: listener
  });
};

proto._onbeforetoolaction = function(setter, listener,async) {
  // set non è stato creato la proprietà setter del linener before
  // allora la creo e assegno un array che verrà riepito con la funzione listener
  if (!_.get(this._setterslisteners.before, setter)) {
    this._setterslisteners.before[setter] = [];
  }
  this._setterslisteners.before[setter].push({
    fnc: listener,
    how: async ? 'async' : 'sync'
  });
};

/////////////////////////////////////

// una volta istanziato il tool aggiungo a questo tutti i listener definiti a livello di editor
proto._setToolSettersListeners = function(tool) {
  //scorro su i stterListerns impostati dagli editor custom (GeonotesEditor ad esempio)
  // in modo da poter richiamare e settare gli onbefore o onbeefore async o on after
  // nativi dell'oggetto g3wobject sui tool
  //verifico gli on before
  _.forEach(this._setterslisteners.before, function(listeners, setter) {
    // verifico se il tool in questione ha setters
    if (_.hasIn(tool.setters, setter)) {
      // se il tool prevede setters
      _.forEach(listeners, function(listener) {
        // per ogni listener (sono tutti oggetti con
        // chiave fnc, how (vedi sopra)
        // verifico se è un onbefore or un onbeforesync
        // vado a settare la funzione listeners quando il metodo del tool setter
        // viene chiamato
        if (listener.how == 'sync') {
          tool.onbefore(setter, listener.fnc);
        }
        else {
          tool.onbeforeasync(setter, listener.fnc);
        }
      })
    }
  });
  //come sopra ma per gli onafter
  _.forEach(this._setterslisteners.after, function(listeners,setter) {
    if (_.hasIn(tool.setters, setter)) {
      _.forEach(listeners,function(listener) {
        tool.onafter(setter,listener.fnc);
      })
    }
  })
};

proto.addFeature = function(feature) {
  this._editBuffer.addFeature(feature);
};

proto.updateFeature = function(feature) {
  this._editBuffer.updateFeature(feature);
};

proto.deleteFeature = function(feature) {
  this._editBuffer.deleteFeature(feature);
};

proto.getVectorLayer = function() {
  return this._vectorLayer;
};

proto.getEditVectorLayer = function() {
  return this._editVectorLayer;
};

proto.generateId = function() {
  return this._newPrefix+Date.now();
};

proto.isNewFeature = function(fid) {
  if (fid) {
    return fid.toString().indexOf(this._newPrefix) == 0;
  }
  return true;
};

proto._isCompatibleType = function(geometrytype) {
  return this._geometrytypes.indexOf(geometrytype) > -1;
};
//setta i tools relativi alla geometria del layer vettoriale passato
proto._setToolsForVectorType = function(geometrytype) {
  var self = this;
  var tools = this._toolsForGeometryTypes[geometrytype];
  _.forEach(tools, function(toolClass, tool) {
    //assegnazione
    self._tools[tool] = toolClass;
  })
};

proto._setStarted = function(bool) {
  this._started = bool;
};

proto._setDirty = function(bool) {
  if (_.isNil(bool)) {
    this._dirty = true;
  }
  else {
    this._dirty = bool;
  }
  this.emit("dirty",this._dirty);
};