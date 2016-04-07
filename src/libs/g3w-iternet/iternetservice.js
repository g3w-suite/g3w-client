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
    self._editors = {
      accessi: new Editor,
      giunzioni: new Editor,
      strade: new Editor
    };
    // test listener su transizione editor
    self._editors.accessi.onbeforeasync('addFeature',function(feature,next){
        console.log("Prima di aggiungere una nuova feature...");
        var form = new FormPanel();
        GUI.showForm(form);
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
  })
  
  this._runningEditor = null;
  
  var vectors = {
    accessi: null,
    giunzioni: null,
    strade: null
  };
  
  var editingConstraints = {
    resolution: 1
  }
  
  this.state = {
    editingEnabled: false,
    editingOn: false,
    retrievingData: false
  };
  
  MapService.onafter('setResolution',function(resolution){
    self.state.editingEnabled = (resolution < editingConstraints.resolution) ? true : false;
  });
  
  this.init = function(config){
    this.config = config;
  };
  
  this.togglEditing = function(){
    if (this.state.editingEnabled && !this.state.editingOn){
      this._startEditing();
    }
    else if (this.state.editingOn) {
      this._stopEditing();
    }
  };
  
  this.addPoint = function(){
    if (this.state.editingOn) {
      var editor = self._editors.accessi;
      this._runningEditor = editor;
      var editor = self._editors.accessi;
      editor.setVector(vectors.accessi);
      editor.start('addfeature');
      return true;
    }
  };
  
  this._startEditing = function(){
    this._getData()
    .then(function(data){
      self._addToMap();
      self.emit("editingstarted");
      self.state.editingOn = true;
    })
  };
  
  this._stopEditing = function(){
    _.forEach(vectors,function(vector, key){
      MapService.viewer.removeLayerByName(vector.name);
      delete vector;
      vectors[key]= null;
    });
    if (this._runningEditor) {
      this._runningEditor.stop();
      this._runningEditor = null;
    }
    self.state.editingOn = false;
  };
  
  this._addToMap = function(){
    var map = MapService.viewer.map;

    vectors.strade.addToMap(map);
    vectors.giunzioni.addToMap(map);
    vectors.accessi.addToMap(map);
  };
  
  this._getData = function(){
    this.state.retrievingData = true;
    return $.when(
      self._getLayerData(self.config.layers.accessi),
      self._getLayerData(self.config.layers.giunzioni),
      self._getLayerData(self.config.layers.strade)
    )
    .then(function(accessi,giunzioni,strade){
      var layerStrade = self.config.layers.strade;
      var vectorStrade = vectors.strade = self._createVector({
        geometrytype: strade.vector.geometrytype,
        format: strade.format,
        crs: "EPSG:3003",
        id: layerStrade.id,
        name: layerStrade.name,        
      });
      var fields = self._getLayerFields('strade');
      vectorStrade.setFields(fields);
      vectorStrade.setStyle({
        stroke: new ol.style.Stroke({
          width: 3,
          color: '#ff7d2d'
        })
      });
      vectorStrade.setData(strade.vector.data,strade.vector.format);
      var layerAccessi = self.config.layers.accessi;
      var vectorAccessi = vectors.accessi = self._createVector({
        geometrytype: accessi.vector.geometrytype,
        format: accessi.format,
        crs: "EPSG:3003",
        id: layerAccessi.id,
        name: layerAccessi.name
      });
      var fields = self._getLayerFields('accessi');
      vectorAccessi.setFields(fields);
      vectorAccessi.setStyle({
        image: new ol.style.Circle({
          radius: 5,
          fill: new ol.style.Fill({
            color: '#ffcc33'
          })
        })
      });
      vectorAccessi.setData(accessi.vector.data,accessi.vector.format);
      var layerGiunzioni = self.config.layers.giunzioni;
      var vectorGiunzioni = vectors.giunzioni = self._createVector({
        geometrytype: giunzioni.vector.geometrytype,
        format: giunzioni.format,
        crs: "EPSG:3003",
        id: layerGiunzioni.id,
        name: layerGiunzioni.name
      });
      var fields = self._getLayerFields('giunzioni');
      vectorGiunzioni.setFields(fields);
      vectorGiunzioni.setStyle({
        image: new ol.style.Circle({
          radius: 5,
          fill: new ol.style.Fill({
            color: '#2ba2ba'
          })
        })
      });
      vectorGiunzioni.setData(giunzioni.vector.data,giunzioni.vector.format);
      self.state.retrievingData = false;
    })
    .fail(function(){
      self.state.retrievingData = false;
    })
  };
  
  this._createVector = function(options,data){
    var vector = new VectorLayer(options);
    return vector;
  };
  
  this._getLayerData = function(layerConfig){
    var d = $.Deferred();
    var bbox = MapService.state.bbox;
    $.get("/it/iternet/api/editing/"+layerConfig.name+"/?in_bbox="+bbox[0]+","+bbox[1]+","+bbox[2]+","+bbox[3])
    .done(function(data){
      d.resolve(data);
    })
    .fail(function(){
      d.reject();
    })
    return d.promise();
  };
  
  this._getLayerFields = function(layerCode){
    var layerConfig = self.config.layers[layerCode];
    var attributes = ProjectService.getLayerAttributes(layerConfig.id);
    var formFields = self.config.forms[layerCode].fields;
    var formFieldsByName = _.keyBy(formFields,'name');
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
        var formField = formFieldsByName[field.name];
        var input = {};
        input.type = null;
        if (formField && formField.inputType){
          input.type = formField.inputType;
          input.options = {};
          if (formField.inputType == 'select'){
            var list = []
            _.forEach(formField.values,function(value){
              list.push({
                key: value[0],
                value: value[1]
              });
            })
            input.options.values = list;
          }
        }
        input.label = (formField && formField.label) ? formField.label : field.name;
        
        field.input = input;
        fields.push(field);
      }
    }); 
    return fields;
  };
}
inherit(IternetService,G3WObject);

module.exports = new IternetService;
