var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolvedValue = require('core/utils/utils').resolve;
var rejectedValue = require('core/utils/utils').reject;
var VectorLayer = require('core/map/layer/vectorlayer');
var LoaderLayer = require('./loaderlayer');

function VectorLoaderLayer() {

  this._layer = {};
  this._type = 'vector';
  this._layerCodes = [];
  this._baseUrl = '';
  this._mapService = null;
  this._loadedExtent = null;
  this._editingMode = false;

  base(this);

  //setto le proprià che mi interessano
  this.init = function(options) {
    //i layers provenienti dal plugin
    this._layers = options.layers || {};
    // il base url per poter fare richieste al server
    this._baseUrl = options.baseurl || '';
    // il map service per ineragire con la mappa
    // recuperando il bbox del layer vettoriale
    this._mapService = options.mapService || null;
    // i codice dei layers per poter recuperare le informazioni
    // dei layers passati dal plugin
    this._layerCodes = _.keys(this._layers);
  };
}

inherit(VectorLoaderLayer, LoaderLayer);

var proto = VectorLoaderLayer.prototype;
// funzione principale, starting point, chiamata dal plugin per
// il recupero dei vettoriali (chiamata verso il server)
proto.loadLayers = function(mode) {

  var self = this;
  this._setMode(mode);
  var deferred = $.Deferred();
  // tiene conto dei codici dei layer ch enon sono stati caricati come vector
  var noVectorlayerCodes = [];
  //verifica se sono stati caricati i vettoriali dei layer
  // attraverso la proprietà vector del layer passato dal plugin
  _.forEach(this._layers, function(layer, layerCode) {
      if (_.isNull(layer.vector)) {
          noVectorlayerCodes.push(layerCode);
      }
  });
  // eseguo le richieste delle configurazioni e mi tengo le promesse
  var vectorLayersSetup = _.map(noVectorlayerCodes, function(layerCode) {
          return self._setupVectorLayer(layerCode);
  });
  self.emit('loadingvectorlayersstart');
  // aspetto tutte le promesse del setup vector
  $.when.apply(this, vectorLayersSetup)
    .then(function() {
      var vectorLayersCodes = Array.prototype.slice.call(arguments);
      self.emit('loadingvectolayersdatastart');
      self.loadAllVectorsData(vectorLayersCodes)
        .then(function(layerCodes) {
          deferred.resolve(vectorLayersCodes);
        })
        .fail(function() {
          deferred.reject();
        })
        .always(function() {
          // questa mi server per segnalare che il loadind dei dati è finito
          self.emit('loadingvectorlayersend');
          self.emit('loadingvectolayersdataend');
        })
      })
    .fail(function() {
        self.emit('loadingvectorlayersend');
        deferred.reject();
    })

  return deferred.promise();
};

//funzione che permette di ottenere tutti i dati relativi ai layer vettoriali caricati
//prima si è ottenuta la coinfigurazione, ora si ottengono i dati veri e propri
proto.loadAllVectorsData = function(layerCodes) {

    var self = this;
    var deferred = $.Deferred();
    var layers = this._layers;
    // verifico che il BBOX attuale non sia stato già  caricato
    var bbox = this._mapService.state.bbox;
    var loadedExtent = this._loadedExtent;
    if (loadedExtent && ol.extent.containsExtent(loadedExtent, bbox)) {
        return resolvedValue();
    }
    if (!loadedExtent){
        this._loadedExtent = bbox;
    } else {
        this._loadedExtent = ol.extent.extend(loadedExtent, bbox);
    }
    if (layerCodes) {
        layers = [];
        _.forEach(layerCodes, function(layerCode) {
            layers.push(self._layers[layerCode]);
        });
    }
    //per ogni layer del plugin che non ha il layer vado a caricare i dati del layer vettoriale
    var vectorDataRequests = _.map(layers, function(Layer) {
        return self._loadVectorData(Layer.vector, bbox);
    });
    $.when.apply(this, vectorDataRequests)
        .then(function() {
            deferred.resolve(layerCodes);
        })
        .fail(function(){
            deferred.reject();
        });

    return deferred.promise();
};

