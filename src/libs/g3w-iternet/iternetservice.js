var inherit = require('g3w/core/utils').inherit;
var resolvedValue = require('g3w/core/utils').resolvedValue;
var rejectedValue = require('g3w/core/utils').rejectedValue;
var G3WObject = require('g3w/core/g3wobject');
var ProjectService = require('g3w/core/projectservice');
var MapService = require('g3w/core/mapservice');
var VectorLayer = require('g3w/core/vectorlayer');

var GUI = require('g3w/gui/gui');


var Editor = require('./editors/editor');
var AttributesEditor = require('./editors/attributeseditor');
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
    style: {
      image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({
          color: '#ffcc33'
        })
      })
    }
  };
  this._layers[layerCodes.GIUNZIONI] = {
    layerCode: layerCodes.GIUNZIONI,
    vector: null,
    editor: null,
    style: {
      image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({
          color: '#0000ff'
        })
      })
    }
  };
  this._layers[layerCodes.STRADE] = {
    layerCode: layerCodes.STRADE,
    vector: null,
    editor: null,
    style: {
      stroke: new ol.style.Stroke({
        width: 3,
        color: '#ff7d2d'
      })
    }
  };
  
  this.state = {
    editingEnabled: false,
    editingOn: false,
    editingToolRunning: {
      layerCode: null,
      toolType: null
    },
    retrievingData: false
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
    if (this.state.editingEnabled && !this.state.editingOn){
      this._startEditing();
    }
    else if (this.state.editingOn) {
      this._stopOrSave();
    }
  };
  
  // avvia uno dei tool di editing tra quelli supportati da Editor (addfeature, ecc.)
  /*this.toggleEditTool = function(layerCode,toolType){
    var layer = this._layers[layerCode];
    if (layer) {
      var currentEditingLayerCode = this._getCurrentEditingLayerCode();
      var currentEditLayer = this._layers[currentEditingLayerCode];
      
      // se sto chiedendo di editare un layer diverso da quello attualmente in editing
      if (layerCode != currentEditingLayerCode) {
        // provo a stoppare l'EDITOR (NON SOLO IL TOOL) già attivo, se no non vado avanti
        if (currentEditLayer){
          this._stopOrSave(currentEditLayer.editor);
        }
      }
      // avvio quindi il tool richiesto
      if (this._getCurrentEditingToolType() != toolType){
        // se l'EDITOR non è ancora avviato lo avvio
        if (!layer.editor.isStarted()){
          layer.editor.start();
          this._setupEditToolsListeners(layerCode);
        }
        if(layer.editor.setTool(toolType)){
          this._setEditinToolRunning(layerCode,toolType);
        }
      }
      // oppure SALVO/STOPPO l'EDITOR e fine
      else{
        this._stopOrSave(currentEditLayer.editor);
      }
    }
  };*/
  
  // avvia uno dei tool di editing tra quelli supportati da Editor (addfeature, ecc.)
  this.toggleEditTool = function(layerCode,toolType){
    var layer = this._layers[layerCode];
    if (layer) {
      var currentEditingLayerCode = this._getCurrentEditingLayerCode();
      var currentEditingToolType = this._getCurrentEditingToolType();
      
      // se si sta chiedendo lo stesso editor
      if (layerCode == currentEditingLayerCode){
        // e lo stesso tool allora disattivo l'editor (untoggle)
        if (toolType == currentEditingToolType){
          if(layer.editor.stop()){
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
        var canStart = true;
        // nel caso sia già attivo un editor verifico di poterlo stoppare
        if (currentEditingLayerCode){
          var currentLayer = this._layers[currentEditingLayerCode];
          if (!currentLayer.editor.stop()){
            canStart = false;
          }
        }
        if (canStart){
          // avvio l'editor 
          layer.editor.start();
          // e registro i listeners
          this._setupEditToolsListeners(layerCode);
          if(layer.editor.setTool(toolType)){
            this._setEditinToolRunning(layerCode,toolType);
          }
        }
      }
    }
  };
  
  // fermo tutti gli eventuali editor accesi
  this.stopEditTools = function(){
    var canStop = true;
    var self = this;
    _.forEach(this._layers,function(layer){
      var _canStop = true;
      if (layer.editor && layer.editor.isStarted()){
        _canStop = layer.editor.stop()
        canStop = canStop && _canStop;
      }
    })
    if (canStop) {
      self._setEditinToolRunning();
    }
    return canStop;
  };
  
  this.getLayerCodes = function(){
    return _.values(this.layerCodes);
  };
  
  
  /* METODI PRIVATI */
  
  this._startEditing = function(){
    try {
      this.state.retrievingData = true;
      this._setupVectors()
      .then(function(data){
        // se tutto è andato a buon fine aggiungo i VectorLayer alla mappa
        self._addToMap();
        self.state.editingOn = true;
      })
    }
    catch(e) {
      console.log(e);
      this.state.retrievingData = false;
    }
  };
  
  this._stopEditing = function(){
    // se posso stoppare tutti gli editor...    
    if (this.stopEditTools()){
      _.forEach(this._layers,function(layer, layerCode){
        var vector = layer.vector;
        MapService.viewer.removeLayerByName(vector.name);
        layer.vector= null;
      });
      self.state.editingOn = false;
    }
  };
  
  this._stopOrSave = function(editor){
    var self = this;
    var choice = "cancel";
    
    var dirtyEditors = {};
    _.forEach(this._layers,function(layer,layerCode){
      if (layer.editor.isDirty()){
        dirtyEditors[layerCode] = layer.editor;
      }
    });

    if(_.keys(dirtyEditors).length){
      GUI.dialog.dialog({
        message: "Vuoi salvare definitivamente le modifiche?",
        title: "Salvataggio modifica",
        buttons: {
          save: {
            label: "Salva",
            className: "btn-danger",
            callback: function(){
              self._saveAndStop(dirtyEditors)
            }
          },
          cancel: {
            label: "Annulla",
            className: "btn-primary",
            callback: function(){}
          }
        }
      });
    }
    else {
      this._stopEditing();
    }
  };
  
  this._saveAndStop = function(dirtyEditors){
    var editsToPush = {};
    _.forEach(dirtyEditors,function(editor,layerCode){
      var editedFeatures = editor.getEditedFeatures();
      editsToPush[layerCode] = editedFeatures;
    })
    console.log(editsToPush);
    console.log("Wants to save");
    this._stopEditing();
    
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
    var fid = feature.getId();
    var fields = self._layers[layerCode].editor.getFieldsWithAttributes(fid);
    var relationsPromise = self._layers[layerCode].editor.getRelationsWithAttributes(fid);
    relationsPromise
    .then(function(relations){
      var form = new Form({
        name: "Edita attributi "+layerCode,
        id: "attributes-edit-"+layerCode,
        dataid: layerCode,
        pk: self._layers[layerCode].vector.pk,
        fields: fields,
        relations: relations,
        buttons:[
          {
            title: "Salva",
            class: "btn-danger",
            cbk: function(fields,relations){
              self._layers[layerCode].editor.setFieldsWithAttributes(feature,fields,relations);
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
    $.get("/it/iternet/api/editing/"+layerConfig.name+"/?config")
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
    $.get("/it/iternet/api/editing/"+layerConfig.name+"/?editing&in_bbox="+bbox[0]+","+bbox[1]+","+bbox[2]+","+bbox[3])
    .done(function(data){
      d.resolve(data);
    })
    .fail(function(){
      d.reject();
    })
    return d.promise();
  };
  
  this._createVector = function(options,data){
    var vector = new VectorLayer(options);
    return vector;
  };
}
inherit(IternetService,G3WObject);

module.exports = new IternetService;
