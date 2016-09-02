var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolvedValue = require('core/utils/utils').resolve;
var rejectedValue = require('core/utils/utils').reject;
var VectorLayer = require('core/map/layer/vectorlayer');
var LoaderLayerService = require('./loaderlayerservice');

function VectorLoaderLayer() {

    var self = this;
    this._layer = {};
    this._type = 'vector';
    this._layerCodes = [];
    this._baseUrl = '';
    this._mapService = null;
    this._pluginState = {};
    this._loadedExtent = null;

    base(this);
    this.init = function(options) {

        this._layers = options.layers || {};
        this._baseUrl = options.baseurl || '';
        this._mapService = options.mapService || null;
        this._pluginState = options.state || {};
        _.forEach(this._layers, function(layer, LayerCode){
            self._layerCodes.push(LayerCode);
        });
    }
}

inherit(VectorLoaderLayer, LoaderLayerService);

module.exports = new VectorLoaderLayer;

var proto = VectorLoaderLayer.prototype;

proto.setupAndLoadAllLayersData = function() {

    var self = this;
    var deferred = $.Deferred();
    var layersReady = _.reduce(this._layers, function(ready,layer) {
        return !_.isNull(layer.vector);
    });
    console.log(layersReady);
    //nel caso in cui nessun vector layer è stato caricato
    // quindi la proprietà vector è null
    if (!layersReady){
        // eseguo le richieste delle configurazioni e mi tengo le promesse
        var vectorLayersSetup = _.map(this._layerCodes, function(layerCode){
            return self.setupVectorLayer(self._layers[layerCode]);
        });
        // aspetto tutte le promesse
        $.when.apply(this, vectorLayersSetup)
            .then(function() {
                self._pluginState.retrievingData = true;
                var vectorLayers = Array.prototype.slice.call(arguments);
                var vectorLayersForCode = _.zipObject(self._layerCodes, vectorLayers);
                _.forEach(vectorLayersForCode, function(vectorLayer,layerCode) {
                    self._layers[layerCode].vector = vectorLayer;
                    var editor = new self._layers[layerCode].editorClass(self._mapService);
                    editor.setVectorLayer(vectorLayer);
                    editor.on("dirty",function(dirty){
                        self._pluginState.hasEdits = dirty;
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
                        self._pluginState.retrievingData = false;
                    })
            })
            .fail(function(){
                deferred.reject();
            })
    } else {
        this.loadAllVectorsData()
            .then(function(){
                deferred.resolve();
            })
            .fail(function(){
                deferred.reject();
            })
            .always(function(){
                self._pluginState.retrievingData = false;
            })
    }
    return deferred.promise();
};

proto.loadAllVectorsData = function() {

    var self = this;
    // verifico che il BBOX attuale non sia stato già  caricato
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
    var vectorDataRequests = _.map(self._layers, function(Layer) {
        return self.loadVectorData(Layer.vector, bbox);
    });

    $.when.apply(this, vectorDataRequests)
        .then(function(){
            var vectorsDataResponse = Array.prototype.slice.call(arguments);
            var vectorDataResponseForIternetCode = _.zipObject(self._layerCodes,vectorsDataResponse);
            _.forEach(vectorDataResponseForIternetCode, function(vectorDataResponse,layerCode) {
                console.log(vectorDataResponse);
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
    var self = this;
    var deferred = $.Deferred();
    // eseguo le richieste delle configurazioni e mi tengo le promesse
    this.getVectorLayerConfig(layerConfig.name)
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
        })
    return deferred.promise();
};

proto.loadVectorData = function(vectorLayer, bbox) {
    var self = this;
    // eseguo le richieste de dati e mi tengo le promesse
    return self.getVectorLayerData(vectorLayer,bbox)
        .then(function(vectorDataResponse){
            vectorLayer.setData(vectorDataResponse.vector.data);
            return vectorDataResponse;
        });
};

// ottiene la configurazione del vettoriale
// (qui richiesto solo per la definizione degli input)
proto.getVectorLayerConfig = function(layerName) {

    var d = $.Deferred();
    $.get(this._baseUrl+layerName+"/?config")
        .done(function(data){
            d.resolve(data);
        })
        .fail(function(){
            d.reject();
        });
    return d.promise();
};

// ottiene il vettoriale in modalità  editing
proto.getVectorLayerData = function(vectorLayer, bbox) {

    var d = $.Deferred();
    $.get(this._baseUrl+vectorLayer.name+"/?editing&in_bbox="+bbox[0]+","+bbox[1]+","+bbox[2]+","+bbox[3])
        .done(function(data){
            d.resolve(data);
        })
        .fail(function(){
            d.reject();
        })
    return d.promise();
};
//crea un nuovo vector layer
proto.createVectorLayer = function(options) {

    var vector = new VectorLayer(options);
    return vector;
};