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

    base(this);
    this.init = function(options) {
        this._layers = options.layers || {};
        this._baseUrl = options.baseurl || '';
        this._mapService = options.mapService || null;
        this._layerCodes = _.keys(this._layers);
    };
}

inherit(VectorLoaderLayer, LoaderLayer);

var proto = VectorLoaderLayer.prototype;

proto.loadLayers = function() {

    var self = this;
    var deferred = $.Deferred();
    //verifica se sono stati caricati i vettoriali dei layer
    //È NECESSARIO FORNIRE UN PRIMO VALORE ALTRIMENTI
    // PRENDE IL PRIMO VALORE DELLA COLLEZIONE
    var layersReady = _.reduce(this._layers, function(ready, layer) {
        return ready && !_.isNull(layer.vector);
    }, true);
    //nel caso in cui nessun vector layer è stato caricato
    // quindi la proprietà vector è null
    if (!layersReady) {
        // eseguo le richieste delle configurazioni e mi tengo le promesse
        var vectorLayersSetup = _.map(this._layerCodes, function(layerCode) {
            return self._setupVectorLayer(self._layers[layerCode]);
        });
        // aspetto tutte le promesse del setup vector
        $.when.apply(this, vectorLayersSetup)
            .then(function() {
                var vectorLayers = Array.prototype.slice.call(arguments);
                var vectorLayers = _.zipObject(self._layerCodes, vectorLayers);
                self.emit('retriewdata', true, vectorLayers);
                self.loadAllVectorsData()
                    .then(function() {
                        deferred.resolve();
                    })
                    .fail(function() {
                        deferred.reject();
                    })
                    .always(function() {
                        self.emit('retriewdata', false);
                    });
            })
            .fail(function(){
                deferred.reject();
            });
    } else {
        this.loadAllVectorsData()
            .then(function() {
                deferred.resolve();
            })
            .fail(function() {
                deferred.reject();
            })
            .always(function() {
                self.emit('retriewdata', false);
            });
    }
    return deferred.promise();
};

//funzione che permette di ottenere tutti i dati relativi ai layer vettoriali caricati
//prima si è ottenuta la coinfigurazione, ora si ottengono i dati veri e propri
proto.loadAllVectorsData = function() {

    var self = this;
    var deferred = $.Deferred();
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
    //per ogni layer passato dal plugin vado a caricare i dati del layer vettoriale
    var vectorDataRequests = _.map(self._layers, function(Layer) {
        return self._loadVectorData(Layer.vector, bbox);
    });

    $.when.apply(this, vectorDataRequests)
        .then(function() {
            var vectorsDataResponse = Array.prototype.slice.call(arguments);
            var vectorDataResponseForCode = _.zipObject(self._layerCodes, vectorsDataResponse);
            _.forEach(vectorDataResponseForCode, function(vectorDataResponse, layerCode) {
                //nel caso ci sono vengono restituiti features locked (è un array di feature locked)
                if (vectorDataResponse.featurelocks) {
                    self.emit('featurelocks', layerCode, vectorDataResponse.featurelocks);
                }
            });
            deferred.resolve();
        })
        .fail(function(){
            deferred.reject();
        });

    return deferred.promise();
};

proto._setupVectorLayer = function(layerConfig) {

    var self = this;
    var deferred = $.Deferred();
    // eseguo le richieste delle configurazioni e mi tengo le promesse
    this._getVectorLayerConfig(layerConfig.name)
        .then(function(vectorConfigResponse) {
            var vectorConfig = vectorConfigResponse.vector;
            var vectorLayer = self._createVectorLayer({
                geometrytype: vectorConfig.geometrytype,
                format: vectorConfig.format,
                crs: "EPSG:3003",
                id: layerConfig.id,
                name: layerConfig.name,
                pk: vectorConfig.pk
            });
            // setto i campi del layer
            vectorLayer.setFields(vectorConfig.fields);
            var relations = vectorConfig.relations;
            if(relations){
                // per dire a vectorLayer che i dati
                // delle relazioni verranno caricati solo quando
                // richiesti (es. aperture form di editing)
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
        });
    return deferred.promise();
};
//in base all bbox e la layer chiedo al server di restituirmi il vettoriale (geojson) del layer
proto._loadVectorData = function(vectorLayer, bbox) {
    var self = this;
    // eseguo le richieste de dati e mi tengo le promesse
    return self._getVectorLayerData(vectorLayer, bbox)
        .then(function(vectorDataResponse) {
            vectorLayer.setData(vectorDataResponse.vector.data);
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

proto._createVectorLayer = function(options){

    var vector = new VectorLayer(options);
    return vector;
};

proto.cleanUpLayers = function() {
    this._loadedExtent = null;
};

module.exports = VectorLoaderLayer;