proto._setMode = function(mode) {
  if (mode == 'w') {
    this._editingMode = true;
  }
};

// funzione che dato la configurazione del layer fornito dal plugin (style, editor, vctor etc..)
// esegue richieste al server al fine di ottenere configurazione vettoriale del layer
proto._setupVectorLayer = function(layerCode) {

    var self = this;
    var layerConfig = this._layers[layerCode];
    var deferred = $.Deferred();
    // eseguo le richieste delle configurazioni
    this._getVectorLayerConfig(layerConfig.name)
        .then(function(vectorConfigResponse) {
            var vectorConfig = vectorConfigResponse.vector;
            // una volta ottenuta dal server la configurazione vettoriale,
            // provvedo alla creazione del layer vettoriale
            var vectorLayer = self._createVectorLayer({
                geometrytype: vectorConfig.geometrytype,
                format: vectorConfig.format,
                crs: "EPSG:3003",
                id: layerConfig.id,
                name: layerConfig.name,
                pk: vectorConfig.pk,
                editing: self._editingMode
            });
            // setto i campi del layer
            vectorLayer.setFields(vectorConfig.fields);
            // questo è la proprietà della configurazione del config layer
            // che specifica se esistono relazioni con altri layer
            // sono array di oggetti che specificano una serie di
            // informazioni su come i layer sono relazionati (nome della relazione == nome layer)
            // foreign key etc ..
            var relations = vectorConfig.relations;
            if(relations){
                // per dire a vectorLayer che i dati
                // delle relazioni verranno caricati solo quando
                // richiesti (es. aperture form di editing)
                vectorLayer.lazyRelations = true;
                //vado a settare le relazioni del vector layer
                vectorLayer.setRelations(relations);
            }
            // setto lo stile del layer OL
            if (layerConfig.style) {
                vectorLayer.setStyle(layerConfig.style);
            }
            layerConfig.vector = vectorLayer;
            deferred.resolve(layerCode);
        })
        .fail(function(){
            deferred.reject();
        });
    return deferred.promise();
};
//in base all bbox e la layer chiedo al server di restituirmi il vettoriale (geojson) del layer
proto._loadVectorData = function(vectorLayer, bbox) {
    var self = this;
    // eseguo le richieste deI dati al server al fine di ottenere il geojson,
    // vettoriale, del layer richiesto
    return self._getVectorLayerData(vectorLayer, bbox)
        .then(function(vectorDataResponse) {
            // setto i dati vettoriali del layer vettoriale
            if (self._editingMode && vectorDataResponse.featurelocks){
              vectorLayer.setFeatureLocks(vectorDataResponse.featurelocks);
            }
            vectorLayer.setData(vectorDataResponse.vector.data);
          if (self._)
            return vectorDataResponse;
        });
};

// ottiene la configurazione del vettoriale
// (qui richiesto solo per la definizione degli input)
proto._getVectorLayerConfig = function(layerName) {

    var d = $.Deferred();
    $.get(this._baseUrl+layerName+"/?config")
        .done(function(data) {
            d.resolve(data);
        })
        .fail(function(){
            d.reject();
        });
    return d.promise();
};

// ottiene il vettoriale in modalità  editing
proto._getVectorLayerData = function(vectorLayer, bbox) {
    var d = $.Deferred();
    $.get(this._baseUrl+vectorLayer.name+"/?editing&in_bbox="+bbox[0]+","+bbox[1]+","+bbox[2]+","+bbox[3])
        .done(function(data) {
            d.resolve(data);
        })
        .fail(function(){
            d.reject();
        });
    return d.promise();
};
// funzione per creare il layer vettoriale
proto._createVectorLayer = function(options){

    var vector = new VectorLayer(options);
    return vector;
};
//funzione chiamata dal plugin quando si vuole fare un cleanUp dei layers
// !!! -- DA RIVEDERE -- !!!
proto.cleanUpLayers = function() {
    this._loadedExtent = null;
};

module.exports = VectorLoaderLayer;