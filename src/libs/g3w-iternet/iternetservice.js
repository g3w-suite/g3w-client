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
  
  this._loadDataOnMapViewChangeListener = null;
  
  this._currentEditingLayer = null;
  
  this.state = {
    editing: {
      on: false,
      enabled: false,
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
  
  MapService.onafter('setMapView',function(bbox,resolution,center){
    self.state.editing.enabled = (resolution < editingConstraints.resolution) ? true : false;
  });
  
  this.init = function(config){
    this.config = config;
  };
  
  // avvio o termino la sessione di editing generale
  this.togglEditing = function(){
    var self = this;
    if (this.state.editing.enabled && !this.state.editing.on){
      this._startEditing();
    }
    else if (this.state.editing.on) {
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
      var toolOptions = this._getOptionsForEditTool(layer,toolType);
      var currentEditingLayer = this._getCurrentEditingLayer();
      
      // se si sta chiedendo lo stesso editor
      if (currentEditingLayer && layerCode == currentEditingLayer.layerCode){
        // e lo stesso tool allora disattivo l'editor (untoggle)
        if (toolType == currentEditingLayer.editor.getActiveTool().getType()){
          this._stopEditingTool();
        }
        // altrimenti attivo il tool richiesto
        else {
          this._startEditingTool(currentEditingLayer,toolType,toolOptions);
        }
      }
      // altrimenti
      else {
        // nel caso sia già attivo un editor verifico di poterlo stoppare
        if (currentEditingLayer && currentEditingLayer.editor.isStarted()){
          // se la terminazione dell'editing sarà andata a buon fine, setto il tool
          // provo a stoppare
          this._cancelOrSave(2)
          .then(function(){
            if(self._stopEditor()){
              self._startEditingTool(layer,toolType,toolOptions);
            }
          })
        }
        else {
          this._startEditingTool(layer,toolType,toolOptions);
        }
      }
    }
  };  
  
  this.getLayerCodes = function(){
    return _.values(this.layerCodes);
  };
  
  /* METODI PRIVATI */
  
  this._startEditing = function(){
    var self = this;
    //try {
      this.state.retrievingData = true;
      this._loadData()
      .then(function(data){
        // se tutto è andato a buon fine aggiungo i VectorLayer alla mappa
        self._addToMap();
        self.state.editing.on = true;
        self.emit("editingstarted");
        
        if (!self._loadDataOnMapViewChangeListener){
          self._loadDataOnMapViewChangeListener = MapService.onafter('setMapView',function(){
            if (self.state.editingOn && self.state.editingEnabled){
              self._loadData();
            }
          });
        }
      })
    //}
    /*catch(e) {
      console.log(e);
      this.state.retrievingData = false;
    }*/
  };
  
  this._stopEditing = function(reset){
    // se posso stoppare tutti gli editor...    
    if (this._stopEditor(reset)){
      _.forEach(this._layers,function(layer, layerCode){
        var vector = layer.vector;
        MapService.viewer.removeLayerByName(vector.name);
        layer.vector= null;
        layer.editor= null;
        self._unlockLayer(self.config.layers[layerCode]);
      });
      this._updateEditingState();
      self.state.editing.on = false;
      self.emit("editingstopped");
    }
  };
  
  this._startEditor = function(layer){
    // avvio l'editor 
    if (layer.editor.start()){
      // e registro i listeners
      this._setupEditToolsListeners(layer);
      this._setCurrentEditingLayer(layer);
      return true;
    }
    return false;
  };
  
  this._startEditingTool = function(layer,toolType,options){
    var canStartTool = true;
    if (!layer.editor.isStarted()){
      canStartTool = this._startEditor(layer);
    }
    if(canStartTool && layer.editor.setTool(toolType,options)){
      this._updateEditingState();
      return true;
    }
    return false;
  };
  
  this._stopEditor = function(reset){
    var ret = true;
    var layer = this._getCurrentEditingLayer();
    if (layer) {
      this._clearLayerOl3Listeners(layer);
      ret = layer.editor.stop(reset);
      if (ret){
        this._setCurrentEditingLayer();
      }
    }
    return ret;
  };
  
  this._stopEditingTool = function(){
    var ret = true;
    var layer = this._getCurrentEditingLayer();
    if(layer){
      ret = layer.editor.stopTool();
      if (ret){
        this._updateEditingState();
      }
    }
    return ret;
  };
  
  this._clearLayerOl3Listeners = function(layer){
    _.forEach(layer.ol3ListenersKeys,function(listenerKey){
      ol.Observable.unByKey(listenerKey);
    });
    layer.ol3ListenersKeys = [];
  };
  
  this._trackOl3Listeners = function(layer,listenerKey){
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
    var currentEditingLayerCode = this._getCurrentEditingLayer().layerCode;
    var editor = dirtyEditors[currentEditingLayerCode];
    this._stopEditing(true);
  };
  
  this._getCurrentEditingLayerCode = null;
  
  this._getCurrentEditingToolType = null;
  
  this._setEditinToolRunning = null;
  
  this._updateEditingState = function(){
    var layer = this._getCurrentEditingLayer();
    if (layer){
      this.state.editing.layerCode = layer.layerCode;
      this.state.editing.toolType = layer.editor.getActiveTool().getType();
    }
    else {
      this.state.editing.layerCode = null;
      this.state.editing.toolType = null;
    }
  };
  
  this._getCurrentEditingLayer = function(){
    return this._currentEditingLayer;
  };
  
  this._setCurrentEditingLayer = function(layer){
    if (!layer){
      this._currentEditingLayer = null;
    }
    else {
      this._currentEditingLayer = layer;
    }
  };
  
  this._getOptionsForEditTool = function(layer,toolType){
    var options;
    
    switch (layer.layerCode){
      case this.layerCodes.STRADE:
        if (toolType=='addfeature'){
          options = {
            snap: {
              vectorLayer: this._layers[this.layerCodes.GIUNZIONI].vector
            },
            finishCondition: this._getCheckSnapsCondition(this._stradeSnaps),
            condition: this._getStradaIsSnappedCondition(this._stradeSnaps)
          }
        }
        break;
      default:
        options = null
    }
    return options;
  };
  
  this._setupEditToolsListeners = function(layer){
    switch (layer.layerCode){
      case this.layerCodes.GIUNZIONI:
        this._setupMoveGiunzioniListener(layer);
        break;
      case this.layerCodes.STRADE:
        this._setupDrawStradeConstraints();
    }
    
    this._setupAddFeatureAttributesEditingListeners(layer);
    this._setupEditAttributesListeners(layer);
  };
  
  // apre form attributi per inserimento
  this._setupAddFeatureAttributesEditingListeners = function(layer){
    var self = this;
    layer.editor.onbeforeasync('addFeature',function(feature,next){
      self._openEditorForm('new',feature,layer.layerCode,next)
    });
  };
  
  // apre form attributi per editazione
  this._setupEditAttributesListeners = function(layer){
    var self = this;
    layer.editor.onafter('pickFeature',function(feature){
      self._openEditorForm('old',feature,layer.layerCode)
    });
  };
  
  this._openEditorForm = function(isNew,feature,layerCode,next){
    var editor = self._layers[layerCode].editor;
    var fid = feature.getId();
    var fields = editor.getFieldsWithAttributes(fid);
    
    // nel caso qualcuno, durante la catena di setterListeners, abbia settato un attributo (solo nel caso di un nuovo inserimento)
    // usato ad esempio nell'editing delle strade, dove viene settato in fase di inserimento/modifica il codice dei campi nod_ini e nod_fin
    var pk = self._layers[layerCode].vector.pk;
    if (pk && _.isNull(editor.getField(pk))){
      _.forEach(feature.getProperties(),function(value,attribute){
        var field = editor.getField(attribute,fields);
        if(field){
          field.value = value;
        }
      });
    }
    
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
  
  /* INIZIO MODIFICA TOPOLOGICA DELLE GIUNZIONI */
  
  this._setupMoveGiunzioniListener = function(layer){
    var self = this;
    layer.editor.on('movestart',function(feature){
      // rimuovo eventuali precedenti listeners
      self._clearLayerOl3Listeners(layer);
      self._startMovingGiunzione(feature);
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
    this._trackOl3Listeners(this._layers[this.layerCodes.GIUNZIONI],listenerKey);
  };
  
  /* FINE MODIFICA TOPOLOGICA GIUNZIONI */
  
  /* INIZIO GESTIONE VINCOLO SNAP SU GIUNZIONI DURANTE IL DISEGNO DELLE STRADE */
  
  this._stradeSnaps = new function(){
    var snaps = [];
    this.length = 0;
    
    this.push = function(feature){
      snaps.push(feature);
      this.length += 1;
    };
    
    this.getLast = function(){
      return snaps[snaps.length-1];
    };
    
    this.getFirst = function(){
      return snaps[0];
    };
    
    this.clear = function(){
      snaps.splice(0,snaps.length);
      this.length = 0;
    };
    
    this.getSnaps = function(){
      return snaps;
    };
  };
  
  this._setupDrawStradeConstraints = function(){
    var mapId = MapService.viewer.map.getTargetElement().id;
    $(document).on('keypress',function(e){
      console.log(e.which);
    });
    var self = this;
    var map = MapService.viewer.map;
    var editor = self._layers[this.layerCodes.STRADE].editor;
    this._stradeSnaps.clear();
    editor.onbefore('addFeature',function(feature){
      var snaps = self._stradeSnaps.getSnaps();
      if (snaps.length == 2){
        feature.set('nod_ini',snaps[0].get('cod_gnz'));
        feature.set('nod_fin',snaps[1].get('cod_gnz'));
        self._stradeSnaps.clear();
        return true;
      }
      return false;
    });
  };
  
  this._getCheckSnapsCondition = function(snaps){
    // ad ogni click controllo se ci sono degli snap con le giunzioni
    return function(e){
      if (snaps.length == 2){
        return true;
      }
      GUI.notify.error("L'ultimo vertice deve corrispondere con una giunzione");
      return false;
    }
  };
  
  // ad ogni click controllo se ci sono degli snap con le giunzioni
  this._getStradaIsSnappedCondition = function(snaps){
    var map = MapService.viewer.map;
    
    return function(e){
      snappedFeature = map.forEachFeatureAtPixel(e.pixel,
          function(feature) {
            return feature;
          },self,function(layer){
            return (layer == self._layers[this.layerCodes.GIUNZIONI].vector.getLayer());
          },self);
      
      // se ho già due snap e questo click non è su un'altra giunzione, oppure se ho più di 2 snap, non posso inserire un ulteriore vertice
      if ((snaps.length == 2 && (!snappedFeature || snappedFeature != snaps.getSnaps()[1]))){
        var lastSnapped
        GUI.notify.error("Una strada non può avere vertici intermedi in corrispondenza di giunzioni.<br> Premere <b>CANC</b> per rimuovere l'ultimo vertice.");
        return false;
      }
      
      if (snappedFeature && snaps.length < 2){
        snaps.push(snappedFeature);
      }
      
      // se non ci sono snap, vuol dire che sono ancora al primo click e non ho snappato con la giunzione iniziale
      if (snaps.length == 0){
        GUI.notify.error("Il primo vertice deve corrispondere con una giunzione");
        return false;
      }
      return true;
    }
  };
  
  /* FINE VINCOLO SNAP DELLE STRADE */
  
  this._addToMap = function(){
    var map = MapService.viewer.map;
    var layerCodes = this.getLayerCodes();
    _.forEach(layerCodes,function(layerCode){
      self._layers[layerCode].vector.addToMap(map);
    })
  };
  
  this._setupVectors = function(){
    var deferred = $.Deferred();
    var layerCodes = this.getLayerCodes();
    var layersReady = _.reduce(layerCodes,function(ready,layerCode){
      return !_.isNull(self._layers[layerCode].vector);
    });
    if (!layersReady){
      // eseguo le richieste delle configurazioni e mi tengo le promesse
      var configRequests = _.map(layerCodes,function(layerCode){
        return self._getLayerConfig(self.config.layers[layerCode]);
      });
      // aspetto tutte le promesse
      $.when.apply(this,configRequests)
      .then(function(){
        var args = Array.prototype.slice.call(arguments);
        // mi creo un oggetto avente per chiave il layerCode e per valore un array con i risultati
        // delle richieste di configurazioni nel primo elemento e i dati nel secondo
        var layersResults = _.zipObject(layerCodes,args);
        _.forEach(layersResults,function(layerConfig,layerCode){
          var layerBaseConfig = self.config.layers[layerCode];
          // instanzio il VectorLayer
          var vectorLayer = self._layers[layerCode].vector = self._createVector({
            geometrytype: layerConfig.vector.geometrytype,
            format: layerConfig.vector.format,
            crs: "EPSG:3003",
            id: layerBaseConfig.id,
            name: layerBaseConfig.name,
            pk: layerConfig.pk  
          });
          // ottengo la definizione dei campi
          vectorLayer.setFields(layerConfig.vector.fields);
          
          var relations = layerConfig.vector.relations;
          
          if(relations){
            // per dire a vectorLayer che i dati delle relazioni verranno caricati solo quando richiesti (es. aperture form di editing)
            vectorLayer.lazyRelations = true;
            vectorLayer.setRelations(relations);
          }
          // setto lo stile del layer OL
          vectorLayer.setStyle(self._layers[layerCode].style);
          
          // istanzio l'editor
          var editor = new Editor;
          editor.setVectorLayer(vectorLayer);
          editor.on("dirty",function(dirty){
            self.state.hasEdits = dirty;
          })        
          // e lo metto nella configurazione globale
          self._layers[layerCode].editor = editor;
        })
        self.state.retrievingData = false;
        deferred.resolve();
      })
      .fail(function(){
        self.state.retrievingData = false;
        deferred.reject();
      })
    }
    else{
      deferred.resolve();
    }
    return deferred.promise();
  };
  
  this._loadData = function(){
    var self = this;
    var layerCodes = this.getLayerCodes();
    self.state.retrievingData = true;
    return this._setupVectors()
    .then(function(){
      // eseguo le richieste de dati e mi tengo le promesse
      var dataRequests = _.map(layerCodes,function(layerCode){
        return self._getLayerData(self.config.layers[layerCode]);
      }); 
      
      return $.when.apply(this,dataRequests)
      .then(function(){
        var args = Array.prototype.slice.call(arguments);
        // mi creo un oggetto avente per chiave il layerCode e per valore un array con i risultati
        // delle richieste di configurazioni nel primo elemento e i dati nel secondo
        var layersResults = _.zipObject(layerCodes,args);
        _.forEach(layersResults,function(layerData,layerCode){
          var iternetLayer = self._layers[layerCode];
          self._setVectorData(iternetLayer.vector,layerData.vector.data);
          if (layerData.featurelocks){
            iternetLayer.editor.setFeatureLocks(layerData.featurelocks);
          }
        });
      });
    })
    .always(function(){
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
