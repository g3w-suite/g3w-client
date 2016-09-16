var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolve = require('core/utils/utils').resolve;
var G3WObject = require('core/g3wobject');
var GUI = require('gui/gui');
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

var Form = require('gui/form');
var form = null; // brutto ma devo tenerlo esterno sennò si crea un clico di riferimenti che manda in palla Vue

// Editor di vettori puntuali
function Editor(options) {

  this._mapService = options.mapService || {};
  this._vectorLayer = null;
  this._editVectorLayer = null;
  this._editBuffer = null;
  this._activeTool = null;
  this._formClass = options.formClass || Form;
  this._dirty = false;
  this._newPrefix = '_new_';
  this._featureLocks = null;
  this._started = false;

  // regole copy and paste campi non sovrascrivibili


  this._copyAndPasteFieldsNotOverwritable = options.copyAndPasteFieldsNotOverwritable || {};

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
  // sono i listeners di default per tutti
  this._setupAddFeatureAttributesEditingListeners();
  this._setupEditAttributesListeners();
  this._askConfirmToDeleteEditingListener();

  base(this);
}

inherit(Editor, G3WObject);

var proto = Editor.prototype;

proto.getcopyAndPasteFieldsNotOverwritable = function() {
  return this._copyAndPasteFieldsNotOverwritable;
};

proto.setcopyAndPasteFieldsNotOverwritable = function(obj) {
    this._copyAndPasteFieldsNotOverwritable = obj;
};

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

// funzione che crea e aggiunge il layer vettoraile di editing alla mappa
proto.addEditingLayerToMap = function(geometryType) {
  // istanzio l'editVectorLayer che è un vettore di appoggio (nuovo)
  // dove vado a fare le modifiche
  this._editVectorLayer = new VectorLayer({
    name: "editvector",
    geometrytype: geometryType
  });
  //il getMapLyer non è altro che la versione ol.Vector del vectorLayer oggetto
  this._mapService.viewer.map.addLayer(this._editVectorLayer.getMapLayer());
};

//funzione che rimove il vettore di eding dalla mappa e lo resetta
proto.removeEditingLayerFromMap = function() {
  this._mapService.viewer.removeLayerByName(this._editVectorLayer.name);
  this._editVectorLayer = null;
};

