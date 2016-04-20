var inherit = require('g3w/core/utils').inherit;
var resolvedValue = require('g3w/core/utils').resolvedValue;
var rejectedValue = require('g3w/core/utils').rejectedValue;
var G3WObject = require('g3w/core/g3wobject');
var ProjectService = require('g3w/core/projectservice');
var MapService = require('g3w/core/mapservice');
var VectorLayer = require('g3w/core/vectorlayer');

var GUI = require('g3w/gui/gui');


var Editor = require('./editors/editor');
var Form = require('./attributesform');

function IternetService(){
  var self = this;
  
  this._runningEditor = null;
  
  var layerCodes = this.layerCodes = {
    STRADE: 'strade',
    GIUNZIONI: 'giunzioni',
    ACCESSI: 'accessi' 
  };
  
  this._layers = {};
  this._layers[layerCodes.ACCESSI] = {
    layerCode: layerCodes.ACCESSI,
    vector: null,
    editor: null,
    ol3ListenersKeys: [],
    style: function(feature){
      var color = '#d9b581';
      switch (feature.get('tip_acc')){
        case "0101":
          color = '#d9b581';
          break;
        case "0102":
          color = '#d9bc29';
          break;
        case "0501":
          color = '#68aad9';
          break;
        default:
          color = '#d9b581';
      }
      return [
        new ol.style.Style({
          image: new ol.style.Circle({
            radius: 5,
            fill: new ol.style.Fill({
              color: color
            })
          })
        })
      ]
    }
  };
  this._layers[layerCodes.GIUNZIONI] = {
    layerCode: layerCodes.GIUNZIONI,
    vector: null,
    editor: null,
    ol3ListenersKeys: [],
    style: new ol.style.Style({
      image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({
          color: '#0000ff'
        })
      })
    })
  };
  this._layers[layerCodes.STRADE] = {
    layerCode: layerCodes.STRADE,
    vector: null,
    editor: null,
    ol3ListenersKeys: [],
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({
        width: 3,
        color: '#ff7d2d'
      })
    })
  };
  
  this.state = {
    editingEnabled: false,
    editingOn: false,
    editingToolRunning: {
      layerCode: null,
      toolType: null
    },
    retrievingData: false,
    hasEdits: false
  };
  
  // vincoli alla possibilità di attivare l'editing
  var editingConstraints = {
    resolution: 1 // vincolo di risoluzione massima
  }
  
  MapService.onafter('setResolution',function(resolution){
    self.state.editingEnabled = (resolution < editingConstraints.resolution) ? true : false;
  });
  
  this.init = function(config){
    this.config = config;
  };
  
  // avvio o termino la sessione di editing generale
  this.togglEditing = function(){
    var self = this;
    if (this.state.editingEnabled && !this.state.editingOn){
      this._startEditing();
    }
    else if (this.state.editingOn) {
      this._cancelOrSave()
      .then(function(){
        self._stopEditing();
      });
    }
  };
  
  this.saveEdits = function(){
    this._cancelOrSave(2);
  };
  
  // avvia uno dei tool di editing tra quelli supportati da Editor (addfeature, ecc.)
  this.toggleEditTool = function(layerCode,toolType){
    var self = this;
    var layer = this._layers[layerCode];
    if (layer) {
      var currentEditingLayerCode = this._getCurrentEditingLayerCode();
      var currentEditingToolType = this._getCurrentEditingToolType();
      
      // se si sta chiedendo lo stesso editor
      if (layerCode == currentEditingLayerCode){
        // e lo stesso tool allora disattivo l'editor (untoggle)
        if (toolType == currentEditingToolType){
          if(layer.editor.stopTool()){
            this._setEditinToolRunning();
          }
        }
        // altrimenti attivo il tool richiesto
        else {
          if(layer.editor.setTool(toolType)){
            this._setEditinToolRunning(layerCode,toolType);
          }
        }
      }
      // altrimenti
      else {
        // nel caso sia già attivo un editor verifico di poterlo stoppare
        if (currentEditingLayerCode){
          var currentLayer = this._layers[currentEditingLayerCode];
          // se la terminazione dell'editing sarà andata a buon fine, setto il tool
          // provo a stoppare
          this._cancelOrSave(2)
          .then(function(){
            if(currentLayer.editor.stop()){
              self._startEditTool(layerCode,toolType);
            }
          })
        }
        else {
          this._startEditTool(layerCode,toolType);
        }
      }
    }
  };  
  
  this.getLayerCodes = function(){
    return _.values(this.layerCodes);
  };
  
  /* METODI PRIVATI */
  
  this._startEditing = function(){
    //try {
      this.state.retrievingData = true;
      this._setupVectors()
      .then(function(data){
        // se tutto è andato a buon fine aggiungo i VectorLayer alla mappa
        self._addToMap();
        self.state.editingOn = true;
        self.emit("editingstarted");
      })
    //}
    /*catch(e) {
      console.log(e);
      this.state.retrievingData = false;
    }*/
  };
  
  this._startEditTool = function(layerCode,toolType){
    //rimuovo eventuali listeners OL3
    var currentIternetLayer = this._layers[this._getCurrentEditingLayerCode()];
    if(currentIternetLayer){
      this._clearLayerOl3Listeners(currentIternetLayer);
    }
    
    var layer = this._layers[layerCode];
    // avvio l'editor 
    layer.editor.start();
    // e registro i listeners
    this._setupEditToolsListeners(layerCode);
    if(layer.editor.setTool(toolType)){
      this._setEditinToolRunning(layerCode,toolType);
    }
  };
  
  this._stopEditing = function(reset){
    // se posso stoppare tutti gli editor...    
    if (this._stopEditors(reset)){
      _.forEach(this._layers,function(layer, layerCode){
        var vector = layer.vector;
        MapService.viewer.removeLayerByName(vector.name);
        layer.vector= null;
        self._unlockLayer(self.config.layers[layerCode]);
      });
      self.state.editingOn = false;
      self.emit("editingstopped");
    }
  };
  
  // fermo tutti gli eventuali editor accesi
  this._stopEditors = function(reset){
    var canStop = true;
    var self = this;
    _.forEach(this._layers,function(layer){
      var _canStop = true;
      if (layer.editor && layer.editor.isStarted()){
        _canStop = layer.editor.stop(reset)
        canStop = canStop && _canStop;
      }
    })
    if (canStop) {
      self._setEditinToolRunning();
    }
    return canStop;
  };
  
  this._clearLayerOl3Listeners = function(layerCode){
    var layer = this._layers[layerCode];
    _.forEach(layer.ol3ListenersKeys,function(listenerKey){
      ol.Observable.unByKey(listenerKey);
    });
    layer.ol3ListenersKeys = [];
  };
  
  this._trackOl3Listeners = function(layerCode,listenerKey){
    var layer = this._layers[layerCode];
    layer.ol3ListenersKeys.push(listenerKey);
  };
  
  this._cancelOrSave = function(type){
    var deferred = $.Deferred();
    // per sicurezza tengo tutto dentro un grosso try/catch, per non rischiare di provocare inconsistenze nei dati durante il salvataggio
    try {
      var _askType = 1;
      if (type){
        _askType = type
      }
      var self = this;
      var choice = "cancel";
      var dirtyEditors = {};
      _.forEach(this._layers,function(layer,layerCode){
        if (layer.editor.isDirty()){
          dirtyEditors[layerCode] = layer.editor;
        }
      });

      if(_.keys(dirtyEditors).length){
        this._askCancelOrSave(_askType).
        then(function(action){
          if (action === 'save'){
            self._saveEdits(dirtyEditors).
            then(function(result){
              deferred.resolve();
            })
            .fail(function(result){
              deferred.reject();
            })
          }
          else if (action == 'nosave') {
            deferred.resolve();
          }
          else if (action == 'cancel') {
            deferred.reject();
          }
        })
      }
      else {
        deferred.resolve();
      }
    }
    catch (e) {
      deferred.reject();
    }
    return deferred.promise();
  };
  
  this._askCancelOrSave = function(type){
    var deferred = $.Deferred();
    var buttonTypes = {
      SAVE: {
        label: "Salva",
        className: "btn-success",
        callback: function(){
          deferred.resolve('save');
        }
      },
      NOSAVE: {
        label: "Termina senza salvare",
        className: "btn-danger",
        callback: function(){
          deferred.resolve('nosave');
        }
      },
      CANCEL: {
        label: "Annulla",
        className: "btn-primary",
        callback: function(){
          deferred.resolve('cancel');
        }
      }
    };
    switch (type){
      case 1:
        buttons = {
          save: buttonTypes.SAVE,
          nosave: buttonTypes.NOSAVE,
          cancel: buttonTypes.CANCEL
        };
        break;
      case 2:
       buttons = {
          save: buttonTypes.SAVE,
          cancel: buttonTypes.CANCEL
        };
        break;
    }
    GUI.dialog.dialog({
        message: "Vuoi salvare definitivamente le modifiche?",
        title: "Salvataggio modifica",
        buttons: buttons
      });
    return deferred.promise();
  };
  
  this._saveEdits = function(dirtyEditors){
    var deferred = $.Deferred();
    this._sendEdits(dirtyEditors)
    .then(function(){
      GUI.notify.success("I dati sono stati salvati correttamente"); 
      self._commitEdits(dirtyEditors);
      MapService.refreshMap();
      deferred.resolve();
    })
    .fail(function(errors){
      GUI.notify.error("Errore nel salvataggio sul server"); 
      deferred.resolve();
    })
    return deferred.promise();
  };
  
  this._sendEdits = function(dirtyEditors){
    var self = this;
    var deferred = $.Deferred();
    var postRequests = [];
    _.forEach(dirtyEditors,function(editor,layerCode){
      var postRequest = self._sendEditsForLayer(editor,layerCode);
      postRequests.push(postRequest);
    });
    
    $.when.apply(this,postRequests)
    .then(function(){
      // nel caso when sia stato chiamato con richieste multiple, l'argomento è l'array dei ritorni (a loro volta array) delle singole richieste
      if(postRequests.length>1){
        var postRequestReturns = Array.prototype.slice.call(arguments);
        var allResultsOk = _.reduce(postRequestReturns,function(ok,postRequestReturn){
          var result = postRequestReturn[0];
          var _ok = ok && result.result;
          return _ok;
        });
      }
      // altrimenti l'array E' il ritorno (come array) della singola richiesta
      else {
        allResultsOk = arguments[0].result;
      }
      
      if(allResultsOk){
        deferred.resolve();
      }
      else {
        deferred.reject([]);
      }
    })
    .fail(function(e){
      deferred.reject([]);
    });
    return deferred.promise();
  };
  
  this._sendEditsForLayer = function(editor,layerCode){
    editsToPush = editor.getEditedFeatures();
    //console.log(editsToPush);
    return this._postData(self.config.layers[layerCode],editsToPush)
  };
  
  this._commitEdits = function(editors){
    _.forEach(editors,function(editor){
      editor.commit();
    });
  };
  
  this._undoEdits = function(dirtyEditors){
    var currentEditingLayerCode = this._getCurrentEditingLayerCode();
    var editor = dirtyEditors[currentEditingLayerCode];
    this._stopEditing(true);
  };
  
  this._getCurrentEditingLayerCode = function(){
    return this.state.editingToolRunning.layerCode;
  };
  
  this._getCurrentEditingToolType = function(){
    return this.state.editingToolRunning.toolType;
  };
  
  this._setEditinToolRunning = function(layerCode, toolType){
    if (arguments) {
      this.state.editingToolRunning.layerCode = layerCode;
      this.state.editingToolRunning.toolType = toolType;
    }
    else {
      this.state.editingToolRunning.layerCode = null;
      this.state.editingToolRunning.toolType = null;
    }
  };
  
  this._setupEditToolsListeners = function(layerCode){
    this._setupAddFeatureAttributesEditingListeners(layerCode);
    this._setupEditAttributesListeners(layerCode);
    
    if(this.layerCodes.GIUNZIONI == layerCode){
      this._setupMoveGiunzioniListener(layerCode);
    }
  };
  
  // apre form attributi per inserimento
  this._setupAddFeatureAttributesEditingListeners = function(layerCode){
    var self = this;
    self._layers[layerCode].editor.onbeforeasync('addFeature',function(feature,next){
      self._openEditorForm('new',feature,layerCode,next)
    });
  };
  
  // apre form attributi per editazione
  this._setupEditAttributesListeners = function(layerCode){
    var self = this;
    self._layers[layerCode].editor.onafter('pickFeature',function(feature){
      self._openEditorForm('old',feature,layerCode)
    });
  };
  
  this._openEditorForm = function(isNew,feature,layerCode,next){
    var editor = self._layers[layerCode].editor;
    var fid = feature.getId();
    var fields = editor.getFieldsWithAttributes(fid);
    var relationsPromise = editor.getRelationsWithAttributes(fid);
    relationsPromise
    .then(function(relations){
      var form = new Form({
        name: "Edita attributi "+layerCode,
        id: "attributes-edit-"+layerCode,
        dataid: layerCode,
        pk: self._layers[layerCode].vector.pk,
        isnew: editor.isNewFeature(feature.getId()),
        fields: fields,
        relations: relations,
        buttons:[
          {
            title: "Salva",
            class: "btn-danger",
            cbk: function(fields,relations){
              editor.setFieldsWithAttributes(feature,fields,relations);
              if (next){
                next(true);
              }
            }
          },
          {
            title: "Cancella",
            class: "btn-primary",
            cbk: function(){
              if (next){
                next(false);
              }
            }
          }
        ]
      });
      GUI.showForm(form,true);
    })
    .fail(function(){
      if (next){
        next(false);
      }
    })
  };
  
  this._setupMoveGiunzioniListener = function(layerCode){
    var self = this;
    var layer = self._layers[layerCode];
    layer.editor.on('movestart',function(feature){
      // rimuovo eventuali precedenti listeners
      self._clearLayerOl3Listeners(layerCode);
      self._startMovingGiunzione(feature,layerCode);
    });
  };
  
  this._stradeToUpdate = [];
  
  this._startMovingGiunzione = function(feature){
    var self = this;
    var giunzione = feature;
    var cod_gnz = giunzione.get('cod_gnz');
    // devo avviare l'editor delle strade
    this._stradeToUpdate = [];
    var stradeEditor = this._layers[this.layerCodes.STRADE].editor;
    var strade = this._layers[this.layerCodes.STRADE].vector.getSource().getFeatures();
    _.forEach(strade,function(strada){
      var nod_ini = strada.get('nod_ini');
      var nod_fin = strada.get('nod_fin');
      var ini = (nod_ini == cod_gnz);
      var fin = (nod_fin == cod_gnz);
      if (ini || fin){
        var initial = ini ? true : false;
        self._stradeToUpdate.push(strada);
        self._startGiunzioniStradeTopologicalEditing(giunzione,strada,initial)
      }
    })
    self._layers[this.layerCodes.GIUNZIONI].editor.once('moveend',function(feature){
      if ( self._stradeToUpdate.length){
        if (!stradeEditor.isStarted()){
          stradeEditor.start();
        }
        _.forEach( self._stradeToUpdate,function(strada){
          stradeEditor.updateFeature(strada);
        })
      }
    });
  };
  
  this._startGiunzioniStradeTopologicalEditing = function(giunzione,strada,initial){
    var stradaGeom = strada.getGeometry();
    var stradaCoords = strada.getGeometry().getCoordinates();
    var coordIndex = initial ? 0 : stradaCoords.length-1;
    var giunzioneGeom = giunzione.getGeometry();
    var listenerKey = giunzioneGeom.on('change',function(e){
      stradaCoords[coordIndex] = e.target.getCoordinates();
      stradaGeom.setCoordinates(stradaCoords);
    });
    this._trackOl3Listeners(this.layerCodes.GIUNZIONI,listenerKey);
  };
  
  this._addToMap = function(){
    var map = MapService.viewer.map;
    var layerCodes = this.getLayerCodes();
    _.forEach(layerCodes,function(layerCode){
      self._layers[layerCode].vector.addToMap(map);
    })
  };
  
  this._setupVectors = function(){
    var layerCodes = this.getLayerCodes();
    // eseguo le richieste delle configurazioni e mi tengo le promesse
    var configRequests = _.map(layerCodes,function(layerCode){
      return self._getLayerConfig(self.config.layers[layerCode]);
    });
    // eseguo le richieste de dati e mi tengo le promesse
    var dataRequests = _.map(layerCodes,function(layerCode){
      return self._getLayerData(self.config.layers[layerCode]);
    }); 
    var requests = _.concat(configRequests,dataRequests);
    // aspetto tutte le promesse
    return $.when.apply(this,requests)
    .then(function(){
      var args = Array.prototype.slice.call(arguments);
      // mi creo un oggetto avente per chiave il layerCode e per valore un array con i risultati
      // delle richieste di configurazioni nel primo elemento e i dati nel secondo
      var layersResults = _.zipObject(layerCodes,_.zip(args.slice(0,3),args.slice(3)));
      _.forEach(layersResults,function(layerResult,layerCode){
        var layerWithConfig = layerResult[0];
        var layerWithData = layerResult[1];
        var vector = layerWithData.vector;
        var layerBaseConfig = self.config.layers[layerCode];
        // instanzio il VectorLayer
        var vectorLayer = self._layers[layerCode].vector = self._createVector({
          geometrytype: vector.geometrytype,
          format: vector.format,
          crs: "EPSG:3003",
          id: layerBaseConfig.id,
          name: layerBaseConfig.name,
          pk: vector.pk  
        });
        // ottengo la definizione dei campi
        vectorLayer.setFields(layerWithConfig.vector.fields);
        
        var relations = layerWithConfig.vector.relations;
        
        if(relations){
          // per dire a vectorLayer che i dati delle relazioni verranno caricati solo quando richiesti (es. aperture form di editing)
          vectorLayer.lazyRelations = true;
          vectorLayer.setRelations(relations);
        }
        // setto lo stile del layer OL
        vectorLayer.setStyle(self._layers[layerCode].style);
        // inserisco i dati delle feature
        self._setVectorData(vectorLayer,vector.data);
        
        // istanzio l'editor
        var editor = new Editor;
        editor.on("dirty",function(dirty){
          self.state.hasEdits = dirty;
        })
        editor.setVectorLayer(vectorLayer);
        if (layerWithData.featurelocks){
          editor.setFeatureLocks(layerWithData.featurelocks);
        }
        
        // e lo metto nella configurazione globale
        self._layers[layerCode].editor = editor;
      })
      self.state.retrievingData = false;
    })
    .fail(function(){
      self.state.retrievingData = false;
    })
  };
  
  this._setVectorData = function(vectorLayer,data){
    vectorLayer.setData(data);
  };
  
  // ottiene la configurazione del vettoriale (qui richiesto solo per la definizione degli input)
  this._getLayerConfig = function(layerConfig){
    var d = $.Deferred();
    $.get(this.config.baseurl+layerConfig.name+"/?config")
    .done(function(data){
      d.resolve(data);
    })
    .fail(function(){
      d.reject();
    })
    return d.promise();
  };
  
  // ottiene il vettoriale in modalità editing
  this._getLayerData = function(layerConfig){
    var d = $.Deferred();
    var bbox = MapService.state.bbox;
    $.get(this.config.baseurl+layerConfig.name+"/?editing&in_bbox="+bbox[0]+","+bbox[1]+","+bbox[2]+","+bbox[3])
    .done(function(data){
      d.resolve(data);
    })
    .fail(function(){
      d.reject();
    })
    return d.promise();
  };
  
  this._postData = function(layerConfig,editsToPush){
    var jsonData = JSON.stringify(editsToPush);
    return $.post({
      url: this.config.baseurl+layerConfig.name+"/",
      data: jsonData,
      contentType: "application/json"
    });
  };
  
  this._unlock = function(){
    var layerCodes = this.getLayerCodes();
    // eseguo le richieste delle configurazioni e mi tengo le promesse
    var unlockRequests = _.map(layerCodes,function(layerCode){
      return self._unlockLayer(self.config.layers[layerCode]);
    });
  };
  
  this._unlockLayer = function(layerConfig){
    $.get(this.config.baseurl+layerConfig.name+"/?unlock");
  };
  
  this._createVector = function(options,data){
    var vector = new VectorLayer(options);
    return vector;
  };
}
inherit(IternetService,G3WObject);

module.exports = new IternetService;
