var inherit = require('g3w/core/utils').inherit;
var G3WObject = require('g3w/core/g3wobject');
var ProjectService = require('g3w/core/projectservice');
var MapService = require('g3w/core/mapservice');
var VectorLayer = require('g3w/core/vectorlayer');

var GUI = require('g3w/gui/gui');
var FormPanel = require('g3w/gui/formpanel');

var Editor = require('./editors/editor');
var AttributesEditor = require('./editors/attributeseditor');

function IternetService(){
  var self = this;
  this._editors = {};
  
  MapService.on('viewerset',function(){
  })
  
  this._runningEditor = null;
  
  var layerCodes = this.layerCodes = {
      ACCESSI: 'accessi',
      GIUNZIONI: 'giunzioni',
      STRADE: 'strade'
  };
  
  this._layers = {};
  this._layers[layerCodes.ACCESSI] = {
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
    vector: null,
    editor: null,
    style: {
      image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({
          color: '#2ba2ba'
        })
      })
    }
  };
  this._layers[layerCodes.STRADE] = {
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
      if (this.stopEditTools()){
        this._stopEditing();
      }
    }
  };
  
  // avvia uno dei tool di editing tra quelli supportati da Editor (addfeature, ecc.)
  this.startEditTool = function(layerCode,toolType){
    var layer = this._layers[layerCode];
    if (layer) {
      this.stopEditTools();
      if (layer.editor.start(toolType)){
        this._setEditinToolRunning(layerCode,toolType);
        this.__test__();
        return true;
      }
    }
    return false;
  };
  
  // fermo l'editor di un layer specifico
  this.stopEditTool = function(layerCode){
    var layer = this._layers[layerCode];
    if (layer) {
      if (layer.editor.stop()){
        this._setEditinToolRunning();
        return true;
      }
    }
    return false;
  };
  
  // fermo tutti gli eventuali editor accesi
  this.stopEditTools = function(){
    var canStop = true;
    var self = this;
    _.forEach(this._layers,function(layer){
      var _canStop = true;
      if (layer.editor && layer.editor.isRunning()){
        _canStop = layer.editor.stop()
        canStop = canStop && _canStop;
      }
    })
    if (canStop) {
      self._setEditinToolRunning();
    }
    return canStop;
  };
  
  this.__test__ = function(){
    self._layers.accessi.editor.onbeforeasync('addFeature',function(feature,next){
      var tool = this;
      console.log("Prima di aggiungere una nuova feature...");
      if (tool.isPausable){
        tool.pause();
      }
      var form = new FormPanel();
      GUI.showForm(form);
      setTimeout(function(){
        if (tool.isPausable){
          tool.pause(false);
        }
      },2000)
      /*var attreditor = new(AttributesEditor);
      attreditor.editFeature(feature)
      .done(function(){
        next()
      })
      .fail(function(){
        next(false);
      });*/
      next();
    });
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
        self.emit("editingstarted");
        self.state.editingOn = true;
      })
    }
    catch(e) {
      console.log(e);
      this.state.retrievingData = false;
    }
  };
  
  this._stopEditing = function(){
    _.forEach(this._layers,function(layer, layerCode){
      var vector = layer.vector;
      MapService.viewer.removeLayerByName(vector.name);
      layer.vector= null;
    });
    if (this._runningEditor) {
      this._runningEditor.stop();
      this._runningEditor = null;
    }
    self.state.editingOn = false;
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
        var fields = self._getLayerFields(layerCode,layerWithConfig);
        vectorLayer.setFields(fields);
        // setto lo stile del layer OL
        vectorLayer.setStyle(self._layers[layerCode].style);
        // inserisco i dati delle feature
        vectorLayer.setData(vector.data,vector.format);
        
        // istanzio l'editor
        var editor = new Editor;
        editor.setVectorLayer(vectorLayer);
        // e lo metto nella configurazione globale
        self._layers[layerCode].editor = editor;
      })
      self.state.retrievingData = false;
    })
    .fail(function(){
      self.state.retrievingData = false;
    })
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
  
  // genera la struttura dei fields richiesti da VectorLayer
  this._getLayerFields = function(layerCode,layerWithConfig){
    var layerId = self.config.layers[layerCode].id;
    var attributes = ProjectService.getLayerAttributes(layerId);
    var inputsConfig = layerWithConfig.vector.inputs;
    var inputsConfigByName = _.keyBy(inputsConfig,'name');
    var fields = [];
    _.forEach(attributes,function(attribute){
      var field = {};
      var nativeType = attribute.type;
      var type = null;
      
      // mappatura tipo di attributo hard coded per ITERNET
      if (nativeType == 'INTEGER'){
        type = 'integer';
      }
      else if (nativeType.indexOf("VARCHAR") > -1){
        type = 'string';
      }
      
      // se il tipo di campo è riconosciuto
      if (type){
        field.type = type;
        field.name = attribute.name;
        var inputConfig = inputsConfigByName[field.name];
        var input = {};
        input.type = null;
        if (inputConfig && inputConfig.inputType){
          input.type = inputConfig.inputType;
          input.options = {};
          if (inputConfig.inputType == 'select'){
            var list = []
            _.forEach(inputConfig.values,function(value){
              list.push({
                key: value.key,
                value: value.value
              });
            })
            input.options.values = list;
          }
        }
        input.label = (inputConfig && inputConfig.label) ? inputConfig.label : field.name;
        
        field.input = input;
        fields.push(field);
      }
    }); 
    return fields;
  };
}
inherit(IternetService,G3WObject);

module.exports = new IternetService;