// avvia la sessione di editazione con un determinato tool (es. addfeature)
proto.start = function() {
  // TODO: aggiungere notifica nel caso questo if non si verifichi
  var res = false;
  // se è sia stato settato il vectorLayer
  if (this._vectorLayer) {
    //prima di tutto stoppo editor
    this.stop();
    //chiamo la funzione che mi crea il vettoriale di edting dove vendono apportate
    // tutte le modifice del layer
    this.addEditingLayerToMap(this._vectorLayer.geometrytype);
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
      if (form) {
        GUI.closeForm(form);
        this.form = null;
      }
      //distruggo l'edit buffer
      this._editBuffer.destroy();
      //lo setto a null
      this._editBuffer = null;
      //rimuovo i listeners
      this.removeAllListeners();
      //rimuovo il layer dalla mappa
      this.removeEditingLayerFromMap();
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
  GUI.closeForm();
  GUI.setModal(false);
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
// funzione che prende le feature nuove, aggiornate e cancellate
//dall'edit buffer
proto.getEditedFeatures = function(){
  var modifiedFids = this._editBuffer.collectFeatureIds();
  var lockIds = this.getFeatureLockIdsForFeatureIds(modifiedFids);
  return {
    add: this._editBuffer.collectFeatures('new',true),
    update: this._editBuffer.collectFeatures('updated',true),
    delete: this._editBuffer.collectFeatures('deleted',true),
    //relations: this._editBuffer.collectRelationsAttributes(),
    relationsedits: this.collectRelations(),
    lockids: lockIds
  }
};
// chiama la funzione collecRelations dell'edit buffer
// in modo tale da collezionare tutte le informazioni
// relative all'edit buffer sulle relazioni
proto.collectRelations = function() {
  relationsEdits = this._editBuffer.collectRelations();
  return relationsEdits;
};
// viene chamato quando si preme ad esempio Salva sul Form degli
// attributi di una
proto.setFieldsWithValues = function(feature,fields,relations){
  var attributes = {};
  _.forEach(fields,function(field){
    attributes[field.name] = field.value;
  });

  feature.setProperties(attributes);
  this._editBuffer.updateFields(feature,relations);
  if (relations) {
    this._vectorLayer.setRelationsData(feature.getId(),relations);
  }
};
//funzione che in base alla feature passata recupera le relazioni associata ad essa
proto.getRelationsWithValues = function(feature) {
  var fid = feature.getId();
  //verifica se il layer ha relazioni
  // restituisce il valore del campo _relation (se esiste è un array) del vectorLayer
  if (this._vectorLayer.hasRelations()) {
    var fieldsPromise;
    // se non ha fid vuol dire che è nuovo e senza attributi, quindi prendo i fields vuoti
    if (!fid) {
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
        fieldsPromise = this._vectorLayer.getRelationsWithValues(fid);
      }
    }
    // se invece è una feature già presente e quindi non nuova
    // verifico se ha dati delle relazioni già  editati
    else {
      var hasEdits = this._editBuffer.hasRelationsEdits(fid);
      if (hasEdits){
        var relationsEdits = this._editBuffer.getRelationsEdits(fid);
        var relations = this._vectorLayer.getRelations();
        _.forEach(relations,function (relation) {
          relation.elements = _.cloneDeep(relationsEdits[relation.name]);
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
    // nel caso di nessuna relazione risolvo la promise
    // passando il valore null
    fieldsPromise = resolve(null);
  }
  return fieldsPromise;
};

proto.createRelationElement = function(relation) {
  var element = {};
  element.fields = _.cloneDeep(this._vectorLayer.getRelationFields(relation));
  element.id = this.generateId();
  element.state = 'NEW';
  return element;
};

proto.getRelationPkFieldIndex = function(relationName) {
  return this._vectorLayer.getRelationPkFieldIndex(relationName);
};

proto.getField = function(name, fields) {
  var fields = fields || this.getVectorLayer().getFieldsWithValues();
  var field = null;
  _.forEach(fields, function(f) {
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

proto.onafter = function(setter, listener, priority) {
  this._onaftertoolaction(setter, listener, priority);
};

// permette di inserire un setter listener sincrono prima che venga effettuata una operazione da un tool (es. addfeature)
proto.onbefore = function(setter, listener, priority) {
  this._onbeforetoolaction(setter, listener, false, priority);
};

// come onbefore() ma per listener asincroni
proto.onbeforeasync = function(setter, listener, priority) {
  this._onbeforetoolaction(setter, listener, true, priority);
};

proto._onaftertoolaction = function(setter,listener,priority) {
  priority = priority || 0;
  if (!_.get(this._setterslisteners.after,setter)) {
    this._setterslisteners.after[setter] = [];
  }
  this._setterslisteners.after[setter].push({
    fnc: listener,
    priority: priority
  });
};

proto._onbeforetoolaction = function(setter, listener, async, priority) {
  priority = priority || 0;
  if (!_.get(this._setterslisteners.before, setter)){
    this._setterslisteners.before[setter] = [];
  }
  this._setterslisteners.before[setter].push({
    fnc: listener,
    how: async ? 'async' : 'sync',
    priority: priority
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
          tool.onbefore(setter, listener.fnc, listener.priority);
        }
        else {
          tool.onbeforeasync(setter, listener.fnc, listener.priority);
        }
      })
    }
  });
  //come sopra ma per gli onafter
  _.forEach(this._setterslisteners.after, function(listeners,setter) {
    if (_.hasIn(tool.setters, setter)) {
      _.forEach(listeners,function(listener) {
        tool.onafter(setter,listener.fnc, listener.priority);
      })
    }
  })
};
// metodo add Feature che non fa alto che aggiungere la feature al buffer
proto.addFeature = function(feature) {
  console.log('editor addFeature');
  this._editBuffer.addFeature(feature);
};
// non fa aalctro che aggiornare la feature del buffer
proto.updateFeature = function(feature) {
  this._editBuffer.updateFeature(feature);
};
// non fa altro che cancellare la feature dall'edit buffer
proto.deleteFeature = function(feature, relations, isNew) {
  this._editBuffer.deleteFeature(feature, relations);
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
// funzione setDirty dell'editor che fa si che questo possa emettere
// l'evento dirty in questo modo psso fare qualcosa quando è stata fatta una modifica
// nei layers dell'editor
proto._setDirty = function(bool) {
  console.log('et Dirty');
  // se non specificato lo setto a vero
  if (_.isNil(bool)) {
    this._dirty = true;
  }
  else {
    this._dirty = bool;
  }
  // emetto l'evento dirty dell'editor
  this.emit("dirty",this._dirty);
};

proto._askConfirmToDeleteEditingListener = function() {
  var self = this;
  this.onbeforeasync('deleteFeature', function(feature, isNew, next) {
   self._deleteFeatureDialog(next);
  });
};

proto._deleteFeatureDialog = function(next) {
  GUI.dialog.confirm("Vuoi eliminare l'elemento selezionato?",function(result) {
    next(result);
  });
};

// apre form attributi per i  nserimento
proto._setupAddFeatureAttributesEditingListeners = function() {
  var self = this;
  this.onbeforeasync('addFeature', function(feature, next) {
    console.log('listener addFaeture');
    self._openEditorForm('new', feature, next);
  }, 100);
};

// apre form attributi per editazione
proto._setupEditAttributesListeners = function() {
  var self = this;
  this.onbeforeasync('pickFeature',function(feature,next){
    self._openEditorForm('old',feature,next);
  });
};

proto._openEditorForm = function(isNew, feature, next) {
  var self = this;
  var vectorLayer = this.getVectorLayer();
  var fields = vectorLayer.getFieldsWithValues(feature);
  // nel caso qualcuno, durante la catena di setterListeners,
  // abbia settato un attributo (solo nel caso di un nuovo inserimento)
  // usato ad esempio nell'editing delle strade, dove viene settato in fase di
  // inserimento/modifica il codice dei campi nod_ini e nod_fin
  var pk = vectorLayer.pk;
  if (pk && _.isNull(this.getField(pk))){
    _.forEach(feature.getProperties(),function(value,attribute){
      var field = self.getField(attribute,fields);
      if(field){
        field.value = value;
      }
    });
  }
  var relationsPromise = this.getRelationsWithValues(feature);
  relationsPromise
    .then(function(relations){
      form = new self._formClass({
        provider: self,
        name: "Edita attributi "+vectorLayer.name,
        id: "attributes-edit-"+vectorLayer.name,
        dataid: vectorLayer.name,
        vectorLayer: vectorLayer,
        pk: vectorLayer.pk,
        isnew: self.isNewFeature(feature.getId()),
        fields: fields,
        relations: relations,
        editor: self,
        buttons:[
          {
            title: "Salva",
            type: "save",
            class: "btn-danger",
            cbk: function(fields, relations){
              self.setFieldsWithValues(feature, fields, relations);
              if (next){
                next(true);
              }
              GUI.setModal(false);
            }
          },
          {
            title: "Cancella",
            type: "cancel",
            class: "btn-primary",
            cbk: function() {
              if (next) {
                next(false);
              }
              GUI.setModal(false);
            }
          }
        ]
      });
      GUI.showForm(form,{
        modal: true,
        closable: false
      });
    })
    .fail(function() {
      if (next){
        next(false);
      }
      GUI.setModal(false);
    })
};

module.exports = Editor;